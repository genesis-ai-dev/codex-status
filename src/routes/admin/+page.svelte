<script lang="ts">
  import { onMount } from 'svelte';
  import type { Incident } from '$lib/types';

  let adminKey = $state('');
  let storedKey = $state('');
  let incidents = $state<Incident[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);
  const SERVICE_OPTIONS = [
    { id: 'api-health', name: 'API Health' },
    { id: 'extended-health', name: 'Extended Health' },
    { id: 'dashboard', name: 'Cloud Sync' },
    { id: 'auth', name: 'Authentication' },
    { id: 'llm', name: 'AI Predictions' }
  ];

  let createTitle = $state('');
  let createServicesChecked = $state<Record<string, boolean>>(
    Object.fromEntries(SERVICE_OPTIONS.map((s) => [s.id, false]))
  );
  let updateIncidentId = $state('');
  let updateStatus = $state<Incident['status']>('monitoring');
  let updateBody = $state('');

  const key = $derived(storedKey || (typeof window !== 'undefined' ? sessionStorage.getItem('codex-status-admin-key') : null));

  function setKey(k: string) {
    storedKey = k;
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('codex-status-admin-key', k);
    }
  }

  async function fetchIncidents() {
    const res = await fetch('/api/incidents');
    const data = await res.json();
    incidents = data.incidents ?? [];
  }

  onMount(() => {
    const k = typeof window !== 'undefined' ? sessionStorage.getItem('codex-status-admin-key') : null;
    if (k) storedKey = k;
    fetchIncidents().finally(() => (loading = false));
  });

  async function handleKeySubmit(e: Event) {
    e.preventDefault();
    if (adminKey.trim()) {
      setKey(adminKey.trim());
      adminKey = '';
      await fetchIncidents();
    }
  }

  async function handleCreate(e: Event) {
    e.preventDefault();
    if (!key || !createTitle.trim()) return;
    error = null;
    const services = SERVICE_OPTIONS.filter((s) => createServicesChecked[s.id]).map(
      (s) => s.id
    );
    const res = await fetch('/api/incidents', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': key
      },
      body: JSON.stringify({
        title: createTitle.trim(),
        services
      })
    });
    if (!res.ok) {
      error = await res.text();
      return;
    }
    createTitle = '';
    createServicesChecked = Object.fromEntries(SERVICE_OPTIONS.map((s) => [s.id, false]));
    await fetchIncidents();
  }

  async function handleUpdate(e: Event) {
    e.preventDefault();
    if (!key || !updateIncidentId) return;
    error = null;
    const res = await fetch('/api/incidents', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': key
      },
      body: JSON.stringify({
        id: updateIncidentId,
        status: updateStatus,
        body: updateBody.trim() || undefined
      })
    });
    if (!res.ok) {
      error = await res.text();
      return;
    }
    updateIncidentId = '';
    updateBody = '';
    await fetchIncidents();
  }

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleString();
  }
</script>

<svelte:head>
  <title>Codex Status Admin</title>
</svelte:head>

