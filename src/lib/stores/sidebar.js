import { writable } from 'svelte/store';
import { browser } from '$app/environment';

const stored = browser ? localStorage.getItem('sidebar-collapsed') === 'true' : false;

export const sidebarCollapsed = writable(stored);

if (browser) {
  sidebarCollapsed.subscribe((v) => {
    localStorage.setItem('sidebar-collapsed', String(v));
  });
}
