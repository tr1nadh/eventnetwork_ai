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
  let nativeQrInput;
  let scanningQr = false;
  $: settingsName = data.user?.user_metadata?.full_name ?? data.user?.user_metadata?.name ?? data.user?.user_metadata?.display_name ?? data.user?.email?.split('@')[0] ?? 'Account';
  let liveScannerOpen = false;
  let liveScannerStarting = false;
  let liveScannerError = '';
  let liveScannerVideo;
  let liveScannerStream;
  let liveScannerCanvas;
  let liveScanTimer;
  let liveScanBusy = false;
  let liveScanStatus = 'searching';
  let zxingReaderPromise;

  const scannerOptions = {
    formats: ['QRCode'],
    maxNumberOfSymbols: 1,
    tryHarder: true,
    tryRotate: true,
    tryInvert: true,
    tryDownscale: true,
    tryDenoise: true
  };

  function openNativeQrCamera() {
    nativeQrInput?.click();
  }

  function useNativeQrCamera() {
    stopLiveScanner();
    openNativeQrCamera();
  }

  async function getZxingReader() {
    // ZXing uses browser/WASM APIs. Load it only after a scan is requested so
    // this page can render safely in the serverless SSR runtime.
    if (!zxingReaderPromise) {
      zxingReaderPromise = Promise.all([
        import('zxing-wasm/reader'),
        import('zxing-wasm/reader/zxing_reader.wasm?url')
      ]).then(async ([reader, wasm]) => {
        await reader.prepareZXingModule({
          overrides: {
            locateFile: (path) => path.endsWith('.wasm') ? wasm.default : path
          },
          fireImmediately: true
        });
        return reader;
      });
    }
    return zxingReaderPromise;
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
      const { readBarcodes } = await getZxingReader();
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
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `Could not load Network Card (${res.status}).`);
      if (body.cards?.[0]) card = { ...body.cards[0], display_name: settingsName };
      else card = { ...card, display_name: settingsName };
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
      qrDataUrl = await QRCode.toDataURL(url, { width: 512, margin: 2, errorCorrectionLevel: 'H', color: { dark: '#000000', light: '#ffffff' } });
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

  function stopLiveScanner() {
    if (liveScanTimer) window.clearTimeout(liveScanTimer);
    liveScanTimer = undefined;
    liveScannerStream?.getTracks().forEach((track) => track.stop());
    liveScannerStream = undefined;
    liveScannerCanvas = undefined;
    liveScanStatus = 'searching';
    liveScannerOpen = false;
  }

  async function startLiveScanner() {
    liveScannerError = '';
    liveScanStatus = 'searching';
    liveScannerOpen = true;
    liveScannerStarting = true;
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Live camera scanning is unavailable in this browser.');
      await tick();
      liveScannerStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      liveScannerVideo.srcObject = liveScannerStream;
      await liveScannerVideo.play();
      liveScannerCanvas = document.createElement('canvas');
      const { readBarcodes } = await getZxingReader();
      liveScannerStarting = false;

      const scanFrame = async () => {
        if (!liveScannerOpen || !liveScannerVideo) return;
        if (!liveScanBusy && liveScannerVideo.videoWidth) {
          liveScanBusy = true;
          try {
            const maxWidth = 960;
            const scale = Math.min(1, maxWidth / liveScannerVideo.videoWidth);
            liveScannerCanvas.width = Math.round(liveScannerVideo.videoWidth * scale);
            liveScannerCanvas.height = Math.round(liveScannerVideo.videoHeight * scale);
            const context = liveScannerCanvas.getContext('2d', { willReadFrequently: true });
            context?.drawImage(liveScannerVideo, 0, 0, liveScannerCanvas.width, liveScannerCanvas.height);
            const image = context?.getImageData(0, 0, liveScannerCanvas.width, liveScannerCanvas.height);
            const results = image ? await readBarcodes(image, scannerOptions) : [];
            const rawValue = results[0]?.text;
            if (rawValue) {
              try {
                liveScanStatus = 'verifying';
                await new Promise((resolve) => window.setTimeout(resolve, 350));
                openScannedQr(rawValue);
                return;
              } catch {
                liveScanStatus = 'searching';
                liveScannerError = 'That QR code is not an Evenai Network Card.';
              }
            }
          } catch {
            // Continue while autofocus and exposure settle.
          } finally {
            liveScanBusy = false;
          }
        }
        if (liveScannerOpen) liveScanTimer = window.setTimeout(scanFrame, 150);
      };
      scanFrame();
    } catch (error) {
      liveScannerStarting = false;
      liveScannerError = error.message || 'Could not open the camera.';
      liveScannerStream?.getTracks().forEach((track) => track.stop());
      liveScannerStream = undefined;
    }
  }

  onMount(loadCard);
  onDestroy(stopLiveScanner);
