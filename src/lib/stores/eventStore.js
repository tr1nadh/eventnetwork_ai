import { writable } from 'svelte/store';
import { persisted } from 'svelte-persisted-store';

// Persisted active tab across page visits for a single event.
export const activeTab = persisted('event-active-tab', 'details');

// Matches data – fetched from API, kept in persisted store
export const matchesStore = persisted('event-matches', []);

// Connections data - kept in persisted store
export const connectionsStore = persisted('event-connections', []);

// AI Meeting Prep cache - maps connection_id to generated meeting prep data
export const aiMeetingPrepStore = persisted('event-ai-meeting-prep', {});

// Cached list of events for the /events page
export const myEventsStore = persisted('my-events', []);

export function clearAllEventStores() {
  activeTab.set('details');
  matchesStore.set([]);
  connectionsStore.set([]);
  aiMeetingPrepStore.set({});
  myEventsStore.set([]);
}
