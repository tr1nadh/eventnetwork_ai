<script>
  import { tick, onDestroy } from 'svelte';
  import { MessageCircle, LoaderCircle, Send, Sparkles } from '@lucide/svelte';
  import { createSupabaseBrowserClient } from '$lib/supabase/client';
  import {
    chatMessagesStore,
    icebreakersStore,
    setConnectionMessages,
    appendConnectionMessage,
    setConnectionIcebreakers
  } from '$lib/stores/chatStore';
  import { aiCreditsStore } from '$lib/stores/ai-credits';
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
  let messageInput;
  let icebreakerDialogOpen = false;
  let icebreakerConfirmOpen = false;
  let generatingIcebreakers = false;
  let icebreakerError = '';

  const timeFormatter = new Intl.DateTimeFormat([], {
    hour: 'numeric',
    minute: '2-digit'
  });

  $: messages = connection?.id ? ($chatMessagesStore[connection.id] ?? []) : [];
  $: isAcceptedConnection = connection?.status === 'accepted';
  $: icebreakerData = connection?.id ? ($icebreakersStore[connection.id] ?? null) : null;

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
    icebreakerDialogOpen = false;
    icebreakerConfirmOpen = false;
    icebreakerError = '';
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

  function openIcebreakers() {
    if (!isAcceptedConnection) return;
    icebreakerError = '';
    icebreakerConfirmOpen = !icebreakerData?.questions?.length;
    icebreakerDialogOpen = true;
  }

  function cancelIcebreakerConfirmation() {
    if (icebreakerData?.questions?.length) {
      icebreakerConfirmOpen = false;
      return;
    }

    icebreakerDialogOpen = false;
  }

  async function generateIcebreakers() {
    if (!connection?.id || generatingIcebreakers) return;

    generatingIcebreakers = true;
    icebreakerError = '';

    try {
      const res = await fetch('/api/icebreakers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ connection_id: connection.id })
      });
      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 429 && payload.error === 'MONTHLY_AI_LIMIT_EXCEEDED') {
          aiCreditsStore.showExhaustedModal();
          icebreakerDialogOpen = false;
          return;
        }
        throw new Error(payload.message || payload.error || 'Could not generate icebreakers');
      }

      setConnectionIcebreakers(connection.id, payload.questions ?? []);
      aiCreditsStore.useCredit();
      icebreakerConfirmOpen = false;
      toast.success('Icebreakers generated');
    } catch (err) {
      icebreakerError = err instanceof Error ? err.message : 'Could not generate icebreakers';
    } finally {
      generatingIcebreakers = false;
    }
  }

  async function selectIcebreaker(question) {
    draftMessage = question;
    icebreakerDialogOpen = false;
    await tick();
    messageInput?.focus();
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="flex h-[88vh] max-h-[760px] w-[min(92vw,720px)] flex-col overflow-hidden border border-white/10 bg-[#0f0f11] p-0 text-white">
    <Dialog.Header class="border-b border-white/8 bg-gradient-to-r from-cyan-400/10 via-transparent to-transparent px-6 py-5">
      <div class="flex items-center justify-between gap-4">
        <div class="flex min-w-0 items-center gap-4">
          <Avatar size="lg" class="size-12 border border-white/10 bg-white/5">
            <AvatarImage src={connection?.profile?.avatar_url ?? undefined} alt={connection?.profile?.display_name ?? 'Connection'} />
            <AvatarFallback class="bg-cyan-400/15 text-cyan-200">
              {getInitials(connection?.profile?.display_name)}
            </AvatarFallback>
          </Avatar>
          <div class="min-w-0">
            <Dialog.Title class="truncate text-xl font-bold text-white">
              {connection?.profile?.display_name ?? 'Connection'}
            </Dialog.Title>
            <Dialog.Description class="mt-1 text-sm text-emerald-300">
              Connected
            </Dialog.Description>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          class="shrink-0 gap-1.5 border-amber-400/25 bg-amber-400/8 text-amber-200 hover:bg-amber-400/15 hover:text-amber-100"
          onclick={openIcebreakers}
          disabled={!isAcceptedConnection}
        >
          <Sparkles size={14} />
          <span class="hidden sm:inline">Generate icebreakers</span>
          <span class="sm:hidden">Icebreakers</span>
        </Button>
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
            bind:this={messageInput}
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
            <span class="hidden sm:inline">Send</span>
          </Button>
        </div>
      </div>
    </div>
  </Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={icebreakerDialogOpen}>
  <Dialog.Content class="w-[min(92vw,560px)] border border-white/10 bg-[#0f0f11] text-white">
    <Dialog.Header>
      <div class="flex items-center gap-3">
        <div class="flex size-10 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-400/10">
          <Sparkles size={18} class="text-amber-300" />
        </div>
        <div>
          <Dialog.Title class="text-lg font-bold">AI icebreakers</Dialog.Title>
          <Dialog.Description class="mt-1 text-sm text-ink-300">
            Personalized prompts for your conversation with {connection?.profile?.display_name ?? 'this connection'}.
          </Dialog.Description>
        </div>
      </div>
    </Dialog.Header>

    {#if generatingIcebreakers}
      <div class="flex flex-col items-center gap-3 py-10 text-center">
        <LoaderCircle size={24} class="animate-spin text-amber-300" />
        <p class="text-sm text-ink-300">Creating conversation starters…</p>
      </div>
    {:else if icebreakerConfirmOpen}
      <div class="space-y-5 pt-4">
        <p class="text-sm leading-6 text-ink-300">
          {icebreakerData?.questions?.length
            ? 'Generate a fresh set of icebreakers?'
            : 'Generate personalized icebreakers from both of your networking profiles?'}
          This uses <span class="font-semibold text-amber-200">1 AI credit</span>.
        </p>
        {#if icebreakerError}
          <p class="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">{icebreakerError}</p>
        {/if}
        <div class="flex justify-end gap-3">
          <Button variant="outline" onclick={cancelIcebreakerConfirmation}>Cancel</Button>
          <Button class="gap-2 bg-amber-400 text-slate-950 hover:bg-amber-300" onclick={generateIcebreakers}>
            <Sparkles size={15} /> Generate for 1 credit
          </Button>
        </div>
      </div>
    {:else if icebreakerData?.questions?.length}
      <div class="space-y-3 pt-4">
        <p class="text-sm text-ink-300">Select a question to add it to your message.</p>
        {#each icebreakerData.questions as question}
          <button
            type="button"
            class="w-full rounded-xl border border-white/8 bg-white/5 p-3 text-left text-sm leading-6 text-ink-200 transition hover:border-cyan-400/30 hover:bg-cyan-400/8 hover:text-white"
            onclick={() => selectIcebreaker(question)}
          >
            {question}
          </button>
        {/each}
        <div class="flex justify-end pt-2">
          <Button variant="outline" size="sm" class="gap-1.5 border-white/10 text-ink-300 hover:text-white" onclick={() => (icebreakerConfirmOpen = true)}>
            <Sparkles size={14} /> Regenerate · 1 credit
          </Button>
        </div>
      </div>
    {/if}
  </Dialog.Content>
</Dialog.Root>
