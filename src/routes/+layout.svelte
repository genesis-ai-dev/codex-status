<script lang="ts">
  import '../app.css';
</script>

<div class="min-h-screen bg-[var(--codex-deep)] text-[var(--foreground)] font-[family-name:var(--font-body)] dark">
  <div class="relative min-h-screen overflow-hidden">
    <div class="absolute inset-0 mesh-gradient" aria-hidden="true"></div>
    <div class="noise-overlay absolute inset-0" aria-hidden="true"></div>
    <div class="relative z-10">
      <slot />
    </div>
  </div>
</div>
