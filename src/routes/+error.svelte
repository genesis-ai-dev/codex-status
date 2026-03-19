<script lang="ts">
  let { status, error } = $props();
</script>

<div class="mx-auto max-w-lg px-4 py-16 text-center">
  <h1 class="accent-gradient mb-4 font-[family-name:var(--font-display)] text-3xl font-bold">
    {status ?? 'Error'}
  </h1>
  <p class="text-[var(--muted-foreground)]">{error?.message ?? 'Something went wrong'}</p>
  <a
    href="/"
    class="mt-6 inline-block rounded-lg bg-[var(--codex-teal)] px-4 py-2 text-sm font-medium text-[var(--codex-deep)]"
  >
    Back to status
  </a>
</div>
