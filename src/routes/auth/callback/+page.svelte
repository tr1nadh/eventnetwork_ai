<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { createSupabaseBrowserClient } from '$lib/supabase/client';

  export let data;

  /** 'loading' | 'success' | 'error' */
  let phase = 'loading';
  let errorMessage = '';
  let tick = 0; // 0-3, drives the animated trailing dots

  onMount(async () => {
    const startTime = Date.now();
    const MIN_DISPLAY_MS = 3000;

    // Animate trailing dots on the heading
    const tickTimer = setInterval(() => { tick = (tick + 1) % 4; }, 500);

    // Fast-fail: if the server already knows the code exchange failed,
    // skip the polling loop entirely.
    if (!data.exchangeOk) {
      clearInterval(tickTimer);
      errorMessage = 'The sign-in link has expired or is invalid. Please try again.';
      phase = 'error';
      setTimeout(() => window.location.replace('/'), 2500);
      return;
    }

    try {
      const supabase = createSupabaseBrowserClient();

      // The server-side load already called exchangeCodeForSession and the
      // session cookies are in the 200 OK response we are currently rendering.
      // Poll the browser client until those cookies are read (max 10 s / 20 polls).
      let session = null;
      for (let attempt = 0; attempt < 20; attempt++) {
        const { data: sd } = await supabase.auth.getSession();
        if (sd.session) { session = sd.session; break; }
        await new Promise(r => setTimeout(r, 500));
      }

      if (!session) {
        throw new Error('Authentication could not be verified. Please try again.');
      }

      // Honour the 3-second minimum so the screen does not flash past too quickly
      const elapsed = Date.now() - startTime;
      if (elapsed < MIN_DISPLAY_MS) {
        await new Promise(r => setTimeout(r, MIN_DISPLAY_MS - elapsed));
      }

      clearInterval(tickTimer);
      phase = 'success';

      // Let the success checkmark render for a brief moment
      await new Promise(r => setTimeout(r, 400));

      goto(data.next ?? '/events', { replaceState: true });

    } catch (err) {
      clearInterval(tickTimer);
      errorMessage = err?.message ?? 'An unexpected error occurred.';
      phase = 'error';

      // Give the user 2.5 s to read the error, then redirect to login
      setTimeout(() => window.location.replace('/'), 2500);
    }
  });


  $: trailingDots = '.'.repeat(tick);
</script>

<svelte:head>
  <title>Authenticating… | EventNetwork AI</title>
</svelte:head>

<!--
  Full-screen overlay that blocks all interaction while auth initialises.
  Only rendered after a successful Google OAuth callback (i.e. there is a
  ?code= param in the URL and +page.server.js returned successfully).
