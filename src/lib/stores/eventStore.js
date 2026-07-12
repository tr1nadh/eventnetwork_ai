import { writable } from 'svelte/store';
import { persisted } from 'svelte-persisted-store';

// Persisted active tab across page visits for a single event.
export const activeTab = persisted('event-active-tab', 'details');

// Matches data – fetched from API, kept in persisted store
export const matchesStore = persisted('event-matches', []);

// Connections data - kept in persisted store
export const connectionsStore = persisted('event-connections', []);
