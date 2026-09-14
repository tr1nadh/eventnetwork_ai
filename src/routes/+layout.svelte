<script>
  import '../app.css';
  import { Toaster } from '$lib/components/ui/sonner/index.js';
  import NotificationPrompt from '$lib/components/NotificationPrompt.svelte';
</script>

<Toaster />
<NotificationPrompt />
<slot />
