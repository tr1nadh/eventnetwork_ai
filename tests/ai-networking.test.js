import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createServer } from 'vite';

let vite;
let recommendations;
let listAttendees;
let meetingPrep;
const calls = [];
let charges = 0;
let refunds = 0;
let providerResult;
const viewer = { display_name: 'Viewer', what_i_do: 'Build tools', about_me: 'Viewer biography', looking_for: 'Design partners', looking_for_embed: [1, 0] };
const candidates = Array.from({ length: 5 }, (_, i) => ({
  user_id: String(i), display_name: 'Member ' + i, what_i_do: 'Design', about_me: 'Research', looking_for: 'Tools', about_user_embed: [1, 0]
}));

before(async () => {
  const mocks = {
    '$lib/demo': 'export const demoEvent = {}; export const demoAttendees = []',
    '$lib/network-profile': 'export * from "/src/lib/network-profile.js"',
    '$lib/supabase/admin': 'export const createSupabaseAdminClient = () => globalThis.matchTest.admin',
    '$lib/llm/fireworks': 'export const createChatCompletion = (...args) => globalThis.matchTest.complete(...args)',
    '$env/static/private': 'export const FIREWORKS_MODEL = "fixture"',
    '$lib/server/ai-credits': 'export const checkAiQuota = () => globalThis.matchTest.charge(); export const refundAiCredit = () => globalThis.matchTest.refund()'
  };
  globalThis.matchTest = {
    complete(request) { calls.push(request); return { choices: [{ message: { content: providerResult } }] }; },
    charge() { charges++; return { allowed: true }; },
    refund() { refunds++; }
  };
  vite = await createServer({ configFile: false, server: { middlewareMode: true, ws: false },
    optimizeDeps: { noDiscovery: true, include: [] }, plugins: [{
    name: 'local-ai-fixtures',
    resolveId(id) { if (id in mocks) return '\0' + id; },
    load(id) { return mocks[id.slice(1)]; }
  }] });
  recommendations = (await vite.ssrLoadModule('/src/routes/api/recommendations/+server.js')).GET;
  listAttendees = (await vite.ssrLoadModule('/src/routes/api/attendees/+server.js')).GET;
  meetingPrep = (await vite.ssrLoadModule('/src/routes/api/meeting-prep/+server.js')).GET;
});
after(async () => { await vite?.close(); delete globalThis.matchTest; });

async function runMatches(rows, explanations) {
  calls.length = charges = refunds = 0;
  providerResult = JSON.stringify({ explanations });
  const saved = [];
  const db = {
    select() { return this; }, eq() { return this; }, neq() { return this; },
    maybeSingle() { return { data: viewer }; }, not() { return { data: rows }; },
    upsert(row) { saved.push(row); return {}; }
  };
  const response = await recommendations({ url: new URL('http://local/?event_id=e'), locals: { user: { id: 'viewer' }, supabase: { from(table) {
    if (table === 'event_participants') return { select: () => ({ eq: () => ({ eq: () => ({ data: candidates }) }) }) };
    if (table === 'events') return { select: () => ({ eq: () => ({ maybeSingle: () => ({ data: { created_by: 'host' } }) }) }) };
    return db;
  } } } });
  const text = await response.text();
  return { creditUsed: response.headers.get("X-AI-Credit-Used"), matches: text.trim().split('\n').filter(Boolean).map(line => JSON.parse(line)), saved };
}

test('five ranked matches share one model call and retain their own explanations', async () => {
  const explanations = Object.fromEntries(candidates.map((_, i) => [i, 'You share interest ' + i + '.']));
  const { matches, saved, creditUsed } = await runMatches(candidates, explanations);
  if (process.env.MEASURE_MATCH_INPUT) console.log("Model input characters:", calls.flatMap(call => call.messages).reduce((total, m) => total + m.content.length, 0));
  assert.equal(calls.length, 1);
  assert.equal(calls[0].messages.map(m => m.content).join('').split(viewer.about_me).length - 1, 1);
  assert.equal(charges, 1);
  assert.equal(refunds, 0);
  assert.equal(creditUsed, "1");
  assert.equal(saved.length, 5);
  assert.deepEqual(matches.map(m => m.explanation), Object.values(explanations));
});

test('incomplete profiles, unregistered people and unrelated profiles stay out of matches', async () => {
  const { matches } = await runMatches([
    candidates[0], { ...candidates[1], looking_for: '[" "]' },
    { ...candidates[2], user_id: 'unregistered' }, { ...candidates[3], about_user_embed: [-1, 0] }
  ], {});
  assert.deepEqual(matches.map(match => match.user_id), ['0']);
});

