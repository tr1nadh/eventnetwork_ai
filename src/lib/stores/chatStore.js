import { persisted } from 'svelte-persisted-store';

export const chatMessagesStore = persisted('event-chat-messages', {});

function normalizeMessages(messages) {
  return [...messages]
    .filter(Boolean)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}

export function setConnectionMessages(connectionId, messages) {
  chatMessagesStore.update((existing) => ({
    ...existing,
    [connectionId]: normalizeMessages(messages)
  }));
}

export function appendConnectionMessage(connectionId, message) {
  if (!message?.id) {
    return;
  }

  chatMessagesStore.update((existing) => {
    const current = existing[connectionId] ?? [];
    if (current.some((entry) => entry.id === message.id)) {
      return existing;
    }

    return {
      ...existing,
      [connectionId]: normalizeMessages([...current, message])
    };
  });
}
