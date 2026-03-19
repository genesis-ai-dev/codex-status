<script lang="ts">
  import UptimeBar from './UptimeBar.svelte';
  import type { ServiceCheck, DayRollup, Incident } from '$lib/types';

  interface Props {
    service: ServiceCheck;
    history: DayRollup[];
    incidents?: Incident[];
    onSegmentClick?: (date: string) => void;
  }

  let { service, history, incidents = [], onSegmentClick }: Props = $props();

  const hasData = history.length > 0;

  const uptimePercent = $derived.by(() => {
    if (!hasData) return null;
    const sum = history.reduce((acc, d) => acc + d.uptime, 0);
    return sum / history.length;
  });
</script>

<div class="rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-3">
  <div class="mb-2 flex items-center justify-between">
    <span class="text-sm font-medium">{service.name}</span>
    <span class="text-xs text-[var(--muted-foreground)]">
      {uptimePercent !== null ? `${uptimePercent.toFixed(2)}% uptime` : 'No data'}
    </span>
  </div>
  {#if hasData}
    <UptimeBar
      {history}
      {incidents}
      {onSegmentClick}
      todayUptime={null}
    />
  {:else}
    <p class="text-xs text-[var(--muted-foreground)]">No history yet</p>
  {/if}
</div>
