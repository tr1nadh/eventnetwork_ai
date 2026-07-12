<script>
  import { Users, CheckCircle2, XCircle, CalendarHeart } from '@lucide/svelte';

  export let title = '';
  export let message = '';
  export let type = 'request'; // 'request' | 'accepted' | 'rejected' | 'met'

  const icons = {
    request: Users,
    accepted: CheckCircle2,
    rejected: XCircle,
    met: CalendarHeart
  };

  const colors = {
    request: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
    accepted: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    rejected: 'text-red-400 bg-red-400/10 border-red-400/20',
    met: 'text-amber-400 bg-amber-400/10 border-amber-400/20'
  };

  $: Icon = icons[type] || Users;
  $: colorClass = colors[type] || colors.request;
</script>

<div class="flex items-start gap-4 w-full p-4 rounded-xl border border-white/10 bg-[#161618] shadow-lg overflow-hidden relative group">
  <div class="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
  
  <div class={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border ${colorClass}`}>
    <svelte:component this={Icon} size={20} />
  </div>
  
  <div class="flex-1 min-w-0 flex flex-col justify-center min-h-[2.5rem]">
    <h4 class="text-sm font-bold text-white mb-0.5 truncate">{title}</h4>
    <p class="text-xs text-ink-300 line-clamp-2 leading-relaxed">{message}</p>
  </div>
</div>
