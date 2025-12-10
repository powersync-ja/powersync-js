<template>
  <div
    flex="~ relative col"
    p="6"
    h="screen"
    n-bg="base"
    class="ps-inspector-ui"
  >
    <!-- Header with title and dark toggle -->
    <div
      flex="~ items-center justify-between"
      mb="3"
    >
      <h1
        flex="~ gap-2 items-center"
        text="3xl"
        font="bold"
      >
        <img
          src="https://cdn.prod.website-files.com/67eea61902e19994e7054ea0/67f910109a12edc930f8ffb6_powersync-icon.svg"
          alt="Powersync"
          w="10"
          h="10"
        >
        PowerSync Inspector
      </h1>

      <!-- Dark Mode Toggle -->
      <NDarkToggle v-slot="{ isDark, toggle }">
        <NButton
          n="sm"
          :icon="isDark.value ? 'carbon:moon' : 'carbon:sun'"
          @click="toggle"
        >
          {{ isDark.value ? "Dark" : "Light" }}
        </NButton>
      </NDarkToggle>
    </div>

    <slot v-if="useDiagnostics" />
    <div v-else>
      <NTip
        n="red6 dark:red5"
        icon="carbon:warning-alt"
      >
        Enable diagnostics in your Nuxt config to use the inspector.
      </NTip>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRuntimeConfig } from '#imports'

const useDiagnostics = useRuntimeConfig().public.powerSyncModuleOptions.useDiagnostics ?? false
</script>
