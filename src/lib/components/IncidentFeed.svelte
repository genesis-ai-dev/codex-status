<script lang="ts">
  import type { Incident } from '$lib/types';

  interface Props {
    incidents: Incident[];
    dateFilter?: string;
    onClearDateFilter?: () => void;
  }

  let { incidents = [], dateFilter, onClearDateFilter }: Props = $props();

  function isIncidentActiveOnDate(incident: Incident, date: string): boolean {
    const created = incident.createdAt.slice(0, 10);
    const resolved = incident.resolvedAt?.slice(0, 10) ?? '9999-12-31';
    return created <= date && date <= resolved;
  }

  const filteredIncidents = $derived(
    dateFilter
      ? incidents.filter((i) => isIncidentActiveOnDate(i, dateFilter))
      : incidents
  );

  const statusBadge: Record<Incident['status'], string> = {
    investigating: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400',
    identified: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400',
    monitoring: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400',
    resolved: 'bg-[var(--muted)] text-[var(--muted-foreground)]'
  };

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }
</script>

<div id="incidents" class="scroll-mt-24">
  <div class="mb-3 flex items-center gap-2">
    <p class="text-xs font-medium uppercase tracking-widest text-[var(--muted-foreground)]">
      Incident History
    </p>
    {#if dateFilter}
      <span class="text-xs text-[var(--muted-foreground)]">
        — {new Date(dateFilter + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
      </span>
      {#if onClearDateFilter}
        <button
          type="button"
          class="text-xs text-[var(--muted-foreground)] underline hover:text-[var(--foreground)]"
          onclick={onClearDateFilter}
        >
          Clear
        </button>
      {/if}
    {/if}
  </div>

  {#if filteredIncidents.length === 0}
    <p class="text-sm text-[var(--muted-foreground)]">
      {dateFilter ? 'No incidents on this day.' : 'No incidents in the past 90 days.'}
    </p>
  {:else}
    <ul class="space-y-3">
      {#each filteredIncidents as incident (incident.id)}
        <li class="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
          <div class="mb-1.5 flex items-start justify-between gap-3">
            <span class="text-sm font-medium">{incident.title}</span>
            <span class="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize {statusBadge[incident.status]}">
              {incident.status}
            </span>
          </div>
          <p class="mb-3 text-xs text-[var(--muted-foreground)]">
            {incident.services.join(', ')} · {formatDate(incident.createdAt)}
            {#if incident.resolvedAt}
              · Resolved {formatDate(incident.resolvedAt)}
            {/if}
          </p>
          <div class="space-y-2">
            {#each incident.updates as update (update.timestamp)}
              <div class="border-l-2 border-[var(--border)] pl-3">
                <p class="text-xs text-[var(--muted-foreground)]">
                  {formatDate(update.timestamp)} · <span class="capitalize">{update.status}</span>
                </p>
                <p class="mt-0.5 text-sm">{update.body}</p>
              </div>
            {/each}
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</div>
