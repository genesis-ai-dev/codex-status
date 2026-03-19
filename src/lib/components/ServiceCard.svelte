<script lang="ts">
  import UptimeBar from './UptimeBar.svelte';
  import type { ServiceCheck, DayRollup } from '$lib/types';

  interface Props {
    service: ServiceCheck;
    history: DayRollup[];
  }

  let { service, history }: Props = $props();

  const hasData = service.status !== 'unknown';
  const statusLabel = $derived(
    service.status === 'operational'
      ? 'Operational'
      : service.status === 'degraded'
        ? 'Degraded'
        : service.status === 'outage'
          ? 'Outage'
          : 'No data'
  );

  const dotColor = $derived(
    service.status === 'operational'
      ? 'var(--codex-teal)'
      : service.status === 'degraded'
        ? 'var(--codex-gold)'
        : service.status === 'outage'
          ? 'var(--codex-outage)'
          : 'var(--muted-foreground)'
  );
</script>

<div
  class="rounded-lg border border-[var(--border)] bg-[var(--codex-surface)] p-4"
>
  <div class="mb-2 flex items-center justify-between">
    <div class="flex items-center gap-2">
      <span
        class="h-2.5 w-2.5 shrink-0 rounded-full"
        style="background-color: {dotColor}"
        aria-hidden="true"
      ></span>
      <span class="font-[family-name:var(--font-display)] text-lg font-medium">
        {service.name}
      </span>
    </div>
    <span class="text-sm text-[var(--muted-foreground)]">
      {hasData ? `${service.uptimePercent.toFixed(1)}% uptime` : '—'}
    </span>
  </div>
  <p class="mb-3 text-xs text-[var(--muted-foreground)]">
    {statusLabel}
    {#if hasData && service.lastCheck}
      · Last checked {new Date(service.lastCheck).toLocaleString()}
    {:else if !hasData}
      · Monitoring pending
    {/if}
  </p>
  <UptimeBar {history} />
</div>
