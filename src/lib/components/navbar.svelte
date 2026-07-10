<script>
  import { goto } from '$app/navigation';
  import { LogIn, LogOut, Sparkles, UserCircle2, LayoutGrid, CalendarDays, Zap } from '@lucide/svelte';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
  import * as Avatar from '$lib/components/ui/avatar/index.js';
  import * as Separator from '$lib/components/ui/separator/index.js';

  export let user = null;
  export let signingIn = false;
  export let signingOut = false;
  export let onSignIn = undefined;
  export let onSignOut = undefined;

  $: avatar = user?.user_metadata?.avatar_url ?? user?.user_metadata?.picture ?? '';
  $: name = user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? user?.email ?? 'Account';
</script>

<header class="sticky top-0 z-50 mb-8">
  <nav
    class="glass mx-auto flex max-w-7xl items-center justify-between gap-4 rounded-2xl px-5 py-3.5 shadow-glow-sm"
    style="margin-top: 1.25rem;"
  >
    <!-- Logo -->
    <a href="/" class="flex items-center gap-3 group">
      <div
        class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-slate-950 shadow-glow transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_0_0_2px_rgba(250,204,21,0.4),_0_8px_24px_rgba(250,204,21,0.25)]"
      >
        <Sparkles size={18} />
      </div>
      <div class="hidden sm:block">
        <p class="text-xs font-bold tracking-[0.2em] text-amber-300 uppercase leading-none">EventNetwork AI</p>
        <p class="mt-0.5 text-xs text-ink-400 leading-none">AI networking for offline events</p>
      </div>
    </a>

    <!-- Right side -->
    <div class="flex items-center gap-3">
      {#if user}
        <!-- Quick nav links on desktop -->
        <div class="hidden md:flex items-center gap-1">
          <button
            onclick={() => goto('/events')}
            class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-ink-300 transition hover:bg-white/8 hover:text-white"
          >
            <LayoutGrid size={14} />
            My Events
          </button>
          <button
            onclick={() => goto('/organizer')}
            class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-ink-300 transition hover:bg-white/8 hover:text-white"
          >
            <CalendarDays size={14} />
            Analytics
          </button>
        </div>

        <!-- Desktop: show name -->
        <span class="hidden lg:block text-sm font-medium text-ink-200 max-w-[150px] truncate">
          {name.split(' ')[0]}
        </span>
      {/if}

      <!-- Avatar / dropdown -->
      <DropdownMenu.Root>
        <DropdownMenu.Trigger
          class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-ink-200 transition-all hover:border-amber-300/40 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
          aria-label={name}
          title={name}
        >
          {#if user}
            <Avatar.Root class="h-8 w-8">
              {#if avatar}
                <Avatar.Image src={avatar} alt={name} />
              {/if}
              <Avatar.Fallback class="text-xs font-bold bg-amber-400/20 text-amber-300">
                {name.slice(0, 1).toUpperCase()}
              </Avatar.Fallback>
            </Avatar.Root>
          {:else}
            <UserCircle2 size={20} />
          {/if}
        </DropdownMenu.Trigger>

        <DropdownMenu.Content class="w-64 mt-2">
          <DropdownMenu.Label class="px-3 pt-2 pb-1">
            <p class="text-sm font-semibold text-white truncate">{name}</p>
            <p class="mt-0.5 truncate text-xs text-ink-400">{user?.email ?? 'Guest'}</p>
          </DropdownMenu.Label>

          <Separator.Root class="my-1.5" />

          {#if user}
            <DropdownMenu.Item onSelect={() => goto('/events')} class="gap-2.5">
              <LayoutGrid size={15} class="text-ink-400" />
              My events
            </DropdownMenu.Item>
            <DropdownMenu.Item onSelect={() => goto('/organizer')} class="gap-2.5">
              <CalendarDays size={15} class="text-ink-400" />
              Organizer dashboard
            </DropdownMenu.Item>

            <Separator.Root class="my-1.5" />

            <DropdownMenu.Item
              class="gap-2.5 text-rose-300 focus:bg-rose-400/10 hover:bg-rose-400/10"
              onSelect={(event) => {
                event.preventDefault();
                onSignOut?.();
              }}
            >
              <LogOut size={15} />
              {#if signingOut}Signing out…{:else}Sign out{/if}
            </DropdownMenu.Item>
          {:else}
            <DropdownMenu.Item
              class="gap-2.5 text-amber-200 focus:bg-amber-400/10"
              onSelect={(event) => {
                event.preventDefault();
                onSignIn?.();
              }}
            >
              <LogIn size={15} />
              {#if signingIn}Redirecting…{:else}Continue with Google{/if}
            </DropdownMenu.Item>
          {/if}
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </div>
  </nav>
</header>
