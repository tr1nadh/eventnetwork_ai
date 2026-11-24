import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, before, test } from 'node:test';
import { runInNewContext } from 'node:vm';
import { parse } from 'svelte/compiler';
import { createServer } from 'vite';
import { requireEventReadAccess } from '../src/lib/server/event-access.js';
import { listEventsFromTables } from '../src/lib/server/event-list-fallback.js';

let vite;
let createEvent;
let updateEvent;
let loadEvent;
let listEvents;
let saveProfile;
let admin;
let generateEmbeddings;
let charge;
let refund;

before(async () => {
  const fixtures = {
    '$lib/supabase/admin': 'export const createSupabaseAdminClient = () => globalThis.appFixtures.admin()',
    '$lib/embeddings': 'export const generateEmbeddings = (...args) => globalThis.appFixtures.generateEmbeddings(...args)',
    '$lib/server/ai-credits': 'export const checkAiQuota = (...args) => globalThis.appFixtures.charge(...args); export const refundAiCredit = (...args) => globalThis.appFixtures.refund(...args)'
  };
  globalThis.appFixtures = {
    admin: () => admin,
    generateEmbeddings: (...args) => generateEmbeddings(...args),
    charge: (...args) => charge(...args),
    refund: (...args) => refund(...args)
  };
  vite = await createServer({
    configFile: false,
    server: { middlewareMode: true, ws: false },
    optimizeDeps: { noDiscovery: true, include: [] },
    plugins: [{
      name: 'app-regression-fixtures',
      resolveId(id, importer) {
        if (id in fixtures) return '\0' + id;
        if (id.startsWith('$lib/')) return this.resolve('/src/lib/' + id.slice(5), importer);
      },
      load(id) { if (id.startsWith('\0')) return fixtures[id.slice(1)]; }
    }]
  });
  createEvent = (await vite.ssrLoadModule('/src/routes/api/events/+server.js')).POST;
  updateEvent = (await vite.ssrLoadModule('/src/routes/api/events/[id]/+server.js')).PUT;
  loadEvent = (await vite.ssrLoadModule('/src/routes/event/[slug]/+page.server.js')).load;
  listEvents = (await vite.ssrLoadModule('/src/lib/server/event-list.js')).listEvents;
  saveProfile = (await vite.ssrLoadModule('/src/routes/api/network_profiles/+server.js')).POST;
});

after(async () => {
  await vite?.close();
  delete globalThis.appFixtures;
});

const user = { id: 'organizer' };
const demoSlug = 'hacknight-delhi-2026';
function jsonRequest(body) {
  return new Request('https://example.test', { method: 'POST', body: JSON.stringify(body) });
}

test('creating or renaming an event to the reserved demo slug is rejected', async () => {
  admin = { from() {
    return {
      select() { return this; },
      eq() { return this; },
      neq() { return this; },
      insert() { return this; },
      update() { return this; },
      maybeSingle() { return { data: null }; },
      single() { return { data: { created_by: user.id } }; }
    };
  } };
  const body = {
    name: 'Real event', id: demoSlug, slug: demoSlug, max_attendees: 50,
    start_time: '2099-01-01T10:00:00Z', end_time: '2099-01-01T11:00:00Z'
  };
  await assert.rejects(createEvent({ request: jsonRequest(body), locals: { user } }), { status: 409 });
  await assert.rejects(updateEvent({ request: jsonRequest(body), params: { id: 'event' }, locals: { user } }), { status: 409 });
});

test('stored events take precedence over the demo so legacy organizers can recover them', async () => {
  const event = { id: 'real', name: 'Real event', slug: demoSlug, created_by: user.id, is_public: false };
  admin = { from(table) {
    return {
      select() { return this; },
      eq() { return this; },
      order() { return this; },
      data: [],
      maybeSingle() { return { data: table === 'events' ? event : null }; }
    };
  } };
  const result = await loadEvent({ params: { slug: demoSlug }, locals: { user } });
  assert.equal(result.event.id, 'real');
  assert.equal(result.isOrganizer, true);
});

test('event access preserves public viewing, private hosting, and approved membership', async () => {
  const privateEvent = { id: 'event', created_by: 'host', is_public: false };
  const db = { from() {
    return { select() { return this; }, eq() { return this; },
      maybeSingle() { return { data: { status: 'joined' } }; } };
  } };
  await requireEventReadAccess(null, { ...privateEvent, is_public: true });
  await requireEventReadAccess(null, privateEvent, 'host');
  assert.equal(await requireEventReadAccess(db, privateEvent, 'member'), 'joined');
});

test('Discover queries the full local day across a daylight saving change', async () => {
  let args;
  admin = { rpc: async (name, request) => {
    args = request;
    return { data: { events: [], total: 0 } };
  } };
  const filters = new URLSearchParams('filter=discover&date=2026-11-01&tz=America/New_York');
  await listEvents(user, filters, { includeImages: false });
  assert.equal(args.period_start, '2026-11-01T04:00:00.000Z');
  assert.equal(args.period_end, '2026-11-02T05:00:00.000Z');
  assert.equal(args.viewer_time_zone, 'America/New_York');
});

test('the Discover fallback puts an early-morning event on its local calendar day', async () => {
  const event = { id: 'event', start_time: '2026-11-24T19:00:00Z', end_time: '2026-11-24T20:00:00Z' };
  const db = { from(table) {
    return {
      select() { return this; }, order() { return this; }, eq() { return this; },
      range() { return table === 'events' ? { data: [event], count: 1 } : { data: [], count: 0 }; }
    };
  } };
  const result = await listEventsFromTables(db, {
    viewer: user.id, list_filter: 'discover', viewer_time_zone: 'Asia/Kolkata', page_number: 1, page_size: 9
  });
  assert.deepEqual(result.eventDates, ['2026-11-25']);
});

