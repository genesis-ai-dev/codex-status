<script lang="ts">
  import type { DayRollup } from '$lib/types';

  interface Props {
    history: DayRollup[];
    days?: number;
  }

  let { history = [], days = 90 }: Props = $props();

  const segments = $derived(
    Array.from({ length: days }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      const dateStr = d.toISOString().slice(0, 10);
      const rollup = history.find((h) => h.date === dateStr);
      const uptime = rollup?.uptime ?? null;
      return { date: dateStr, uptime };
    })
  );
</script>

<div class="flex gap-px" role="img" aria-label="90-day uptime history">
  {#each segments as seg (seg.date)}
    <div
      class="h-6 min-w-[3px] flex-1 rounded-sm transition-colors"
      class:bg-[var(--codex-teal)]={seg.uptime !== null && seg.uptime >= 99.9}
      class:bg-[var(--codex-gold)]={seg.uptime !== null && seg.uptime >= 95 && seg.uptime < 99.9}
      class:bg-[var(--codex-outage)]={seg.uptime !== null && seg.uptime < 95}
      class:bg-[var(--muted)]={seg.uptime === null}
      title="{seg.date}: {seg.uptime !== null ? seg.uptime.toFixed(1) + '%' : 'No data'}"
    ></div>
  {/each}
</div>
