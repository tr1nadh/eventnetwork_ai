import { writable } from 'svelte/store';

function createAiCreditsStore() {
  const { subscribe, set, update } = writable({
    limit: 10,
    used: 0,
    remaining: 10,
    resetAt: null,
    loading: true,
    error: null,
    creditsExhausted: false
  });

  let inFlight;
  let activeUserId;
  let generation = 0;

  return {
    subscribe,
    /**
     * Fetch the current credit status from the server
     */
    fetchStatus: (userId) => {
      if (inFlight && activeUserId === userId) return inFlight;
      activeUserId = userId;
      const requestGeneration = ++generation;
      inFlight = (async () => {
        update(s => ({ ...s, loading: true, error: null }));
        try {
          const res = await fetch('/api/ai/credits');
          if (!res.ok) {
            throw new Error('Failed to fetch AI credits');
          }
          const data = await res.json();
          if (requestGeneration !== generation) return;
          set({
            limit: data.limit,
            used: data.used,
            remaining: data.remaining,
            resetAt: data.resetAt,
            loading: false,
            error: null,
            creditsExhausted: false
          });
        } catch (err) {
          console.error(err);
          if (requestGeneration === generation) update(s => ({ ...s, loading: false, error: err.message }));
        } finally {
          if (requestGeneration === generation) inFlight = undefined;
        }
      })();
      return inFlight;
    },
    
    /**
     * Manually deduct a credit after a successful AI operation
     */
    useCredit: () => {
      update(s => {
        if (s.remaining > 0) {
          const newRemaining = s.remaining - 1;
          return {
            ...s,
            used: s.used + 1,
            remaining: newRemaining,
            creditsExhausted: newRemaining <= 0
          };
        }
        return s;
      });
    },

    /**
     * Show the credits exhausted modal
     */
    showExhaustedModal: () => {
      update(s => ({ ...s, creditsExhausted: true }));
    },

    /**
     * Dismiss the credits exhausted modal
     */
    dismissExhaustedModal: () => {
      update(s => ({ ...s, creditsExhausted: false }));
    }
  };
}

export const aiCreditsStore = createAiCreditsStore();