test('one remaining credit pays for both profile embeddings and the saved profile', async () => {
  let remaining = 1;
  charge = async () => remaining-- > 0 ? { allowed: true } : { allowed: false };
  refund = async () => { remaining++; };
  generateEmbeddings = async texts => {
    assert.equal(texts.length, 2);
    return [[1, 0], [0, 1]];
  };
  const response = await postProfile(row => ({ data: [row] }));
  const { profile } = await response.json();
  assert.equal(response.status, 200);
  assert.equal(remaining, 0);
  assert.deepEqual(profile.about_user_embed, [1, 0]);
  assert.deepEqual(profile.looking_for_embed, [0, 1]);
});

test('a storage failure refunds the profile save credit', async () => {
  let remaining = 1;
  charge = async () => remaining-- > 0 ? { allowed: true } : { allowed: false };
  refund = async () => { remaining++; };
  generateEmbeddings = async () => [[1, 0], [0, 1]];
  let balanceDuringWrite;
  const response = await postProfile(() => {
    balanceDuringWrite = remaining;
    return { error: { message: 'fixture storage error' } };
  });
  assert.equal(response.status, 500);
  assert.equal(balanceDuringWrite, 0);
  assert.equal(remaining, 1);
});

function postProfile(write) {
  return saveProfile({
    request: jsonRequest({ event_id: 'event', profile: {
      whatTheyDo: 'Build accessible websites', whoTheyWant: 'Meet other frontend developers',
      expectations: 'I enjoy working on practical projects'
    } }),
    locals: { user, supabase: { from: () => ({ upsert: row => ({ select: () => write(row) }) }) } }
  });
}

function componentFunction(file, names, scope) {
  const source = readFileSync(new URL('../src/lib/components/' + file, import.meta.url), 'utf8');
  const functions = parse(source, { modern: true }).instance.content.body
    .filter(node => node.type === 'FunctionDeclaration' && names.includes(node.id.name))
    .map(node => source.slice(node.start, node.end));
  return runInNewContext(functions.join('\n') + '\n' + names[0], scope);
}

for (const file of ['connection-chat-window.svelte', 'connection-chat-modal.svelte']) {
  test(`${file} stores a completed send in its original conversation`, async () => {
    let respond;
    const saved = [];
    const scope = {
      connection: { id: 'a' }, isAcceptedConnection: true, loadVersion: 1,
      draftMessage: 'First message', sendingMessage: false, loadError: '',
      fetch: () => new Promise(resolve => { respond = resolve; }),
      appendConnectionMessage: (id, message) => saved.push([id, message.id]),
      queueScroll: async () => {}
    };
    const send = componentFunction(file, ['sendMessage'], scope);
    const pending = send();
    scope.connection = { id: 'b' };
    scope.loadVersion++;
    scope.draftMessage = 'Another draft';
    scope.sendingMessage = true;
    respond(Response.json({ message: { id: 'message', connection_id: 'a' } }));
    await pending;
    assert.deepEqual(saved, [['a', 'message']]);
    assert.equal(scope.draftMessage, 'Another draft');
    assert.equal(scope.sendingMessage, true);
  });
}

test('saving zone geometry keeps a keyboard-edited zone within the map', () => {
  const scope = {
    zones: [{ id: 'room', x: 1, y: 1, w: 1, h: 1 }], editingZoneId: 'room',
    editForm: { x: 4, y: 2, w: 6, h: 6 }, gridCols: 6, gridRows: 4, zoneEditor: null
  };
  componentFunction('venue-map.svelte', ['saveZone'], scope)();
  assert.deepEqual({ ...scope.zones[0] }, { id: 'room', x: 4, y: 2, w: 3, h: 3 });
});

test('joining while the event page is open starts exactly one live connection subscription', () => {
  const source = readFileSync(new URL('../src/routes/event/[slug]/+page.svelte', import.meta.url), 'utf8');
  const script = parse(source, { modern: true }).instance.content.body;
  const subscribe = script.find(node => node.type === 'FunctionDeclaration' && node.id.name === 'syncEventConnections');
  const update = script.find(node => node.type === 'LabeledStatement'
    && source.slice(node.start, node.end).includes('syncEventConnections('));
  const activeFilters = new Map();
  const scope = {
    eventMounted: true,
    data: { event: { id: 'event-a' }, user, isParticipant: false },
    subscribedEventId: undefined, subscribedUserId: undefined, connectionScopeVersion: 0,
    realtimeChannel: null, connectionsStore: { set() {} }, connectionsHasMore: false,
    loadingConnections: false, loadingMoreConnections: false, fetchAllConnections() {},
    supabase: {
      channel() {
        return {
          on(event, options) { activeFilters.set(this, options.filter); return this; },
          subscribe() { return this; }
        };
      },
      removeChannel(channel) { activeFilters.delete(channel); }
    }
  };
  const sync = runInNewContext(
    source.slice(subscribe.start, subscribe.end) + '\n() => {' + source.slice(update.body.start, update.body.end) + '}', scope
  );
  sync();
  assert.equal(activeFilters.size, 0);
  scope.data = { ...scope.data, isParticipant: true };
  sync();
  sync();
  assert.deepEqual([...activeFilters.values()], ['event_id=eq.event-a']);
  scope.data = { ...scope.data, event: { id: 'event-b' } };
  sync();
  assert.deepEqual([...activeFilters.values()], ['event_id=eq.event-b']);
});
