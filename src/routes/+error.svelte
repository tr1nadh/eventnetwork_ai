<script>
  import { page } from "$app/stores";
  import { Sparkles, ArrowLeft, Calendar, Compass, AlertCircle } from "@lucide/svelte";
  import { Button } from "$lib/components/ui/button/index.js";
  import PageShell from "$lib/components/page-shell.svelte";

  $: status = $page?.status ?? 404;
  $: message = $page?.error?.message ?? "The requested page or event could not be found.";
</script>

<svelte:head>
  <title>{status} • Evenai</title>
</svelte:head>

<PageShell hasSidebar={false}>
  <main class="mx-auto max-w-3xl px-4 py-16 sm:py-24 text-center space-y-8 animate-fade-in">
    <!-- Decorative Icon -->
    <div class="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-white/10 bg-white/4 text-amber-400 shadow-glow">
      {#if status === 404}
        <Compass size={36} />
      {:else}
        <AlertCircle size={36} class="text-rose-400" />
      {/if}
    </div>

    <!-- Error Code & Title -->
    <div class="space-y-3">
      <span class="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-mono font-bold uppercase tracking-widest text-ink-400">
        Status {status}
      </span>
      <h1 class="text-3xl sm:text-5xl font-black tracking-tight text-white">
        {#if status === 404}
          Event Not Found
        {:else}
          Something Went Wrong
        {/if}
      </h1>
      <p class="mx-auto max-w-md text-sm sm:text-base leading-relaxed text-ink-300">
        {#if status === 404}
          The event you are looking for does not exist, may have been removed, or the link might be misspelled.
        {:else}
          {message}
        {/if}
      </p>
    </div>

    <!-- Action Buttons -->
    <div class="flex flex-wrap items-center justify-center gap-3 pt-2">
      <Button
        href="/"
        class="h-11 px-6 gap-2 text-sm font-semibold bg-primary text-primary-foreground transition-all"
      >
        <ArrowLeft size={16} />
        Back to Home
      </Button>
    </div>
  </main>
</PageShell>
