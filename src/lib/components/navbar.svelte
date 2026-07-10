<script>
  import { onMount } from 'svelte';
  import { LogIn, LogOut, Sparkles, UserCircle2, LayoutGrid, CalendarDays } from '@lucide/svelte';

  export let user = null;
  export let signingIn = false;
  export let signingOut = false;
  export let onSignIn = undefined;
  export let onSignOut = undefined;

  const avatar = user?.user_metadata?.avatar_url ?? user?.user_metadata?.picture ?? '';
  const name = user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? user?.email ?? 'Account';

  let open = false;
  let menuEl = null;
  let triggerEl = null;

  function closeMenu() {
    open = false;
  }

  function toggleMenu() {
    open = !open;
  }

  function handleDocumentClick(event) {
    const target = event.target;
    if (!target) return;
    if (menuEl?.contains(target) || triggerEl?.contains(target)) return;
    closeMenu();
  }

  onMount(() => {
    if (typeof document === 'undefined') return;
    document.addEventListener('click', handleDocumentClick);
    return () => {
      document.removeEventListener('click', handleDocumentClick);
    };
  });
</script>

<nav class="relative z-[80] mb-8 flex items-center justify-between overflow-visible rounded-3xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-xl isolate">
  <div class="flex items-center gap-3">
    <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-400 text-slate-950 shadow-glow">
      <Sparkles size={20} />
    </div>
    <div>
      <p class="text-sm font-semibold tracking-[0.18em] text-amber-200 uppercase">EventNetwork AI</p>
      <p class="text-xs text-slate-400">AI networking for offline events</p>
    </div>
  </div>

  <div class="relative">
    <button
      bind:this={triggerEl}
      type="button"
      class="inline-flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-slate-950/80 text-slate-200 transition hover:border-amber-300/40 hover:bg-slate-900"
      title={name}
      aria-label={name}
      aria-expanded={open}
      aria-haspopup="menu"
      onclick={toggleMenu}
    >
      {#if avatar}
        <img src={avatar} alt={name} class="h-full w-full object-cover" />
      {:else}
        <UserCircle2 size={22} />
      {/if}
    </button>

    {#if open}
      <div
        bind:this={menuEl}
        class="absolute right-0 z-[100] mt-3 w-56 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/95 p-2 shadow-2xl backdrop-blur-xl"
        role="menu"
      >
        <div class="px-3 py-2">
          <p class="text-sm font-semibold text-white">{name}</p>
          <p class="mt-1 truncate text-xs text-slate-400">{user?.email ?? 'Guest'}</p>
        </div>

        <div class="my-2 h-px bg-white/10"></div>

        {#if user}
          <a
            href="/events"
            class="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-200 transition hover:bg-white/5"
            role="menuitem"
            onclick={closeMenu}
          >
            <LayoutGrid size={16} />
            My events
          </a>
          <a
            href="/organizer"
            class="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-200 transition hover:bg-white/5"
            role="menuitem"
            onclick={closeMenu}
          >
            <CalendarDays size={16} />
            Organizer view
          </a>
          <button
            type="button"
            class="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-rose-200 transition hover:bg-rose-400/10"
            role="menuitem"
            onclick={() => {
              closeMenu();
              onSignOut?.();
            }}
          >
            <LogOut size={16} />
            {#if signingOut}Signing out{:else}Sign out{/if}
          </button>
        {:else}
          <button
            type="button"
            class="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-amber-100 transition hover:bg-white/5"
            role="menuitem"
            onclick={() => {
              closeMenu();
              onSignIn?.();
            }}
          >
            <LogIn size={16} />
            {#if signingIn}Redirecting{:else}Continue with Google{/if}
          </button>
        {/if}
      </div>
    {/if}
  </div>
</nav>
