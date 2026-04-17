<script lang="ts">
  import { onMount } from 'svelte';
  import type { Incident } from '$lib/types';

  let adminKey = $state('');
  let storedKey = $state('');
  let authVerified = $state(false);
  let verifying = $state(false);
  let keyError = $state<string | null>(null);
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
  let createStatus = $state<Incident['status']>('investigating');
  let createNote = $state('');
  let createServicesChecked = $state<Record<string, boolean>>(
    Object.fromEntries(SERVICE_OPTIONS.map((s) => [s.id, false]))
  );

  const checkedServiceNames = $derived(
    SERVICE_OPTIONS.filter((s) => createServicesChecked[s.id]).map((s) => s.name)
  );

  const notePlaceholder = $derived.by(() => {
    if (checkedServiceNames.length === 0) return 'Brief description of the issue…';
    const list =
      checkedServiceNames.length === 1
        ? checkedServiceNames[0]
        : checkedServiceNames.slice(0, -1).join(', ') + ' and ' + checkedServiceNames.at(-1);
    return `We are investigating an issue affecting ${list}.`;
  });
  let updateIncidentId = $state('');
  let updateStatus = $state<Incident['status']>('monitoring');
  let updateBody = $state('');

  const key = $derived(authVerified ? storedKey : '');

  function clearStoredKey() {
    storedKey = '';
    authVerified = false;
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('codex-status-admin-key');
    }
  }

  async function verifyKey(candidate: string): Promise<boolean> {
    const res = await fetch('/api/admin/verify', {
      method: 'POST',
      headers: { 'x-admin-key': candidate }
    });
    return res.ok;
  }

  async function fetchIncidents() {
    const res = await fetch('/api/incidents');
    const data = await res.json();
    incidents = data.incidents ?? [];
  }

  onMount(async () => {
    const k = typeof window !== 'undefined' ? sessionStorage.getItem('codex-status-admin-key') : null;
    if (k) {
      const ok = await verifyKey(k);
      if (ok) {
        storedKey = k;
        authVerified = true;
      } else {
        clearStoredKey();
      }
    }
    await fetchIncidents();
    loading = false;
  });

  async function handleKeySubmit(e: Event) {
    e.preventDefault();
    const candidate = adminKey.trim();
    if (!candidate) return;
    keyError = null;
    verifying = true;
    try {
      const ok = await verifyKey(candidate);
      if (!ok) {
        keyError = 'Invalid admin key.';
        return;
      }
      storedKey = candidate;
      authVerified = true;
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('codex-status-admin-key', candidate);
      }
      adminKey = '';
      await fetchIncidents();
    } catch (err) {
      keyError = err instanceof Error ? err.message : 'Failed to verify key.';
    } finally {
      verifying = false;
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
        status: createStatus,
        note: createNote.trim() || notePlaceholder,
        services
      })
    });
    if (!res.ok) {
      error = await res.text();
      if (res.status === 401) clearStoredKey();
      return;
    }
    createTitle = '';
    createStatus = 'investigating';
    createNote = '';
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
      if (res.status === 401) clearStoredKey();
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
  <h1 class="mb-8 text-2xl font-semibold tracking-tight">
    Incident Admin
  </h1>

  {#if !authVerified}
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
          disabled={verifying}
          class="flex-1 rounded-lg border border-[var(--border)] bg-[var(--codex-surface)] px-3 py-2 text-sm disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={verifying || !adminKey.trim()}
          class="rounded-lg bg-[var(--codex-teal)] px-4 py-2 text-sm font-medium text-[var(--codex-deep)] disabled:opacity-60"
        >
          {verifying ? 'Verifying…' : 'Continue'}
        </button>
      </div>
      {#if keyError}
        <p class="mt-2 text-sm text-[var(--codex-outage)]">{keyError}</p>
      {/if}
    </form>
  {:else}
    <p class="mb-6 text-sm text-[var(--muted-foreground)]">
      Logged in. <button
        type="button"
        class="text-[var(--codex-teal)] underline"
        onclick={clearStoredKey}
      >Log out</button>
    </p>

    {#if error}
      <div class="mb-4 rounded-lg border border-[var(--codex-outage)]/40 bg-[var(--codex-outage)]/10 p-3 text-sm text-[var(--codex-outage)]">
        {error}
      </div>
    {/if}

    <section class="mb-8">
      <h2 class="mb-3 text-sm font-medium uppercase tracking-widest text-[var(--muted-foreground)]">
        Create Incident
      </h2>
      <form onsubmit={handleCreate} class="space-y-3">
        <input
          type="text"
          bind:value={createTitle}
          placeholder="Incident title"
          class="w-full rounded-lg border border-[var(--border)] bg-[var(--codex-surface)] px-3 py-2 text-sm"
        />
        <select
          bind:value={createStatus}
          class="w-full rounded-lg border border-[var(--border)] bg-[var(--codex-surface)] px-3 py-2 text-sm"
        >
          <option value="investigating">Investigating</option>
          <option value="identified">Identified</option>
          <option value="monitoring">Monitoring</option>
          <option value="resolved">Resolved</option>
        </select>
        <fieldset class="space-y-2">
          <legend class="text-sm text-[var(--muted-foreground)]">
            Affected services
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
        <textarea
          bind:value={createNote}
          placeholder={notePlaceholder}
          rows="2"
          class="w-full rounded-lg border border-[var(--border)] bg-[var(--codex-surface)] px-3 py-2 text-sm placeholder:text-[var(--muted-foreground)]/60"
        ></textarea>
        <button
          type="submit"
          class="rounded-lg bg-[var(--codex-teal)] px-4 py-2 text-sm font-medium text-[var(--codex-deep)]"
        >
          Create
        </button>
      </form>
    </section>

    <section class="mb-8">
      <h2 class="mb-3 text-sm font-medium uppercase tracking-widest text-[var(--muted-foreground)]">
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
      <h2 class="mb-3 text-sm font-medium uppercase tracking-widest text-[var(--muted-foreground)]">
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
