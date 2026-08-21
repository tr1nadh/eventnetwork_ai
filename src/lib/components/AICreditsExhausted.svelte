<script>
  import {
    Sparkles,
    AlertTriangle,
    MessageCircle,
    RotateCcw,
  } from "@lucide/svelte";
  import { aiCreditsStore } from "$lib/stores/ai-credits";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";

  $: open = $aiCreditsStore.creditsExhausted;
  $: resetAt = $aiCreditsStore.resetAt;

  $: resetDateFormatted = resetAt
    ? new Date(resetAt).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "the 1st of next month";

  function dismiss() {
    aiCreditsStore.dismissExhaustedModal();
  }

  function openWhatsApp() {
    window.open(
      "https://wa.me/916300078548?text=Hi%2C%20I%20need%20more%20AI%20credits%20for%20Evenai%20AI.",
      "_blank",
    );
  }
</script>

<Dialog.Root
  bind:open
  onOpenChange={(v) => {
    if (!v) dismiss();
  }}
>
  <Dialog.Content
    class="sm:max-w-md bg-[#0f0f11] border border-white/10 text-white p-0 overflow-hidden"
  >
    <!-- Gradient header -->
    <div
      class="bg-gradient-to-br from-rose-500/20 via-amber-500/10 to-transparent px-6 pt-8 pb-6 text-center"
    >
      <div
        class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/15 border border-rose-500/30"
      >
        <AlertTriangle size={28} class="text-rose-400" />
      </div>
      <Dialog.Header>
        <Dialog.Title class="text-2xl font-black text-white"
          >AI Credits Exhausted</Dialog.Title
        >
        <Dialog.Description class="mt-2 text-sm text-ink-300">
          You've used all <span class="font-bold text-white">50</span> AI credits
          for this month.
        </Dialog.Description>
      </Dialog.Header>
    </div>

    <div class="px-6 pb-6 space-y-4">
      <!-- Auto-reset info -->
      <div
        class="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 flex items-start gap-3"
      >
        <div class="mt-0.5 shrink-0 rounded-full bg-amber-400/10 p-1.5">
          <RotateCcw size={14} class="text-amber-300" />
        </div>
        <div>
          <p class="text-sm font-semibold text-amber-100">
            Auto-resets every month
          </p>
          <p class="mt-1 text-xs leading-5 text-ink-400">
            Your credits will automatically reset to 50 on <span
              class="font-semibold text-ink-300">{resetDateFormatted}</span
            >. No action needed.
          </p>
        </div>
      </div>

      <!-- WhatsApp contact -->
      <div
        class="rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4 flex items-start gap-3"
      >
        <div class="mt-0.5 shrink-0 rounded-full bg-emerald-400/10 p-1.5">
          <MessageCircle size={14} class="text-emerald-300" />
        </div>
        <div>
          <p class="text-sm font-semibold text-emerald-100">
            Need more credits now?
          </p>
          <p class="mt-1 text-xs leading-5 text-ink-400">
            Contact us via WhatsApp at <span class="font-semibold text-ink-300"
              >6300078548</span
            > to request additional credits.
          </p>
        </div>
      </div>

      <!-- Action buttons -->
      <div class="flex flex-col gap-2 pt-2">
        <Button
          class="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
          onclick={openWhatsApp}
        >
          <MessageCircle size={16} />
          Request More on WhatsApp
        </Button>
        <Button
          variant="outline"
          class="w-full border-white/10 text-ink-300 hover:bg-white/10 hover:text-white"
          onclick={dismiss}
        >
          I'll wait for the reset
        </Button>
      </div>
    </div>
  </Dialog.Content>
</Dialog.Root>