</script>

<svelte:head><title>Network Card | Evenai</title></svelte:head>

<PageShell user={data.user}>
  <Sidebar user={data.user} {signingOut} onSignOut={signOut} />
  {#if sharing}<div class="share-backdrop" onclick={() => sharing = false} aria-hidden="true"></div>{/if}
  <input bind:this={nativeQrInput} class="sr-only" type="file" accept="image/*" capture="environment" onchange={scanNativeQrImage} />
  {#if liveScannerOpen}
    <div class="scan-backdrop" role="presentation" onclick={stopLiveScanner}></div>
    <div class="scan-dialog" role="dialog" aria-modal="true" aria-labelledby="live-scan-title">
      <div class="flex items-center justify-between gap-4"><div><p class="text-xs font-bold uppercase tracking-wider text-cyan-300">Network Card</p><h2 id="live-scan-title" class="mt-1 text-xl font-bold text-white">Scan a QR code</h2></div><button class="rounded-xl p-2 text-ink-300 hover:bg-white/10 hover:text-white" onclick={stopLiveScanner} aria-label="Close scanner"><X size={20} /></button></div>
      <div class:verifying={liveScanStatus === 'verifying'} class="scan-preview mt-5">{#if liveScannerStarting}<LoaderCircle size={28} class="animate-spin text-cyan-300" />{:else}<div class="scan-corners" aria-hidden="true"></div><div class="scan-line" aria-hidden="true"></div>{#if liveScanStatus === 'verifying'}<div class="scan-confirmation"><span class="scan-check">✓</span><span>QR detected</span></div>{/if}{/if}<video bind:this={liveScannerVideo} class:invisible={liveScannerStarting} autoplay playsinline muted></video></div>
      <p class="mt-4 text-center text-sm leading-6 text-ink-300">{#if liveScannerStarting}Starting camera…{:else if liveScanStatus === 'verifying'}QR detected — verifying…{:else}Point the camera at an Evenai Network Card QR code.{/if}</p>
      <Button variant="outline" class="mt-3 w-full gap-2 border-white/10" onclick={useNativeQrCamera}><Camera size={16} /> Capture photo instead</Button>
      {#if liveScannerError}<p class="mt-3 rounded-xl border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-center text-xs leading-5 text-amber-100">{liveScannerError}</p>{/if}
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
              <div><p class="text-sm text-ink-300">Display name</p><Input value={settingsName} readonly class="mt-1.5 border-white/10 bg-white/5 text-ink-300" /><p class="mt-1.5 text-xs text-ink-500">Change your name in <a class="text-cyan-300 hover:underline" href="/settings">Settings</a>.</p></div>
              <label class="block text-sm text-ink-300">What I do<textarea bind:value={card.what_i_do} rows="4" class="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white"></textarea></label>
              <label class="block text-sm text-ink-300">About me<textarea bind:value={card.about_me} rows="5" class="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white"></textarea></label>
              <div class="flex gap-3"><Button class="gap-2" disabled={saving} onclick={saveCard}>{#if saving}<LoaderCircle size={16} class="animate-spin" /> Saving…{:else}<Save size={16} /> Save{/if}</Button><Button variant="outline" class="border-white/10" onclick={() => editing = false}>Cancel</Button></div>
            </div>
          {:else}
            <div class="flex items-start justify-between gap-4"><span class="rounded-full bg-violet-400/15 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-violet-200">Network card</span><span class="flex size-11 items-center justify-center rounded-2xl bg-white/8 text-lg font-black text-white">{card.display_name.slice(0, 1).toUpperCase()}</span></div>
            <h1 class="mt-12 text-3xl font-black text-white sm:text-4xl">{settingsName}</h1>
            <div class="mt-9 space-y-7 text-sm leading-7 sm:text-base"><div><p class="text-xs font-bold uppercase tracking-wider text-violet-200">What I do</p><p class="mt-2 text-ink-200">{card.what_i_do}</p></div><div><p class="text-xs font-bold uppercase tracking-wider text-violet-200">About me</p><p class="mt-2 text-ink-300">{card.about_me}</p></div></div>
            {#if sharing}<div class="mt-7 border-t border-white/10 pt-6"><img class="qr-code mx-auto" src={qrDataUrl} alt="Temporary Network Card QR code" /><p class="mt-3 text-center text-xs text-ink-400">Scan to connect and mark both of you as met{#if qrExpiresAt} · Expires at {new Date(qrExpiresAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}{/if}</p></div>{/if}
          {/if}
        </section>
        {#if !editing}<div class="card-actions pointer-events-auto flex justify-center gap-3 rounded-2xl bg-ink-950/80 p-2 backdrop-blur-md">{#if sharing}<Button variant="outline" class="gap-2 border-white/10" onclick={() => sharing = false}><X size={16} /> Close</Button>{:else}<Button variant="outline" class="gap-2 border-white/10" onclick={startSharing} disabled={generatingQr}>{#if generatingQr}<LoaderCircle size={16} class="animate-spin" /> Creating…{:else}<Share2 size={16} /> Share{/if}</Button><Button variant="outline" class="gap-2 border-white/10" onclick={startLiveScanner} disabled={scanningQr}>{#if scanningQr}<LoaderCircle size={16} class="animate-spin" /> Scanning…{:else}<Camera size={16} /> Scan{/if}</Button><Button class="gap-2" onclick={startEditing}><Edit3 size={16} /> Edit</Button>{/if}</div>{/if}
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
  .scan-preview { position: relative; }
  .scan-corners { position: absolute; z-index: 1; width: 68%; aspect-ratio: 1; border: 2px solid rgba(103,232,249,.85); border-radius: 1rem; box-shadow: 0 0 0 999px rgba(0,0,0,.12); pointer-events: none; }
  .scan-line { position: absolute; z-index: 2; left: 16%; right: 16%; top: 18%; height: 2px; background: #67e8f9; box-shadow: 0 0 14px #67e8f9; animation: scan-line 1.8s ease-in-out infinite; pointer-events: none; }
  .scan-preview.verifying .scan-line { animation: none; top: 50%; background: #86efac; box-shadow: 0 0 18px #86efac; }
  .scan-confirmation { position: absolute; z-index: 3; display: flex; flex-direction: column; align-items: center; gap: .5rem; color: #dcfce7; font-size: .875rem; font-weight: 700; text-shadow: 0 1px 8px #000; }
  .scan-check { display: grid; width: 3rem; height: 3rem; place-items: center; border-radius: 999px; background: rgba(74, 222, 128, .92); color: #052e16; font-size: 1.5rem; box-shadow: 0 0 24px rgba(74, 222, 128, .8); }
  @keyframes scan-line { 0%, 100% { transform: translateY(0); opacity: .7; } 50% { transform: translateY(16rem); opacity: 1; } }
  .qr-code { width: 256px; height: 256px; max-width: 100%; border-radius: 12px; background: white; }
  .card-actions { position: fixed; z-index: 120; bottom: calc(4.5rem + env(safe-area-inset-bottom)); left: 50%; transform: translateX(-50%); }
  @media (min-width: 768px) { .card-actions { bottom: 1.25rem; left: calc(50% + 120px); } }
</style>
