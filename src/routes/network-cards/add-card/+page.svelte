<script>
  import { onMount } from 'svelte';
  import { ArrowLeft, Brain, LoaderCircle, Save, Sparkles } from '@lucide/svelte';
  import { goto } from '$app/navigation';
  import PageShell from '$lib/components/page-shell.svelte';
  import Sidebar from '$lib/components/sidebar.svelte';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Input } from '$lib/components/ui/input/index.js';
  import { toast } from '$lib/components/ui/sonner/index.js';
  import { createSupabaseBrowserClient } from '$lib/supabase/client';

  export let data;
  let card = { id: null, title: '', display_name: data.user?.user_metadata?.full_name ?? '', what_i_do: '', looking_for: '', about_me: '' };
  let mode = 'ai';
  let sourceText = '';
  let generating = false;
  let saving = false;
  let loadError = '';
  let signingOut = false;

  async function loadCard() {
    const id = new URLSearchParams(window.location.search).get('card'); if (!id) return;
    const res = await fetch('/api/network-cards'); const body = await res.json(); const found = body.cards?.find((item) => item.id === id); if (found) card = { ...found };
  }
  async function autofill() {
    if (!sourceText.trim()) return; generating = true; loadError = '';
    try { const res = await fetch('/api/network_profiles/autofill', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: sourceText }) }); const body = await res.json(); if (!res.ok) throw new Error(body.error); card = { ...card, display_name: body.profile.displayName || card.display_name, what_i_do: body.profile.whatTheyDo, looking_for: body.profile.whoTheyWant, about_me: body.profile.aboutMe }; mode = 'manual'; toast.success('Card fields generated. Review before saving.'); }
    catch (error) { loadError = error.message ?? 'Could not generate this card.'; } finally { generating = false; }
  }
  async function save() {
    if (!card.title || !card.display_name || !card.what_i_do || !card.looking_for) { toast.error('Complete the card title, name, what you do, and what you are looking for.'); return; }
    saving = true; try { const res = await fetch(card.id ? `/api/network-cards/${card.id}` : '/api/network-cards', { method: card.id ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(card) }); const body = await res.json(); if (!res.ok) throw new Error(body.error); toast.success('Network card saved.'); await goto('/network-cards'); } catch (error) { toast.error(error.message ?? 'Could not save card.'); } finally { saving = false; }
  }
  async function signOut() { signingOut = true; await createSupabaseBrowserClient().auth.signOut(); await goto('/'); }
  onMount(loadCard);
</script>

<svelte:head><title>{card.id ? 'Edit' : 'Add'} Network Card | Evenai</title></svelte:head>
<PageShell user={data.user}><Sidebar user={data.user} {signingOut} onSignOut={signOut} /><main class="mx-auto max-w-3xl px-4 pb-10 pt-2 sm:px-6"><button type="button" onclick={() => goto('/network-cards')} class="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-ink-400 hover:text-white"><ArrowLeft size={16} /> Network Cards</button><section class="rounded-3xl border border-white/8 bg-white/[0.03] p-5 sm:p-8"><p class="text-sm font-semibold text-violet-300">NETWORK CARD</p><h1 class="mt-1 text-2xl font-black text-white">{card.id ? 'Edit your card' : 'Create a card'}</h1><p class="mt-2 text-sm leading-6 text-ink-400">Start with AI or write it yourself. You will choose this card whenever you want it to power an event’s AI matches.</p><div class="mt-7 flex rounded-xl border border-white/10 bg-white/[0.03] p-1"><button class="flex-1 rounded-lg px-3 py-2 text-sm font-semibold {mode === 'ai' ? 'bg-violet-400/20 text-violet-100' : 'text-ink-400'}" onclick={() => mode = 'ai'}><Sparkles size={15} class="mr-1 inline" /> Magic AI</button><button class="flex-1 rounded-lg px-3 py-2 text-sm font-semibold {mode === 'manual' ? 'bg-violet-400/20 text-violet-100' : 'text-ink-400'}" onclick={() => mode = 'manual'}>Fill manually</button></div>{#if mode === 'ai'}<div class="mt-5 rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.05] p-4"><p class="flex items-center gap-2 text-sm font-bold text-cyan-200"><Brain size={16} /> Magic AI auto-fill</p><textarea bind:value={sourceText} rows="5" class="mt-3 w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white" placeholder="Paste a LinkedIn About section, resume summary, or a short bio..."></textarea>{#if loadError}<p class="mt-2 text-xs text-rose-300">{loadError}</p>{/if}<Button class="mt-3 gap-2" disabled={generating || !sourceText.trim()} onclick={autofill}>{#if generating}<LoaderCircle size={15} class="animate-spin" /> Generating…{:else}<Sparkles size={15} /> Generate fields{/if}</Button></div>{/if}<div class="mt-6 grid gap-4 sm:grid-cols-2"><label class="text-sm text-ink-300">Card title<Input bind:value={card.title} class="mt-1.5 border-white/10 bg-white/5 text-white" placeholder="Founder / hiring / investor" /></label><label class="text-sm text-ink-300">Display name<Input bind:value={card.display_name} class="mt-1.5 border-white/10 bg-white/5 text-white" placeholder="Your name" /></label></div><label class="mt-4 block text-sm text-ink-300">What I do<textarea bind:value={card.what_i_do} rows="4" class="mt-1.5 w-full rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-white" placeholder="Your role, expertise, or project"></textarea></label><label class="mt-4 block text-sm text-ink-300">Looking for<textarea bind:value={card.looking_for} rows="4" class="mt-1.5 w-full rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-white" placeholder="The people or opportunities you want to find"></textarea></label><label class="mt-4 block text-sm text-ink-300">About me <span class="text-ink-500">(optional)</span><textarea bind:value={card.about_me} rows="3" class="mt-1.5 w-full rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-white" placeholder="Add context that helps others understand you"></textarea></label><div class="mt-6 flex gap-3"><Button class="gap-2" disabled={saving} onclick={save}>{#if saving}<LoaderCircle size={16} class="animate-spin" /> Saving…{:else}<Save size={16} /> Save card{/if}</Button><Button variant="outline" class="border-white/10" onclick={() => goto('/network-cards')}>Cancel</Button></div></section></main></PageShell>
