<script lang="ts">
  import { onMount } from 'svelte';
  import ServiceCard from '$lib/components/ServiceCard.svelte';
  import IncidentFeed from '$lib/components/IncidentFeed.svelte';
  import type { StatusPayload } from '$lib/types';

  let data = $state<StatusPayload | null>(null);
  let error = $state<string | null>(null);

  onMount(() => {
    fetch('/api/status')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.statusText))))
      .then((payload: StatusPayload) => {
        data = payload;
        error = null;
      })
      .catch((e) => {
        error = e.message || 'Failed to load status';
        data = null;
      });
  });

  const overallStatus = $derived.by(() => {
    if (!data) return 'loading';
    const services = data.services ?? [];
    const hasData = services.some((s) => s.status !== 'unknown');
    if (!hasData) return 'no-data';
    const hasOutage = services.some((s) => s.status === 'outage');
    const hasDegraded = services.some((s) => s.status === 'degraded');
    if (hasOutage) return 'outage';
    if (hasDegraded) return 'degraded';
    return 'operational';
  });

  const bannerClass = $derived(
    overallStatus === 'operational'
      ? 'bg-[var(--codex-teal)]/20 text-[var(--codex-teal)] border-[var(--codex-teal)]/40'
      : overallStatus === 'degraded'
        ? 'bg-[var(--codex-gold)]/20 text-[var(--codex-gold)] border-[var(--codex-gold)]/40'
        : overallStatus === 'no-data'
          ? 'bg-[var(--muted)]/30 text-[var(--muted-foreground)] border-[var(--border)]'
          : 'bg-[var(--codex-outage)]/20 text-[var(--codex-outage)] border-[var(--codex-outage)]/40'
  );

  const bannerLabel = $derived(
    overallStatus === 'operational'
      ? 'All Systems Operational'
      : overallStatus === 'degraded'
        ? 'Partial System Degradation'
        : overallStatus === 'no-data'
          ? 'Waiting for monitoring data'
          : 'System Outage'
  );
</script>

<svelte:head>
  <title>Codex Status | API Uptime</title>
  <meta name="description" content="Real-time status for Codex API services." />
</svelte:head>

<div class="mx-auto max-w-4xl px-4 py-12 sm:px-6">
  <header class="mb-12 text-center">
    <h1 class="accent-gradient mb-2 font-[family-name:var(--font-display)] text-4xl font-bold sm:text-5xl">
      Codex Status
    </h1>
    <p class="text-[var(--muted-foreground)]">
      Real-time status for Codex API services
    </p>
  </header>

  {#if error}
    <div
      class="mb-8 rounded-lg border border-[var(--codex-outage)]/40 bg-[var(--codex-outage)]/10 p-4 text-center"
    >
      <p class="text-[var(--codex-outage)]">{error}</p>
      <p class="mt-1 text-sm text-[var(--muted-foreground)]">
        Monitoring may not have run yet. Check back shortly.
      </p>
    </div>
  {:else if data}
    <div
      class="mb-8 flex items-center justify-center gap-2 rounded-lg border px-4 py-3 {bannerClass}"
    >
      <span class="font-medium">{bannerLabel}</span>
    </div>

    <section class="mb-12">
      <h2 class="mb-4 font-[family-name:var(--font-display)] text-xl font-semibold">
        Services
      </h2>
      <div class="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
        {#each data.services ?? [] as service (service.id)}
          <ServiceCard
            {service}
            history={data.history?.[service.id] ?? []}
          />
        {/each}
      </div>
    </section>

    <section class="mb-8">
      <IncidentFeed incidents={data.incidents ?? []} />
    </section>

    <p class="text-center text-xs text-[var(--muted-foreground)]">
      Last updated {data.lastUpdated ?? '—'}
    </p>
  {:else}
    <div class="flex justify-center py-12">
      <div
        class="h-8 w-8 animate-spin rounded-full border-2 border-[var(--codex-teal)] border-t-transparent"
        aria-label="Loading"
      ></div>
    </div>
  {/if}

  <footer class="mt-12 text-center text-xs text-[var(--muted-foreground)]">
    <a href="https://codexeditor.app" class="text-[var(--codex-teal)] hover:underline">Codex</a>
    · <a href="/admin" class="hover:text-[var(--codex-teal)]">Admin</a>
  </footer>
</div>
