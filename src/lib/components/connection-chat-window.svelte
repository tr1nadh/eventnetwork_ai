<script>
  import { tick, onDestroy } from 'svelte';
  import { MessageCircle, LoaderCircle, Send, CalendarHeart } from '@lucide/svelte';
  import { createSupabaseBrowserClient } from '$lib/supabase/client';
  import { chatMessagesStore, setConnectionMessages, appendConnectionMessage } from '$lib/stores/chatStore';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Input } from '$lib/components/ui/input/index.js';
  import { Avatar, AvatarFallback, AvatarImage } from '$lib/components/ui/avatar/index.js';
  import { toast } from '$lib/components/ui/sonner/index.js';

  export let connection = null;
  export let currentUserId = null;
  export let history = [];

  const supabase = createSupabaseBrowserClient();
  const timeFormatter = new Intl.DateTimeFormat([], { hour: 'numeric', minute: '2-digit' });
  const dateFormatter = new Intl.DateTimeFormat([], { month: 'short', day: 'numeric', year: 'numeric' });

  let draftMessage = '';
  let loadingMessages = false;
  let sendingMessage = false;
  let loadError = '';
  let messageViewport;
  let activeConnectionId = null;
  let channel = null;
  let loadVersion = 0;

  $: messages = connection?.id ? ($chatMessagesStore[connection.id] ?? []) : [];
  $: if (connection?.id && connection.id !== activeConnectionId) void openChat(connection);
  $: if (!connection?.id && activeConnectionId) resetChat();
  $: if (connection?.id && !loadingMessages) void queueScroll();

  onDestroy(() => cleanupRealtime());

  function getInitials(name) {
    return (name ?? 'U').split(' ').map((part) => part[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
  }

  function formatTime(value) {
    return value ? timeFormatter.format(new Date(value)) : '';
  }

  function formatDate(value) {
    return value ? dateFormatter.format(new Date(value)) : '';
  }

  async function queueScroll() {
    await tick();
    if (messageViewport) messageViewport.scrollTop = messageViewport.scrollHeight;
  }

  function cleanupRealtime() {
    if (channel) {
      supabase.removeChannel(channel);
      channel = null;
    }
  }

  function resetChat() {
    loadVersion += 1;
    cleanupRealtime();
    activeConnectionId = null;
    loadingMessages = false;
    sendingMessage = false;
    loadError = '';
    draftMessage = '';
  }

  async function openChat(selectedConnection) {
    const currentLoad = ++loadVersion;
    cleanupRealtime();
    activeConnectionId = selectedConnection.id;
    loadingMessages = true;
    loadError = '';
    draftMessage = '';

    try {
      const res = await fetch(`/api/messages?connection_id=${selectedConnection.id}`, { credentials: 'include' });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.message || payload.error || 'Could not load messages');
      if (currentLoad !== loadVersion) return;

      setConnectionMessages(selectedConnection.id, payload.messages ?? []);
      channel = supabase
        .channel(`connection-chat-${selectedConnection.id}-${Date.now()}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `connection_id=eq.${selectedConnection.id}` }, async (payload) => {
          if (currentLoad !== loadVersion) return;
          appendConnectionMessage(selectedConnection.id, payload.new);
          await queueScroll();
        })
        .subscribe();
      await queueScroll();
    } catch (err) {
      if (currentLoad === loadVersion) loadError = err instanceof Error ? err.message : 'Could not load messages';
    } finally {
      if (currentLoad === loadVersion) loadingMessages = false;
    }
  }

  async function sendMessage() {
    if (!connection?.id || !draftMessage.trim() || sendingMessage) return;
    sendingMessage = true;
    loadError = '';
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ connection_id: connection.id, message: draftMessage.trim() })
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.message || payload.error || 'Could not send message');
      appendConnectionMessage(connection.id, payload.message);
      draftMessage = '';
      await queueScroll();
    } catch (err) {
      toast.error('Could not send message', { description: err instanceof Error ? err.message : 'Please try again.' });
    } finally {
      sendingMessage = false;
    }
  }

  function handleKeydown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  }
</script>

{#if connection}
  <section class="flex min-h-[620px] flex-col overflow-hidden bg-[#101114]">
    <header class="border-b border-white/8 bg-gradient-to-r from-cyan-400/10 via-transparent px-5 py-4">
      <div class="flex items-center gap-3">
        <Avatar class="size-11 border border-white/10 bg-white/5">
          <AvatarImage src={connection.profile?.avatar_url ?? undefined} alt={connection.profile?.display_name ?? 'Connection'} />
          <AvatarFallback class="bg-cyan-400/15 text-cyan-200">{getInitials(connection.profile?.display_name)}</AvatarFallback>
        </Avatar>
        <div class="min-w-0">
          <h2 class="truncate font-semibold text-white">{connection.profile?.display_name ?? 'Connection'}</h2>
          <p class="text-xs text-emerald-300">Connected</p>
        </div>
      </div>
      {#if history.length}
        <div class="mt-3 flex flex-wrap gap-2">
          {#each history as item (item.id)}
            <span class="inline-flex items-center gap-1 rounded-full border border-white/8 bg-white/5 px-2 py-1 text-[11px] text-ink-300">
              {item.event_name}
              {#if item.met_at}<CalendarHeart size={11} class="text-teal-300" /> Met {formatDate(item.met_at)}{/if}
            </span>
          {/each}
        </div>
      {/if}
    </header>

    <div bind:this={messageViewport} class="min-h-0 flex-1 space-y-3 overflow-y-auto bg-[radial-gradient(circle_at_top,#1b2633_0%,#101114_48%)] px-5 py-5">
      {#if loadingMessages}
        <div class="flex h-full items-center justify-center text-sm text-ink-300"><LoaderCircle size={16} class="mr-2 animate-spin" /> Loading conversation</div>
      {:else if loadError}
        <div class="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">{loadError}</div>
      {:else if !messages.length}
        <div class="flex h-full flex-col items-center justify-center text-center text-ink-300">
          <MessageCircle size={28} class="mb-3 text-cyan-300" />
          <p class="font-medium text-white">Start your conversation</p>
          <p class="mt-1 text-sm">Say hello and continue the connection.</p>
        </div>
      {:else}
        {#each messages as message (message.id)}
          <div class={`flex ${message.sender_user_id === currentUserId ? 'justify-end' : 'justify-start'}`}>
            <div class={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm ${message.sender_user_id === currentUserId ? 'rounded-br-md bg-cyan-400 text-slate-950' : 'rounded-bl-md border border-white/10 bg-white/8 text-white'}`}>
              <p class="whitespace-pre-wrap leading-6">{message.message}</p>
              <p class={`mt-1 text-[10px] ${message.sender_user_id === currentUserId ? 'text-slate-950/60' : 'text-ink-400'}`}>{formatTime(message.created_at)}</p>
            </div>
          </div>
        {/each}
      {/if}
    </div>

    <form class="border-t border-white/8 bg-[#151619] p-4" onsubmit={(event) => { event.preventDefault(); void sendMessage(); }}>
      <div class="flex gap-2">
        <Input bind:value={draftMessage} placeholder="Write a message..." disabled={loadingMessages || sendingMessage} onkeydown={handleKeydown} class="h-11 border-white/10 bg-white/5 text-white placeholder:text-ink-500" />
        <Button type="submit" disabled={loadingMessages || sendingMessage || !draftMessage.trim()} class="h-11 px-4">
          {#if sendingMessage}<LoaderCircle size={16} class="animate-spin" />{:else}<Send size={16} />{/if}
          <span class="hidden sm:inline">Send</span>
        </Button>
      </div>
    </form>
  </section>
{/if}
