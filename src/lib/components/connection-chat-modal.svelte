<script>
  import { tick, onDestroy } from 'svelte';
  import { MessageCircle, LoaderCircle, Send } from '@lucide/svelte';
  import { createSupabaseBrowserClient } from '$lib/supabase/client';
  import { chatMessagesStore, setConnectionMessages, appendConnectionMessage } from '$lib/stores/chatStore';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Input } from '$lib/components/ui/input/index.js';
  import * as Dialog from '$lib/components/ui/dialog/index.js';
  import { Avatar, AvatarFallback, AvatarImage } from '$lib/components/ui/avatar/index.js';
  import { toast } from '$lib/components/ui/sonner/index.js';

  export let open = false;
  export let connection = null;
  export let currentUserId = null;

  const supabase = createSupabaseBrowserClient();

  let draftMessage = '';
  let loadingMessages = false;
  let sendingMessage = false;
  let loadError = '';
  let messageViewport;
  let activeConnectionId = null;
  let channel = null;
  let loadVersion = 0;

  const timeFormatter = new Intl.DateTimeFormat([], {
    hour: 'numeric',
    minute: '2-digit'
  });

  $: messages = connection?.id ? ($chatMessagesStore[connection.id] ?? []) : [];
  $: isAcceptedConnection = connection?.status === 'accepted';

  $: if (open && connection?.id && connection.id !== activeConnectionId) {
    void openChat(connection);
  }

  $: if ((!open || !connection?.id) && activeConnectionId) {
    loadVersion += 1;
    cleanupRealtime();
    activeConnectionId = null;
    loadingMessages = false;
    sendingMessage = false;
    loadError = '';
    draftMessage = '';
  }

  $: if (open && connection?.id && !loadingMessages) {
    void queueScroll();
  }

  onDestroy(() => {
    cleanupRealtime();
  });

  function getInitials(name) {
    return (name ?? 'U')
      .split(' ')
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  function formatTime(value) {
    if (!value) {
      return '';
    }

    return timeFormatter.format(new Date(value));
  }

  function scrollToLatest() {
    if (!messageViewport) {
      return;
    }

    messageViewport.scrollTop = messageViewport.scrollHeight;
  }

  async function queueScroll() {
    await tick();
    scrollToLatest();
  }

  function cleanupRealtime() {
    if (channel) {
      supabase.removeChannel(channel);
      channel = null;
    }
  }

  async function openChat(selectedConnection) {
    const currentLoad = ++loadVersion;

    if (selectedConnection.status !== 'accepted') {
      cleanupRealtime();
      activeConnectionId = null;
      loadingMessages = false;
      sendingMessage = false;
      draftMessage = '';
      loadError = 'Chat is only available for accepted connections.';
      return;
    }

    cleanupRealtime();
    activeConnectionId = selectedConnection.id;
    loadingMessages = true;
    loadError = '';
    draftMessage = '';

    try {
      const res = await fetch(`/api/messages?connection_id=${selectedConnection.id}`, {
        credentials: 'include'
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload.message || payload.error || 'Could not load messages');
      }

      if (currentLoad !== loadVersion) {
        return;
      }

      setConnectionMessages(selectedConnection.id, payload.messages ?? []);
      subscribeToMessages(selectedConnection.id, currentLoad);
      await queueScroll();
    } catch (err) {
      if (currentLoad !== loadVersion) {
        return;
      }

      loadError = err instanceof Error ? err.message : 'Could not load messages';
    } finally {
      if (currentLoad === loadVersion) {
        loadingMessages = false;
      }
    }
  }

  function subscribeToMessages(connectionId, currentLoad) {
    channel = supabase
      .channel(`chat-${connectionId}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `connection_id=eq.${connectionId}`
        },
        async (payload) => {
          if (currentLoad !== loadVersion) {
            return;
          }

          appendConnectionMessage(connectionId, payload.new);
          await queueScroll();
        }
      )
      .subscribe();
  }

  async function sendMessage() {
    if (!connection?.id || !draftMessage.trim() || sendingMessage || !isAcceptedConnection) {
      return;
    }

    sendingMessage = true;
    loadError = '';

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          connection_id: connection.id,
          message: draftMessage
        })
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload.message || payload.error || 'Could not send message');
      }

      appendConnectionMessage(connection.id, payload.message);
      draftMessage = '';
      await queueScroll();
    } catch (err) {
      toast.error('Could not send message', {
        description: err instanceof Error ? err.message : 'Please try again.'
      });
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

<Dialog.Root bind:open>
  <Dialog.Content class="flex h-[88vh] max-h-[760px] w-[min(92vw,720px)] flex-col overflow-hidden border border-white/10 bg-[#0f0f11] p-0 text-white">
    <Dialog.Header class="border-b border-white/8 bg-gradient-to-r from-cyan-400/10 via-transparent to-transparent px-6 py-5">
      <div class="flex items-center gap-4">
        <Avatar size="lg" class="size-12 border border-white/10 bg-white/5">
          <AvatarImage src={connection?.profile?.avatar_url ?? undefined} alt={connection?.profile?.display_name ?? 'Connection'} />
          <AvatarFallback class="bg-cyan-400/15 text-cyan-200">
            {getInitials(connection?.profile?.display_name)}
          </AvatarFallback>
        </Avatar>
        <div>
          <Dialog.Title class="text-xl font-bold text-white">
            {connection?.profile?.display_name ?? 'Connection'}
          </Dialog.Title>
          <Dialog.Description class="mt-1 text-sm text-emerald-300">
            Connected
          </Dialog.Description>
        </div>
      </div>
    </Dialog.Header>

    <div class="flex min-h-0 flex-1 flex-col">
      <div bind:this={messageViewport} class="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
        {#if loadingMessages}
          <div class="flex h-full items-center justify-center">
            <div class="flex items-center gap-3 rounded-full border border-white/8 bg-white/5 px-4 py-2 text-sm text-ink-300">
              <LoaderCircle size={16} class="animate-spin" />
              Loading conversation
            </div>
          </div>
        {:else if loadError}
          <div class="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
            {loadError}
          </div>
        {:else if !messages.length}
          <div class="flex h-full items-center justify-center">
            <div class="max-w-md rounded-3xl border border-white/8 bg-white/5 px-6 py-8 text-center">
              <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10">
                <MessageCircle size={20} class="text-cyan-300" />
              </div>
              <p class="text-lg font-semibold text-white">Start your conversation.</p>
              <p class="mt-2 text-sm leading-6 text-ink-300">
                You connected because your networking goals aligned.
              </p>
              <p class="mt-1 text-sm leading-6 text-ink-300">Say hello</p>
            </div>
          </div>
        {:else}
          {#each messages as message (message.id)}
            <div class={`flex ${message.sender_user_id === currentUserId ? 'justify-end' : 'justify-start'}`}>
              <div class={`max-w-[82%] rounded-3xl px-4 py-3 shadow-sm ${
                message.sender_user_id === currentUserId
                  ? 'rounded-br-md bg-cyan-400 text-black'
                  : 'rounded-bl-md border border-white/10 bg-white/6 text-white'
              }`}>
                <p class="whitespace-pre-wrap text-sm leading-6">{message.message}</p>
                <p class={`mt-2 text-[11px] ${
                  message.sender_user_id === currentUserId ? 'text-black/65' : 'text-ink-400'
                }`}>
                  {formatTime(message.created_at)}
                </p>
              </div>
            </div>
          {/each}
        {/if}
      </div>

      <div class="border-t border-white/8 px-6 py-4">
        <div class="flex items-center gap-3">
          <Input
            bind:value={draftMessage}
            placeholder="Write a message..."
            class="h-11 border-white/10 bg-white/5 text-white placeholder:text-ink-500 focus:border-cyan-400/40 focus:ring-cyan-400/20"
            disabled={!isAcceptedConnection || loadingMessages || sendingMessage}
            onkeydown={handleKeydown}
          />
          <Button
            class="h-11 gap-2 px-4"
            onclick={sendMessage}
            disabled={!isAcceptedConnection || loadingMessages || sendingMessage || !draftMessage.trim()}
          >
            {#if sendingMessage}
              <LoaderCircle size={16} class="animate-spin" />
            {:else}
              <Send size={16} />
            {/if}
            Send
          </Button>
        </div>
      </div>
    </div>
  </Dialog.Content>
</Dialog.Root>