-->
<div class="overlay" aria-live="polite" aria-busy={phase === 'loading'}>

  <!-- Ambient background glows matching the app's colour palette -->
  <div class="glow glow-violet" aria-hidden="true"></div>
  <div class="glow glow-amber"  aria-hidden="true"></div>

  <div class="card">

    <!-- Brand logo mark -->
    <div class="logo-wrap" aria-hidden="true">
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="14" cy="14" r="14" fill="rgba(251,191,36,0.12)"/>
        <path d="M9 14L14 9L19 14L14 19Z" stroke="#fbbf24" stroke-width="1.5" fill="none" stroke-linejoin="round"/>
        <circle cx="14" cy="14" r="2.5" fill="#fbbf24"/>
        <circle cx="9"  cy="14" r="1.5" fill="#a78bfa"/>
        <circle cx="19" cy="14" r="1.5" fill="#38bdf8"/>
        <circle cx="14" cy="9"  r="1.5" fill="#a78bfa"/>
        <circle cx="14" cy="19" r="1.5" fill="#38bdf8"/>
      </svg>
    </div>

    {#if phase === 'loading'}

      <!-- Concentric spinner -->
      <div class="spinner-wrap" role="status" aria-label="Authenticating">
        <div class="ring ring-outer"></div>
        <div class="ring ring-inner"></div>
        <div class="dot"></div>
      </div>

      <h1 class="heading">Authenticating{trailingDots}</h1>
      <p class="subtitle">Please wait while we securely sign you in.</p>

      <!-- Progress steps -->
      <ul class="steps" aria-label="Sign-in progress">
        <li class="step step-done">
          <span class="step-icon">✓</span>
          <span class="step-label">Google account verified</span>
        </li>
        <li class="step step-done">
          <span class="step-icon">✓</span>
          <span class="step-label">Secure session established</span>
        </li>
        <li class="step step-active">
          <span class="step-icon step-spinner"></span>
          <span class="step-label">Loading your profile&hellip;</span>
        </li>
      </ul>

    {:else if phase === 'success'}

      <div class="result-icon" aria-hidden="true">
        <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="28" cy="28" r="26" stroke="#4ade80" stroke-width="2" fill="rgba(74,222,128,0.08)"/>
          <path class="check-path" d="M17 29L23 35L39 19"
                stroke="#4ade80" stroke-width="2.5"
                stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <h1 class="heading" style="color:#4ade80">Signed in!</h1>
      <p class="subtitle">Taking you to your events&hellip;</p>

    {:else}

      <div class="result-icon" aria-hidden="true">
        <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="28" cy="28" r="26" stroke="#f87171" stroke-width="2" fill="rgba(248,113,113,0.08)"/>
          <path d="M19 19L37 37M37 19L19 37" stroke="#f87171" stroke-width="2.5" stroke-linecap="round"/>
        </svg>
      </div>
      <h1 class="heading" style="color:#f87171">Authentication Failed</h1>
      <p class="subtitle" style="color:rgba(248,113,113,0.75)">{errorMessage}</p>
      <p class="redirect-hint">Redirecting back to sign-in&hellip;</p>

    {/if}

  </div>
</div>

<style>
  /* ── Full-screen overlay ── */
  .overlay {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #050816;
    z-index: 9999;
    overflow: hidden;
  }

  /* ── Ambient glows ── */
  .glow {
    position: absolute;
    border-radius: 50%;
    filter: blur(90px);
    pointer-events: none;
  }
  .glow-violet {
    width: 600px; height: 600px;
    background: radial-gradient(circle, rgba(124,58,237,0.16) 0%, transparent 70%);
    top: -180px; left: -180px;
  }
  .glow-amber {
    width: 480px; height: 480px;
    background: radial-gradient(circle, rgba(251,191,36,0.10) 0%, transparent 70%);
    bottom: -100px; right: -100px;
  }

  /* ── Card ── */
  .card {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.1rem;
    padding: 2.75rem 2.25rem;
    width: min(420px, 92vw);
    background: rgba(255,255,255,0.025);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 1.5rem;
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    text-align: center;
    /* Subtle border gradient highlight at top */
    box-shadow:
      0 0 0 1px rgba(255,255,255,0.04),
      0 32px 80px rgba(0,0,0,0.6);
  }
  .card::before {
    content: '';
    position: absolute;
    top: 0; left: 12%; right: 12%; height: 1px;
    background: linear-gradient(90deg, transparent, rgba(124,58,237,0.5), rgba(251,191,36,0.4), transparent);
    border-radius: 1px;
  }

  /* ── Logo ── */
  .logo-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 52px; height: 52px;
    border-radius: 14px;
    background: rgba(251,191,36,0.07);
    border: 1px solid rgba(251,191,36,0.18);
    margin-bottom: 0.2rem;
  }

  /* ── Concentric spinner ── */
  .spinner-wrap {
    position: relative;
    width: 76px; height: 76px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .ring {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    border: 2.5px solid transparent;
  }
  .ring-outer {
    border-top-color: #7c3aed;
    border-right-color: rgba(124,58,237,0.25);
    animation: spin 1.3s linear infinite;
  }
  .ring-inner {
    inset: 12px;
    border-top-color: #38bdf8;
    border-right-color: rgba(56,189,248,0.25);
    animation: spin 0.85s linear infinite reverse;
  }
  .dot {
    width: 10px; height: 10px;
    border-radius: 50%;
    background: #fbbf24;
    box-shadow: 0 0 14px rgba(251,191,36,0.9);
    animation: pulse 1.3s ease-in-out infinite;
  }

  /* ── Heading ── */
  .heading {
    font-size: 1.65rem;
    font-weight: 900;
    color: #ffffff;
    margin: 0;
    letter-spacing: -0.02em;
    line-height: 1.15;
    font-family: inherit;
    /* Prevent layout shift from the trailing dots */
    min-width: 16ch;
  }

  /* ── Subtitle ── */
  .subtitle {
    font-size: 0.875rem;
    color: rgba(255,255,255,0.42);
    margin: -0.35rem 0 0;
    line-height: 1.55;
    font-family: inherit;
  }

  /* ── Steps ── */
  .steps {
    list-style: none;
    padding: 0;
    margin: 0.4rem 0 0;
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
    width: 100%;
  }
  .step {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    padding: 0.55rem 0.85rem;
    border-radius: 0.625rem;
    font-size: 0.825rem;
    font-family: inherit;
  }
  .step-done {
    background: rgba(74,222,128,0.07);
    border: 1px solid rgba(74,222,128,0.15);
    color: rgba(74,222,128,0.85);
  }
  .step-active {
    background: rgba(251,191,36,0.07);
    border: 1px solid rgba(251,191,36,0.18);
    color: rgba(251,191,36,0.85);
  }
  .step-icon {
    font-size: 0.75rem;
    font-weight: 700;
    flex-shrink: 0;
    width: 18px;
    text-align: center;
  }
  .step-label { flex: 1; text-align: left; }

  /* Inline spinner for the active step */
  .step-spinner {
    display: inline-block;
    width: 14px; height: 14px;
    border-radius: 50%;
    border: 2px solid rgba(251,191,36,0.25);
    border-top-color: #fbbf24;
    animation: spin 0.8s linear infinite;
  }

  /* ── Result icons (success / error) ── */
  .result-icon {
    animation: pop-in 0.35s cubic-bezier(0.34,1.56,0.64,1) both;
  }
  .check-path {
    stroke-dasharray: 30;
    stroke-dashoffset: 30;
    animation: draw-check 0.5s 0.2s ease forwards;
  }

  /* ── Redirect hint ── */
  .redirect-hint {
    font-size: 0.78rem;
    color: rgba(255,255,255,0.28);
    margin: -0.4rem 0 0;
    font-family: inherit;
  }

  /* ── Keyframes ── */
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  @keyframes pulse {
    0%, 100% { transform: scale(1);   opacity: 1;   }
    50%       { transform: scale(1.35); opacity: 0.65; }
  }
  @keyframes pop-in {
    from { transform: scale(0.45); opacity: 0; }
    to   { transform: scale(1);    opacity: 1; }
  }
  @keyframes draw-check {
    to { stroke-dashoffset: 0; }
  }
</style>
