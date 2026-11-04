<script>
  import { onMount } from 'svelte';
  import { Camera, Edit3, LoaderCircle, Save, Share2, X } from '@lucide/svelte';
  import QRCode from 'qrcode';
  import { prepareZXingModule, readBarcodes } from 'zxing-wasm/reader';
  import zxingReaderWasmUrl from 'zxing-wasm/reader/zxing_reader.wasm?url';
  import PageShell from '$lib/components/page-shell.svelte';
  import Sidebar from '$lib/components/sidebar.svelte';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Input } from '$lib/components/ui/input/index.js';
  import { toast } from '$lib/components/ui/sonner/index.js';
  import { createSupabaseBrowserClient } from '$lib/supabase/client';

  export let data;

  const exampleCard = {
    id: null,
    display_name: 'Aarav Shah',
    what_i_do: 'Building an AI workflow startup for growing teams.',
    about_me: 'I enjoy turning messy problems into simple tools and meeting people who are curious about what comes next.'
  };
  let card = { ...exampleCard };
  let editing = false;
  let sharing = false;
  let loading = true;
  let saving = false;
  let signingOut = false;
  let qrDataUrl = '';
  let qrExpiresAt = null;
  let generatingQr = false;
  let nativeQrInput;
  let scanningQr = false;

  const scannerOptions = {
    formats: ['QRCode'],
    maxNumberOfSymbols: 1,
    tryHarder: true
  };

  function openNativeQrCamera() {
    nativeQrInput?.click();
  }

  function openScannedQr(rawValue) {
    if (!rawValue) return false;
    const url = new URL(rawValue, window.location.origin);
    const token = url.searchParams.get('token');
    if (url.pathname === '/network-card/scan' && token) {
      window.location.assign(`/network-card/scan?token=${encodeURIComponent(token)}`);
      return true;
    }
    throw new Error('This is not an Evenai Network Card QR code.');
  }

  async function scanNativeQrImage(event) {
    const image = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!image) return;

    scanningQr = true;
    try {
      await prepareZXingModule({
        overrides: {
          locateFile: (path) => path.endsWith('.wasm') ? zxingReaderWasmUrl : path
        },
        fireImmediately: true
      });
      const results = await readBarcodes(image, scannerOptions);
      const rawValue = results[0]?.text;
      if (!rawValue) throw new Error('No QR code was found in the captured image. Try again with a closer, sharper image.');
      openScannedQr(rawValue);
    } catch (error) {
      toast.error(error.message || 'Could not scan the captured image.');
    } finally {
      scanningQr = false;
    }
  }

  async function loadCard() {
    try {
      const res = await fetch('/api/network-cards');
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      if (body.cards?.[0]) card = { ...body.cards[0] };
    } catch (error) { toast.error(error.message ?? 'Could not load your network card.'); }
    finally { loading = false; }
  }

  function startEditing() {
    sharing = false;
    editing = true;
  }

  async function startSharing() {
    if (!card.id) {
      toast.info('Save your Network Card before sharing it.');
      return;
    }
    if (generatingQr) return;
    generatingQr = true;
    try {
      const res = await fetch(`/api/network-cards/${card.id}/share-token`, { method: 'POST', credentials: 'include' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Could not create a temporary QR code.');
      const url = `${window.location.origin}/network-card/scan?token=${encodeURIComponent(body.token)}`;
      qrDataUrl = await QRCode.toDataURL(url, { width: 280, margin: 1, errorCorrectionLevel: 'M', color: { dark: '#09090b', light: '#ffffff' } });
      qrExpiresAt = body.expiresAt;
      sharing = true;
    } catch (error) {
      toast.error(error.message ?? 'Could not create a temporary QR code.');
    } finally {
      generatingQr = false;
    }
  }

  async function saveCard() {
    if (!card.display_name.trim() || !card.what_i_do.trim() || !card.about_me.trim()) {
      toast.error('Complete your name, what you do, and about you.');
      return;
    }
    saving = true;
    try {
      const res = await fetch(card.id ? `/api/network-cards/${card.id}` : '/api/network-cards', {
        method: card.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(card)
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      card = { ...body.card };
      editing = false;
      toast.success('Network card saved.');
    } catch (error) { toast.error(error.message ?? 'Could not save your network card.'); }
    finally { saving = false; }
  }

  async function signOut() { signingOut = true; await createSupabaseBrowserClient().auth.signOut(); }

  onMount(loadCard);
</script>

<svelte:head><title>Network Card | Evenai</title></svelte:head>

<PageShell user={data.user}>
  <Sidebar user={data.user} {signingOut} onSignOut={signOut} />
  {#if sharing}<div class="share-backdrop" onclick={() => sharing = false} aria-hidden="true"></div>{/if}
  <input bind:this={nativeQrInput} class="sr-only" type="file" accept="image/*" capture="environment" onchange={scanNativeQrImage} />
  <main class="relative flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-8 sm:px-6 {sharing ? 'z-[110] pointer-events-none' : 'z-20'}">
    {#if loading}
      <div class="text-sm text-ink-400">Loading…</div>
    {:else}
      <div class="w-full max-w-xl pb-24 sm:pb-32">
        <section class:share-active={sharing} class="network-card relative rounded-3xl border border-white/10 p-6 sm:p-10 {sharing ? 'pointer-events-auto' : ''}">
          {#if editing}
            <div class="space-y-4">
              <label class="block text-sm text-ink-300">Display name<Input bind:value={card.display_name} class="mt-1.5 border-white/10 bg-white/5 text-white" /></label>
              <label class="block text-sm text-ink-300">What I do<textarea bind:value={card.what_i_do} rows="4" class="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white"></textarea></label>
              <label class="block text-sm text-ink-300">About me<textarea bind:value={card.about_me} rows="5" class="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white"></textarea></label>
              <div class="flex gap-3"><Button class="gap-2" disabled={saving} onclick={saveCard}>{#if saving}<LoaderCircle size={16} class="animate-spin" /> Saving…{:else}<Save size={16} /> Save{/if}</Button><Button variant="outline" class="border-white/10" onclick={() => editing = false}>Cancel</Button></div>
            </div>
          {:else}
            <div class="flex items-start justify-between gap-4"><span class="rounded-full bg-violet-400/15 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-violet-200">Network card</span><span class="flex size-11 items-center justify-center rounded-2xl bg-white/8 text-lg font-black text-white">{card.display_name.slice(0, 1).toUpperCase()}</span></div>
            <h1 class="mt-12 text-3xl font-black text-white sm:text-4xl">{card.display_name}</h1>
            <div class="mt-9 space-y-7 text-sm leading-7 sm:text-base"><div><p class="text-xs font-bold uppercase tracking-wider text-violet-200">What I do</p><p class="mt-2 text-ink-200">{card.what_i_do}</p></div><div><p class="text-xs font-bold uppercase tracking-wider text-violet-200">About me</p><p class="mt-2 text-ink-300">{card.about_me}</p></div></div>
            {#if sharing}<div class="mt-7 border-t border-white/10 pt-6"><img class="qr-code mx-auto" src={qrDataUrl} alt="Temporary Network Card QR code" /><p class="mt-3 text-center text-xs text-ink-400">Scan to connect and mark both of you as met{#if qrExpiresAt} · Expires at {new Date(qrExpiresAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}{/if}</p></div>{/if}
          {/if}
        </section>
        {#if !editing}<div class="card-actions pointer-events-auto flex justify-center gap-3 rounded-2xl bg-ink-950/80 p-2 backdrop-blur-md">{#if sharing}<Button variant="outline" class="gap-2 border-white/10" onclick={() => sharing = false}><X size={16} /> Close</Button>{:else}<Button variant="outline" class="gap-2 border-white/10" onclick={startSharing} disabled={generatingQr}>{#if generatingQr}<LoaderCircle size={16} class="animate-spin" /> Creating…{:else}<Share2 size={16} /> Share{/if}</Button><Button variant="outline" class="gap-2 border-white/10" onclick={openNativeQrCamera} disabled={scanningQr}>{#if scanningQr}<LoaderCircle size={16} class="animate-spin" /> Scanning…{:else}<Camera size={16} /> Scan{/if}</Button><Button class="gap-2" onclick={startEditing}><Edit3 size={16} /> Edit</Button>{/if}</div>{/if}
      </div>
    {/if}
  </main>
</PageShell>

<style>
  .network-card { z-index: 20; background: linear-gradient(145deg, rgba(49, 46, 129, .48), rgba(15, 23, 42, .94)); box-shadow: 0 22px 55px rgba(0, 0, 0, .32); }
  .network-card.share-active { box-shadow: 0 25px 70px rgba(0, 0, 0, .7); }
  .share-backdrop { position: fixed; inset: 0; z-index: 100; background: rgba(0, 0, 0, .76); backdrop-filter: blur(3px); }
  .qr-code { width: 180px; height: 180px; border-radius: 12px; background: white; }
  .card-actions { position: fixed; z-index: 120; bottom: calc(4.5rem + env(safe-area-inset-bottom)); left: 50%; transform: translateX(-50%); }
  @media (min-width: 768px) { .card-actions { bottom: 1.25rem; left: calc(50% + 120px); } }
</style>