test('All requires all three answers, while the registration roster keeps every attendee', async () => {
  const profiles = [
    { ...viewer, user_id: 'complete' }, { ...viewer, user_id: 'host' },
    { ...viewer, user_id: 'blank', about_me: ' ' }, { ...viewer, user_id: 'empty', looking_for: '[]' }
  ];
  const ids = [...profiles.map(p => p.user_id), 'no-profile'];
  const rows = {
    events: { id: 'event', created_by: 'host', is_public: true },
    event_participants: ids.map(user_id => ({ user_id, status: 'joined' })),
    network_profiles: profiles, users: []
  };
  globalThis.matchTest.admin = { from(table) {
    return { data: rows[table], select() { return this; }, eq() { return this; },
      in() { return this; }, maybeSingle() { return this; } };
  } };
  async function attendeeIds(query) {
    const response = await listAttendees({ url: new URL('http://local/?event_id=event' + query), locals: {} });
    return (await response.json()).attendees.map(person => person.user_id).sort();
  }
  assert.deepEqual(await attendeeIds('&network_profiles_only=true'), ['complete']);
  assert.deepEqual(await attendeeIds(''), ids.sort());
});

test('host roster recovers auth emails and identifies saved networking profiles', async () => {
  const rows = {
    events: { id: 'event', created_by: 'host', is_public: true }, connections: [], users: [],
    event_participants: [{ user_id: 'member', status: 'joined' }, { user_id: 'pending', status: 'requested' }],
    network_profiles: [{ ...viewer, user_id: 'member' }]
  };
  let batchLookups = 0;
  globalThis.matchTest.admin = {
    rpc: async () => { batchLookups++; return { error: { code: 'PGRST202' } }; },
    auth: { admin: { getUserById: async id => ({ data: { user: { email: id + '@example.test' } } }) } },
    from(table) {
      return { data: rows[table], select(fields) {
        if (table === 'network_profiles' && fields.includes('is_dummy')) {
          this.error = { code: '42703', message: 'column network_profiles.is_dummy does not exist' };
        }
        return this;
      }, eq() { return this; },
        in() { return this; }, or() { return this; }, maybeSingle() { return this; } };
    }
  };
  const url = new URL('http://local/?event_id=event&status=all');
  const host = await (await listAttendees({ url, locals: { user: { id: 'host' } } })).json();
  const member = host.attendees.find(person => person.user_id === 'member');
  assert.equal(member.email, 'member@example.test');
  assert.equal(member.has_network_profile, true);
  const pending = host.attendees.find(person => person.user_id === 'pending');
  assert.equal(pending.email, 'pending@example.test');
  assert.equal(pending.has_network_profile, false);
  const joined = await (await listAttendees({ url: new URL('http://local/?event_id=event&status=joined'), locals: { user: { id: 'host' } } })).json();
  assert.equal(joined.attendees.find(person => person.user_id === 'member').email, 'member@example.test');
  assert.equal(batchLookups, 1);
  const guest = await (await listAttendees({ url, locals: {} })).json();
  assert.ok(guest.attendees.every(person => !('email' in person)));
});

test('a missing explanation falls back only for that attendee', async () => {
  const { matches } = await runMatches(candidates.slice(0, 2), { 1: 'You both design tools.' });
  assert.equal(matches[1].explanation, 'You both design tools.');
  assert.match(matches[0].explanation, /Design/);
  assert.equal(refunds, 0);
});

test('all fallback results refund the single charge', async () => {
  const { matches, creditUsed } = await runMatches(candidates, {});
  assert.equal(creditUsed, "0");
  assert.equal(matches.length, 5);
  assert.equal(refunds, 1);
});

test('meeting prep with an incomplete profile pair never reserves a credit', async () => {
  charges = 0;
  const db = { select() { return this; }, eq() { return this; }, single() { return { data: { sender_user_id: 'viewer', receiver_user_id: 'other', status: 'accepted' } }; }, in() { return { data: [] }; } };
  await assert.rejects(() => meetingPrep({ url: new URL('http://local/?connection_id=c'), locals: { user: { id: 'viewer' }, supabase: { from: () => db } } }), err => err.status === 404);
  assert.equal(charges, 0);
});

test('meeting prep refunds an unusable but valid JSON response', async () => {
  providerResult = '{}';
  charges = refunds = 0;
  const db = { select() { return this; }, eq() { return this; }, single() { return { data: { sender_user_id: 'viewer', receiver_user_id: 'other', status: 'accepted' } }; }, in() { return { data: [{ user_id: 'viewer' }, { user_id: 'other' }] }; } };
  await assert.rejects(() => meetingPrep({ url: new URL('http://local/?connection_id=c'), locals: { user: { id: 'viewer' }, supabase: { from: () => db } } }), err => err.status === 500);
  assert.equal(charges, 1);
  assert.equal(refunds, 1);
});
