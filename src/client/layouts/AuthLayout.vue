<template>
  <div class="min-h-screen bg-slate-950 text-slate-100">
    <div class="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-6 py-16">
      <header class="pb-10">
        <p class="text-sm uppercase tracking-[0.3em] text-slate-400">SMART on FHIR Sandbox</p>
        <h1 class="mt-3 text-3xl font-semibold text-white">
          <slot name="headline" />
        </h1>
        <p class="mt-2 text-base text-slate-300">
          <slot name="description" />
        </p>
      </header>
      <main class="flex-1">
        <slot />
      </main>
      <footer class="pt-8 text-center text-xs text-slate-500">
        SMART on FHIR Sandbox · Tailwind UI surface
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
// Reusable layout for OAuth-centric views.
</script>
