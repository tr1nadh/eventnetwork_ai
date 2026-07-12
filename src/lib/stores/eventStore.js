import { writable } from 'svelte/store';
import { persisted } from 'svelte-persisted-store';

// Persisted active tab across page visits for a single event.
export const activeTab = persisted('event-active-tab', 'details');

// Matches data – fetch from API; we keep it in memory (no persistence across reloads).
export const matchesStore = writable([]);

// Placeholder for future connections data.
export const connectionsStore = writable([]);
