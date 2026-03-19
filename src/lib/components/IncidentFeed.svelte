<script lang="ts">
  import type { Incident } from '$lib/types';

  interface Props {
    incidents: Incident[];
  }

  let { incidents = [] }: Props = $props();

  const statusColors: Record<Incident['status'], string> = {
    investigating: 'bg-[var(--codex-gold)] text-[var(--codex-deep)]',
    identified: 'bg-[var(--codex-gold)] text-[var(--codex-deep)]',
    monitoring: 'bg-[var(--codex-teal)]/20 text-[var(--codex-teal)]',
    resolved: 'bg-[var(--muted)] text-[var(--muted-foreground)]'
  };

  function formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }
</script>

<div class="space-y-4">
  <h2 class="font-[family-name:var(--font-display)] text-xl font-semibold">
    Incident History
  </h2>
  {#if incidents.length === 0}
    <p class="text-sm text-[var(--muted-foreground)]">
      No incidents in the past 90 days.
    </p>
  {:else}
    <ul class="space-y-4">
      {#each incidents as incident (incident.id)}
        <li
          class="rounded-lg border border-[var(--border)] bg-[var(--codex-surface)] p-4"
        >
          <div class="mb-2 flex items-center justify-between gap-2">
            <span class="font-medium">{incident.title}</span>
            <span
              class="rounded px-2 py-0.5 text-xs font-medium capitalize {statusColors[incident.status]}"
            >
              {incident.status}
            </span>
          </div>
          <p class="mb-2 text-xs text-[var(--muted-foreground)]">
            {incident.services.join(', ')} · {formatDate(incident.createdAt)}
            {#if incident.resolvedAt}
              · Resolved {formatDate(incident.resolvedAt)}
            {/if}
          </p>
          <div class="space-y-2">
            {#each incident.updates as update (update.timestamp)}
              <div class="border-l-2 border-[var(--muted)] pl-3 text-sm">
                <span class="text-xs text-[var(--muted-foreground)]">
                  {formatDate(update.timestamp)} · {update.status}
                </span>
                <p class="mt-0.5">{update.body}</p>
              </div>
            {/each}
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</div>
