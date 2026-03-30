<template>
  <div>
    <LoadingSpinner v-if="isCssLoading" />

    <div v-show="!isCssLoading" flex="~ relative col" p="6" h="screen" n-bg="base" class="ps-inspector-ui">
      <!-- Header with title and dark toggle -->
      <div flex="~ items-center justify-between" mb="3">
        <h1 flex="~ gap-2 items-center" text="3xl" font="bold">
          <img :src="iconUrl" alt="Powersync" w="10" h="10" />
          PowerSync Inspector
        </h1>

        <!-- Dark Mode Toggle -->
        <NDarkToggle v-slot="{ isDark, toggle }">
          <NButton n="sm" :icon="isDark.value ? 'carbon:moon' : 'carbon:sun'" @click="toggle">
            {{ isDark.value ? 'Dark' : 'Light' }}
          </NButton>
        </NDarkToggle>
      </div>

      <slot v-if="useDiagnostics" />
      <div v-else>
        <NTip n="red6 dark:red5" icon="carbon:warning-alt">
          Enable diagnostics in your Nuxt config to use the inspector.
        </NTip>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRuntimeConfig } from '#imports';
import { onMounted, ref } from 'vue';
import iconUrl from './assets/powersync-icon.svg?url';

const useDiagnostics = useRuntimeConfig().public.powerSyncModuleOptions.useDiagnostics ?? false;

const isCssLoading = ref(true);

onMounted(async () => {
  await waitForUnoCSS();
  isCssLoading.value = false;
});

const waitForUnoCSS = () => {
  return new Promise((resolve) => {
    // Create invisible test element
    const testEl = document.createElement('div');
    testEl.className = 'w-10 h-10'; // Common UnoCSS utility classes
    testEl.style.position = 'absolute';
    testEl.style.visibility = 'hidden';
    testEl.style.pointerEvents = 'none';
    document.body.appendChild(testEl);

    const checkStyles = () => {
      const computed = window.getComputedStyle(testEl);
      const width = computed.getPropertyValue('width');
      const height = computed.getPropertyValue('height');

      // Check if UnoCSS classes are applied (w-10 = 2.5rem = 40px)
      if (width === '40px' && height === '40px') {
        document.body.removeChild(testEl);
        resolve(void 0);
      } else {
        requestAnimationFrame(checkStyles);
      }
    };

    // Start checking after a brief delay
    requestAnimationFrame(checkStyles);
  });
};
</script>
