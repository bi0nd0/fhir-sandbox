<template>
  <div class="min-h-screen bg-slate-950 text-slate-50">
    <header class="border-b border-slate-800 bg-slate-900/80 backdrop-blur">
      <div class="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div>
          <p class="text-xs uppercase tracking-[0.35em] text-slate-400">SMART Sandbox</p>
          <h1 class="text-xl font-semibold text-white">Admin Console</h1>
        </div>
        <nav class="text-sm text-slate-300">
          <RouterLink class="rounded-lg px-3 py-2 transition hover:bg-slate-800" to="/oauth2/session">Session Tools</RouterLink>
          <RouterLink class="rounded-lg px-3 py-2 transition hover:bg-slate-800" to="/admin/ui/tokens">Tokens</RouterLink>
        </nav>
      </div>
    </header>
    <main class="mx-auto w-full max-w-6xl px-6 py-10">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
// Shared layout for admin views.
</script>
