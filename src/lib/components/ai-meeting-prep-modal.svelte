<script>
  import { Sparkles, MessageCircle, HelpCircle, Handshake, LoaderCircle, RefreshCw, X } from '@lucide/svelte';
  import { aiMeetingPrepStore } from '$lib/stores/eventStore';
  import { Button } from '$lib/components/ui/button/index.js';
  import * as Dialog from '$lib/components/ui/dialog/index.js';
  import AmdAiLoading from '$lib/components/amd-ai-loading.svelte';
  import { toast } from '$lib/components/ui/sonner/index.js';
  import { slide, fade } from 'svelte/transition';

  export let open = false;
  export let connection = null;

  let generating = false;
  let generationError = '';

  // Reactive access to the store using the connection.id
  $: prepData = connection?.id ? $aiMeetingPrepStore[connection.id] : null;

  async function generatePrep(regenerate = false) {
    if (!connection?.id || generating) return;
    
    generating = true;
    generationError = '';

    try {
      const url = `/api/meeting-prep?connection_id=${connection.id}${regenerate ? '&regenerate=true' : ''}`;
      const res = await fetch(url);
      
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to generate Meeting Prep');
      }

      const data = await res.json();
      
      // Update store
      aiMeetingPrepStore.update(store => {
        return {
          ...store,
          [connection.id]: data
        };
      });
      
      toast.success(regenerate ? 'Meeting Prep regenerated' : 'Meeting Prep generated successfully');
    } catch (err) {
      generationError = err.message || 'An unexpected error occurred';
      toast.error('Generation Failed', { description: generationError });
    } finally {
      generating = false;
    }
  }

</script>

<Dialog.Root bind:open>
  <Dialog.Content class="sm:max-w-2xl bg-[#0f0f11] border border-white/10 text-white p-0 max-h-[85vh] flex flex-col overflow-hidden">
    <Dialog.Header class="border-b border-white/8 bg-gradient-to-r from-amber-400/10 via-transparent to-transparent px-6 py-5 shrink-0">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="h-10 w-10 rounded-full bg-amber-400/10 border border-amber-400/20 flex items-center justify-center">
            <Sparkles size={20} class="text-amber-300" />
          </div>
          <div>
            <Dialog.Title class="text-xl font-bold text-white flex items-center gap-2">
              AI Meeting Prep
            </Dialog.Title>
            <Dialog.Description class="mt-0.5 text-sm text-ink-300">
              Prepare for your meeting with {connection?.profile?.display_name || 'your connection'}
            </Dialog.Description>
          </div>
        </div>
      </div>
    </Dialog.Header>

    <div class="flex-1 overflow-y-auto px-6 py-6">
      {#if generating}
        <div class="flex flex-col items-center justify-center py-12" in:fade>
          <AmdAiLoading
            message="Generating your AI Meeting Prep..."
            detail="Creating personalized conversation starters and analyzing collaboration opportunities."
          />
        </div>
      {:else if prepData}
        <div class="space-y-6" in:slide={{ duration: 300 }}>
          <!-- Conversation Starters -->
          <div class="glass rounded-2xl border border-white/8 p-5">
            <div class="flex items-center gap-2 mb-4">
              <MessageCircle size={18} class="text-cyan-400" />
              <h3 class="text-lg font-bold text-white">Conversation Starters</h3>
            </div>
            <ul class="space-y-3">
              {#each prepData.conversation_starters as starter}
                <li class="flex items-start gap-3 bg-white/5 rounded-xl p-3 border border-white/5">
                  <span class="text-cyan-400 mt-0.5">•</span>
                  <span class="text-sm text-ink-200 leading-relaxed">{starter}</span>
                </li>
              {/each}
            </ul>
          </div>

          <!-- Questions to Ask -->
          <div class="glass rounded-2xl border border-white/8 p-5">
            <div class="flex items-center gap-2 mb-4">
              <HelpCircle size={18} class="text-purple-400" />
              <h3 class="text-lg font-bold text-white">Questions to Ask</h3>
            </div>
            <ul class="space-y-3">
              {#each prepData.questions_to_ask as question}
                <li class="flex items-start gap-3 bg-white/5 rounded-xl p-3 border border-white/5">
                  <span class="text-purple-400 mt-0.5">?</span>
                  <span class="text-sm text-ink-200 leading-relaxed">{question}</span>
                </li>
              {/each}
            </ul>
          </div>

          <!-- Collaboration Opportunity -->
          <div class="glass rounded-2xl border border-amber-400/20 bg-amber-400/5 p-5">
            <div class="flex items-center gap-2 mb-3">
              <Handshake size={18} class="text-amber-400" />
              <h3 class="text-lg font-bold text-white">Collaboration Opportunity</h3>
            </div>
            <p class="text-sm leading-relaxed text-ink-200">
              {prepData.collaboration_opportunity}
            </p>
          </div>
        </div>
      {:else}
        <!-- Empty State -->
        <div class="flex flex-col items-center justify-center py-12 text-center" in:fade>
          <div class="h-16 w-16 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mb-5">
            <Sparkles size={28} class="text-amber-400" />
          </div>
          <h3 class="text-xl font-bold text-white mb-2">Prepare Yourself</h3>
          <p class="text-sm text-ink-300 max-w-md mx-auto mb-8 leading-relaxed">
            Generate personalized conversation starters, questions, and collaboration opportunities based on both networking profiles and your AI match.
          </p>
          <Button 
            class="gap-2 bg-amber-500 hover:bg-amber-600 text-black px-8 py-6 rounded-xl font-bold transition-all hover:scale-105" 
            onclick={() => generatePrep(false)}
          >
            <Sparkles size={18} />
            Generate AI Meeting Prep
          </Button>
          {#if generationError}
            <p class="mt-4 text-sm text-red-400">{generationError}</p>
          {/if}
        </div>
      {/if}
    </div>

    <!-- Footer for regeneration (only show if we have data) -->
    {#if prepData && !generating}
      <div class="border-t border-white/8 px-6 py-4 bg-black/20 shrink-0 flex justify-end" in:fade>
        <Button variant="outline" class="gap-2 border-white/10 text-white hover:bg-white/10" onclick={() => generatePrep(true)}>
          <RefreshCw size={15} />
          Regenerate
        </Button>
      </div>
    {/if}
  </Dialog.Content>
</Dialog.Root>
