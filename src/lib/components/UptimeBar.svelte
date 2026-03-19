<script lang="ts">
  import type { DayRollup, Incident } from '$lib/types';

  interface Props {
    history: DayRollup[];
    incidents?: Incident[];
    onSegmentClick?: (date: string) => void;
    /** Include today's live uptime when today isn't in history yet */
    todayUptime?: number | null;
  }

  let { history = [], incidents = [], onSegmentClick, todayUptime }: Props = $props();

  const today = $derived(new Date().toISOString().slice(0, 10));

  function isIncidentActiveOnDate(incident: Incident, date: string): boolean {
    const created = incident.createdAt.slice(0, 10);
    const resolved = incident.resolvedAt?.slice(0, 10) ?? '9999-12-31';
    return created <= date && date <= resolved;
  }

  const segments = $derived.by(() => {
    const hasTodayInHistory = history.some((h) => h.date === today);
    const base = [...history]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((rollup) => {
        const issuesOnDate = incidents.filter((i) =>
          isIncidentActiveOnDate(i, rollup.date)
        ).length;
        return {
          date: rollup.date,
          uptime: rollup.uptime,
          issuesCount: issuesOnDate
        };
      });
    if (!hasTodayInHistory && todayUptime != null && !Number.isNaN(todayUptime)) {
      const issuesToday = incidents.filter((i) =>
        isIncidentActiveOnDate(i, today)
      ).length;
      return [
        ...base,
        { date: today, uptime: todayUptime, issuesCount: issuesToday }
      ].sort((a, b) => a.date.localeCompare(b.date));
    }
    return base;
  });

  function formatDateLabel(dateStr: string): string {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  function getTooltip(seg: (typeof segments)[0]): string {
    const dateLabel = formatDateLabel(seg.date);
    const uptimeStr =
      seg.uptime !== undefined
        ? `${seg.uptime.toFixed(1)}% uptime`
        : 'No data';
    const issuesStr =
      seg.issuesCount > 0
        ? `${seg.issuesCount} incident${seg.issuesCount > 1 ? 's' : ''}`
        : 'No issues';
    return `${dateLabel} · ${uptimeStr} · ${issuesStr}`;
  }
</script>

<div class="flex gap-px" role="img" aria-label="Uptime history">
  {#each segments as seg (seg.date)}
    <button
      type="button"
      class="h-6 min-w-[4px] flex-1 rounded-sm transition-colors hover:ring-2 hover:ring-[var(--codex-teal)] hover:ring-offset-1 hover:ring-offset-[var(--codex-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--codex-teal)]"
      class:bg-[var(--codex-teal)]={seg.uptime >= 99.9}
      class:bg-[var(--codex-gold)]={seg.uptime >= 95 && seg.uptime < 99.9}
      class:bg-[var(--codex-outage)]={seg.uptime < 95}
      class:cursor-pointer={!!onSegmentClick}
      class:cursor-default={!onSegmentClick}
      title={getTooltip(seg)}
      onclick={() => onSegmentClick?.(seg.date)}
    >
      <span class="sr-only">{getTooltip(seg)}</span>
    </button>
  {/each}
</div>

{#if segments.length === 0}
  <p class="text-xs text-[var(--muted-foreground)]">No data yet</p>
{/if}