<div class="mx-auto max-w-2xl px-4 py-12 sm:px-6">
  <h1 class="accent-gradient mb-8 font-[family-name:var(--font-display)] text-3xl font-bold">
    Incident Admin
  </h1>

  {#if !key}
    <form onsubmit={handleKeySubmit} class="mb-8">
      <label for="admin-key" class="mb-2 block text-sm text-[var(--muted-foreground)]">
        Admin API Key
      </label>
      <div class="flex gap-2">
        <input
          id="admin-key"
          type="password"
          bind:value={adminKey}
          placeholder="Enter admin key"
          class="flex-1 rounded-lg border border-[var(--border)] bg-[var(--codex-surface)] px-3 py-2 text-sm"
        />
        <button
          type="submit"
          class="rounded-lg bg-[var(--codex-teal)] px-4 py-2 text-sm font-medium text-[var(--codex-deep)]"
        >
          Continue
        </button>
      </div>
    </form>
  {:else}
    <p class="mb-6 text-sm text-[var(--muted-foreground)]">
      Logged in. <button
        type="button"
        class="text-[var(--codex-teal)] underline"
        onclick={() => {
          setKey('');
          storedKey = '';
          if (typeof window !== 'undefined') sessionStorage.removeItem('codex-status-admin-key');
        }}
      >Log out</button>
    </p>

    {#if error}
      <div class="mb-4 rounded-lg border border-[var(--codex-outage)]/40 bg-[var(--codex-outage)]/10 p-3 text-sm text-[var(--codex-outage)]">
        {error}
      </div>
    {/if}

    <section class="mb-8">
      <h2 class="mb-3 font-[family-name:var(--font-display)] text-lg font-semibold">
        Create Incident
      </h2>
      <form onsubmit={handleCreate} class="space-y-3">
        <input
          type="text"
          bind:value={createTitle}
          placeholder="Incident title"
          class="w-full rounded-lg border border-[var(--border)] bg-[var(--codex-surface)] px-3 py-2 text-sm"
        />
        <fieldset class="space-y-2">
          <legend class="text-sm text-[var(--muted-foreground)]">
            Affected services (check all that apply)
          </legend>
          <div class="flex flex-wrap gap-4">
            {#each SERVICE_OPTIONS as opt (opt.id)}
              <label class="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  bind:checked={createServicesChecked[opt.id]}
                  class="rounded border-[var(--border)]"
                />
                <span class="text-sm">{opt.name}</span>
              </label>
            {/each}
          </div>
        </fieldset>
        <button
          type="submit"
          class="rounded-lg bg-[var(--codex-teal)] px-4 py-2 text-sm font-medium text-[var(--codex-deep)]"
        >
          Create
        </button>
      </form>
    </section>

    <section class="mb-8">
      <h2 class="mb-3 font-[family-name:var(--font-display)] text-lg font-semibold">
        Update Incident
      </h2>
      <form onsubmit={handleUpdate} class="space-y-3">
        <select
          bind:value={updateIncidentId}
          class="w-full rounded-lg border border-[var(--border)] bg-[var(--codex-surface)] px-3 py-2 text-sm"
        >
          <option value="">Select incident</option>
          {#each incidents.filter((i) => i.status !== 'resolved') as inc (inc.id)}
            <option value={inc.id}>{inc.title}</option>
          {/each}
        </select>
        <select
          bind:value={updateStatus}
          class="w-full rounded-lg border border-[var(--border)] bg-[var(--codex-surface)] px-3 py-2 text-sm"
        >
          <option value="investigating">Investigating</option>
          <option value="identified">Identified</option>
          <option value="monitoring">Monitoring</option>
          <option value="resolved">Resolved</option>
        </select>
        <textarea
          bind:value={updateBody}
          placeholder="Update message"
          rows="2"
          class="w-full rounded-lg border border-[var(--border)] bg-[var(--codex-surface)] px-3 py-2 text-sm"
        ></textarea>
        <button
          type="submit"
          class="rounded-lg bg-[var(--codex-teal)] px-4 py-2 text-sm font-medium text-[var(--codex-deep)]"
        >
          Update
        </button>
      </form>
    </section>

    <section>
      <h2 class="mb-3 font-[family-name:var(--font-display)] text-lg font-semibold">
        Incidents
      </h2>
      {#if loading}
        <p class="text-sm text-[var(--muted-foreground)]">Loading…</p>
      {:else}
        <ul class="space-y-3">
          {#each incidents as inc (inc.id)}
            <li class="rounded-lg border border-[var(--border)] bg-[var(--codex-surface)] p-3">
              <div class="flex justify-between">
                <span class="font-medium">{inc.title}</span>
                <span class="text-xs capitalize text-[var(--muted-foreground)]">{inc.status}</span>
              </div>
              <p class="mt-1 text-xs text-[var(--muted-foreground)]">
                {inc.services.join(', ')} · {formatDate(inc.createdAt)}
              </p>
            </li>
          {/each}
        </ul>
      {/if}
    </section>
  {/if}
</div>
