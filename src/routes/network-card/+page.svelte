<script>
  import { onDestroy, onMount, tick } from 'svelte';
  import { Camera, Edit3, LoaderCircle, Save, Share2, X } from '@lucide/svelte';
  import QRCode from 'qrcode';
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
  let scannerOpen = false;
  let scannerStarting = false;
  let scannerError = '';
  let scannerVideo;
  let scannerStream;
  let scanTimer;

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
  function stopScanner() {
    if (scanTimer) window.clearTimeout(scanTimer);
    scanTimer = undefined;
    scannerStream?.getTracks().forEach((track) => track.stop());
    scannerStream = undefined;
    scannerOpen = false;
  }

  async function startScanner() {
    scannerError = '';
    scannerOpen = true;
    scannerStarting = true;
    try {
      if (!('BarcodeDetector' in window)) {
        throw new Error('QR scanning is not supported in this browser. Open this page in Chrome or Edge to use the camera.');
      }
      await tick();
      scannerStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      scannerVideo.srcObject = scannerStream;
      await scannerVideo.play();
      const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
      scannerStarting = false;

      const scanFrame = async () => {
        if (!scannerOpen || !scannerVideo) return;
        try {
          const codes = await detector.detect(scannerVideo);
          const rawValue = codes[0]?.rawValue;
          if (rawValue) {
            const url = new URL(rawValue);
            const token = url.searchParams.get('token');
            if (url.pathname === '/network-card/scan' && token) {
              stopScanner();
              window.location.assign(`/network-card/scan?token=${encodeURIComponent(token)}`);
              return;
            }
            scannerError = 'This is not an Evenai Network Card QR code.';
          }
        } catch (error) {
          // Keep scanning; a frame may be unavailable while the camera starts.
        }
        scanTimer = window.setTimeout(scanFrame, 250);
      };
      scanFrame();
    } catch (error) {
      scannerStarting = false;
      scannerError = error.message || 'Could not open the camera. Check your camera permission and try again.';
      scannerStream?.getTracks().forEach((track) => track.stop());
      scannerStream = undefined;
    }
  }

  onMount(loadCard);
  onDestroy(stopScanner);
</script>

<svelte:head><title>Network Card | Evenai</title></svelte:head>

<PageShell user={data.user}>
  <Sidebar user={data.user} {signingOut} onSignOut={signOut} />
  {#if sharing}<div class="share-backdrop" onclick={() => sharing = false} aria-hidden="true"></div>{/if}
  {#if scannerOpen}
    <div class="scan-backdrop" role="presentation" onclick={stopScanner}></div>
    <div class="scan-dialog" role="dialog" aria-modal="true" aria-labelledby="scan-title">
      <div class="flex items-center justify-between gap-4"><div><p class="text-xs font-bold uppercase tracking-wider text-cyan-300">Network Card</p><h2 id="scan-title" class="mt-1 text-xl font-bold text-white">Scan a QR code</h2></div><button class="rounded-xl p-2 text-ink-300 hover:bg-white/10 hover:text-white" onclick={stopScanner} aria-label="Close scanner"><X size={20} /></button></div>
      <div class="scan-preview mt-5">{#if scannerStarting}<LoaderCircle size={28} class="animate-spin text-cyan-300" />{/if}<video bind:this={scannerVideo} class:invisible={scannerStarting} playsinline muted></video></div>
      <p class="mt-4 text-center text-sm leading-6 text-ink-300">Point your camera at another person’s Network Card QR code.</p>
      {#if scannerError}<p class="mt-3 rounded-xl border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-center text-xs leading-5 text-amber-100">{scannerError}</p>{/if}
    </div>
  {/if}
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
        {#if !editing}<div class="card-actions pointer-events-auto flex justify-center gap-3 rounded-2xl bg-ink-950/80 p-2 backdrop-blur-md">{#if sharing}<Button variant="outline" class="gap-2 border-white/10" onclick={() => sharing = false}><X size={16} /> Close</Button>{:else}<Button variant="outline" class="gap-2 border-white/10" onclick={startSharing} disabled={generatingQr}>{#if generatingQr}<LoaderCircle size={16} class="animate-spin" /> Creating…{:else}<Share2 size={16} /> Share{/if}</Button><Button variant="outline" class="gap-2 border-white/10" onclick={startScanner}><Camera size={16} /> Scan</Button><Button class="gap-2" onclick={startEditing}><Edit3 size={16} /> Edit</Button>{/if}</div>{/if}
      </div>
    {/if}
  </main>
</PageShell>

<style>
  .network-card { z-index: 20; background: linear-gradient(145deg, rgba(49, 46, 129, .48), rgba(15, 23, 42, .94)); box-shadow: 0 22px 55px rgba(0, 0, 0, .32); }
  .network-card.share-active { box-shadow: 0 25px 70px rgba(0, 0, 0, .7); }
  .share-backdrop { position: fixed; inset: 0; z-index: 100; background: rgba(0, 0, 0, .76); backdrop-filter: blur(3px); }
  .scan-backdrop { position: fixed; inset: 0; z-index: 140; background: rgba(0, 0, 0, .78); backdrop-filter: blur(3px); }
  .scan-dialog { position: fixed; z-index: 150; top: 50%; left: 50%; width: min(92vw, 28rem); transform: translate(-50%, -50%); border: 1px solid rgba(255,255,255,.12); border-radius: 1.5rem; background: #12131a; padding: 1.25rem; box-shadow: 0 25px 70px rgba(0,0,0,.55); }
  .scan-preview { display: grid; aspect-ratio: 1; place-items: center; overflow: hidden; border: 1px solid rgba(103,232,249,.28); border-radius: 1rem; background: #05070c; }
  .scan-preview video { width: 100%; height: 100%; object-fit: cover; }
  .qr-code { width: 180px; height: 180px; border-radius: 12px; background: white; }
  .card-actions { position: fixed; z-index: 120; bottom: calc(4.5rem + env(safe-area-inset-bottom)); left: 50%; transform: translateX(-50%); }
  @media (min-width: 768px) { .card-actions { bottom: 1.25rem; left: calc(50% + 120px); } }
</style>
