<script lang="ts">
  import { onMount } from 'svelte';
  import ServiceCard from '$lib/components/ServiceCard.svelte';
  import IncidentFeed from '$lib/components/IncidentFeed.svelte';
  import type { StatusPayload, ProbePayload } from '$lib/types';

  // Live probe state
  let probe = $state<ProbePayload | null>(null);
  let probeError = $state(false);
  let probeAge = $state<number | null>(null); // seconds since probe ran

  // Historical state
  let history = $state<StatusPayload | null>(null);

  let selectedDate = $state<string | null>(null);

  function handleSegmentClick(date: string) {
    selectedDate = date;
    requestAnimationFrame(() => {
      document.getElementById('incidents')?.scrollIntoView({ behavior: 'smooth' });
    });
  }

  onMount(() => {
    // Run both fetches in parallel — they're independent
    fetch('/api/probe')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((p: ProbePayload) => {
        probe = p;
        probeError = false;
        // Keep the "X seconds ago" counter ticking
        const tick = () => {
          if (!probe) return;
          probeAge = Math.round((Date.now() - new Date(probe.probeTime).getTime()) / 1000);
          setTimeout(tick, 5000);
        };
        tick();
      })
      .catch(() => { probeError = true; });

    fetch('/api/status')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((p: StatusPayload) => { history = p; })
      .catch(() => {});
  });

  const overallStatus = $derived.by(() => {
    if (!probe) return 'loading';
    if (probeError) return 'error';
    if (probe.services.some((s) => s.status === 'outage')) return 'outage';
    if (probe.services.some((s) => s.status === 'degraded')) return 'degraded';
    return 'operational';
  });

  const bannerConfig = $derived(
    overallStatus === 'operational'
      ? { label: 'All Systems Operational', cls: 'border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-300' }
      : overallStatus === 'degraded'
        ? { label: 'Partial Degradation', cls: 'border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-900 dark:bg-yellow-950 dark:text-yellow-300' }
        : overallStatus === 'outage'
          ? { label: 'Service Disruption', cls: 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300' }
          : { label: 'Checking…', cls: 'border-[var(--border)] bg-[var(--muted)] text-[var(--muted-foreground)]' }
  );

  const dotColor = (status: string) =>
    status === 'operational' ? 'var(--status-ok)'
    : status === 'degraded' ? 'var(--status-degraded)'
    : status === 'outage' ? 'var(--status-outage)'
    : 'var(--muted-foreground)';

  const statusLabel = (status: string) =>
    status === 'operational' ? 'Operational'
    : status === 'degraded' ? 'Degraded'
    : status === 'outage' ? 'Outage'
    : 'Checking…';

  const probeAgeLabel = $derived.by(() => {
    if (probeAge === null) return null;
    if (probeAge < 5) return 'just now';
    if (probeAge < 60) return `${probeAge}s ago`;
    return `${Math.round(probeAge / 60)}m ago`;
  });
</script>

<svelte:head>
  <title>Codex Status</title>
  <meta name="description" content="Real-time status for Codex API services." />
</svelte:head>

<div class="mx-auto max-w-2xl px-4 py-12 sm:px-6">
  <header class="mb-10">
    <div class="mb-4 flex items-center gap-3">
      <img src="/codex-logo-2024.svg" alt="Codex" class="h-8 w-8" />
      <h1 class="text-2xl font-semibold tracking-tight">Codex Status</h1>
    </div>
    <p class="text-sm text-[var(--muted-foreground)]">Real-time status for Codex API services</p>
  </header>

  <!-- Live current status -->
  <section class="mb-10">
    <div class="mb-4 flex items-center justify-between">
      <p class="text-xs font-medium uppercase tracking-widest text-[var(--muted-foreground)]">Current Status</p>
      {#if probeAgeLabel}
        <span class="text-xs text-[var(--muted-foreground)]">Checked {probeAgeLabel}</span>
      {/if}
    </div>

    <div class="mb-4 rounded-md border px-4 py-3 text-sm font-medium {bannerConfig.cls}">
      {bannerConfig.label}
    </div>

    {#if probe}
      <ul class="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)]">
        {#each probe.services as svc (svc.id)}
          <li class="flex items-center justify-between px-4 py-3">
            <div class="flex items-center gap-2.5">
              <span
                class="h-2 w-2 shrink-0 rounded-full"
                style="background-color: {dotColor(svc.status)}"
                aria-hidden="true"
              ></span>
              <span class="text-sm">{svc.name}</span>
            </div>
            <div class="flex items-center gap-3">
              {#if svc.ms !== null}
                <span class="text-xs text-[var(--muted-foreground)]">{svc.ms}ms</span>
              {/if}
              <span class="text-xs font-medium" style="color: {dotColor(svc.status)}">
                {statusLabel(svc.status)}
              </span>
            </div>
          </li>
        {/each}
      </ul>
    {:else if probeError}
      <p class="text-sm text-[var(--muted-foreground)]">Live check unavailable.</p>
    {:else}
      <div class="flex items-center gap-2 py-4 text-sm text-[var(--muted-foreground)]">
        <div class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--foreground)]"></div>
        Checking services…
      </div>
    {/if}
  </section>

  <!-- Historical uptime -->
  {#if history}
    <section class="mb-10">
      <p class="mb-3 text-xs font-medium uppercase tracking-widest text-[var(--muted-foreground)]">90-Day Uptime</p>
      <div class="space-y-3">
        {#each (history.services ?? []) as service (service.id)}
          <ServiceCard
            {service}
            history={history.history?.[service.id] ?? []}
            incidents={history.incidents ?? []}
            onSegmentClick={handleSegmentClick}
          />
        {/each}
      </div>
    </section>

    <section class="mb-8">
      <IncidentFeed
        incidents={history.incidents ?? []}
        dateFilter={selectedDate ?? undefined}
        onClearDateFilter={() => (selectedDate = null)}
      />
    </section>

    <p class="text-center text-xs text-[var(--muted-foreground)]">
      History last updated {history.lastUpdated
        ? new Date(history.lastUpdated).toLocaleString(undefined, {
            month: 'short', day: 'numeric', year: 'numeric',
            hour: 'numeric', minute: '2-digit', timeZoneName: 'short'
          })
        : '—'}
    </p>
  {/if}

  <footer class="mt-12 border-t border-[var(--border)] pt-6 text-center text-xs text-[var(--muted-foreground)]">
    <a href="https://codexeditor.app" class="hover:text-[var(--foreground)]">Codex</a>
    <span class="mx-2">·</span>
    <a href="/admin" class="hover:text-[var(--foreground)]">Admin</a>
  </footer>
</div>
