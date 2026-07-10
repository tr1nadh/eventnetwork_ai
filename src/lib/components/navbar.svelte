<script>
  import { goto } from '$app/navigation';
  import { LogIn, LogOut, Sparkles, UserCircle2, LayoutGrid, CalendarDays } from '@lucide/svelte';
  import { Card } from '$lib/components/ui/card/index.js';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
  import * as Avatar from '$lib/components/ui/avatar/index.js';
  import * as Separator from '$lib/components/ui/separator/index.js';

  export let user = null;
  export let signingIn = false;
  export let signingOut = false;
  export let onSignIn = undefined;
  export let onSignOut = undefined;

  const avatar = user?.user_metadata?.avatar_url ?? user?.user_metadata?.picture ?? '';
  const name = user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? user?.email ?? 'Account';
</script>

<Card className="relative z-[80] mb-8 px-5 py-4">
<nav class="flex items-center justify-between gap-4">
  <a href="/" class="flex items-center gap-3">
    <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-400 text-slate-950 shadow-glow">
      <Sparkles size={20} />
    </div>
    <div>
      <p class="text-sm font-semibold tracking-[0.18em] text-amber-200 uppercase">EventNetwork AI</p>
      <p class="text-xs text-slate-400">AI networking for offline events</p>
    </div>
  </a>

  <DropdownMenu.Root>
    <DropdownMenu.Trigger
      class="inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-slate-950/80 text-slate-200 transition hover:border-amber-300/40 hover:bg-slate-900"
      aria-label={name}
      title={name}
    >
      {#if user}
        <Avatar.Root className="h-10 w-10">
          {#if avatar}
            <Avatar.Image src={avatar} alt={name} />
          {/if}
          <Avatar.Fallback>{name.slice(0, 1).toUpperCase()}</Avatar.Fallback>
        </Avatar.Root>
      {:else}
        <UserCircle2 size={22} />
      {/if}
    </DropdownMenu.Trigger>

    <DropdownMenu.Content className="w-64">
      <DropdownMenu.Label className="px-3 pt-1">
        <p class="text-sm font-semibold text-white">{name}</p>
        <p class="mt-1 truncate text-xs text-slate-400">{user?.email ?? 'Guest'}</p>
      </DropdownMenu.Label>

      <Separator.Root className="my-2" />

      {#if user}
        <DropdownMenu.Item onSelect={() => goto('/events')}>
          <LayoutGrid size={16} />
          My events
        </DropdownMenu.Item>
        <DropdownMenu.Item onSelect={() => goto('/organizer')}>
          <CalendarDays size={16} />
          Organizer view
        </DropdownMenu.Item>

        <Separator.Root className="my-2" />

        <DropdownMenu.Item
          className="text-rose-200 focus:bg-rose-400/10 hover:bg-rose-400/10"
          onSelect={(event) => {
            event.preventDefault();
            onSignOut?.();
          }}
        >
          <LogOut size={16} />
          {#if signingOut}Signing out{:else}Sign out{/if}
        </DropdownMenu.Item>
      {:else}
        <DropdownMenu.Item
          className="text-amber-100"
          onSelect={(event) => {
            event.preventDefault();
            onSignIn?.();
          }}
        >
          <LogIn size={16} />
          {#if signingIn}Redirecting{:else}Continue with Google{/if}
        </DropdownMenu.Item>
      {/if}
    </DropdownMenu.Content>
  </DropdownMenu.Root>
</nav>
</Card>
