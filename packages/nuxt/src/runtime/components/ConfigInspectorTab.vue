<template>
  <div
    border="t"
    border-color="gray-100"
    relative
    n-bg="base"
    flex="~ col"
  >
    <div
      flex="~ col gap-2"
      class="h-full"
    >
      <NSectionBlock
        icon="carbon:connection-signal"
        text="Connection Options"
      >
        <div
          class="text-sm schema-code-block h-full overflow-auto"
          v-html="connectionOptionsHtml"
        />
      </NSectionBlock>

      <span
        border="b"
        border-color="gray-100"
      />

      <NSectionBlock
        icon="carbon:cics-db2-connection"
        text="Database Options"
      >
        <div
          class="text-sm schema-code-block h-full overflow-auto"
          v-html="dbOptionsHtml"
        />
      </NSectionBlock>

      <span
        border="b"
        border-color="gray-100"
      />

      <NSectionBlock
        icon="carbon:prompt-template"
        text="Schema"
        class="flex-1 overflow-hidden"
      >
        <div
          class="text-sm schema-code-block h-full overflow-auto"
          v-html="schemaHtml"
        />
      </NSectionBlock>
    </div>
  </div>
</template>

<script setup lang="ts">
import type {
  NuxtPowerSyncDatabase } from '#imports'
import {
  usePowerSyncInspectorDiagnostics,
  usePowerSyncInspector,
} from '#imports'
import { computed, onMounted } from 'vue'
import { codeToHtml } from 'shiki'
import { asyncComputed } from '@vueuse/core'

const { db, connectionOptions } = usePowerSyncInspectorDiagnostics()
const { getCurrentSchemaManager } = usePowerSyncInspector()
const schemaManager = getCurrentSchemaManager()

const currentConnectionOptions = computed(() => {
  const { serializedSchema: _, ...options } = connectionOptions.value!
  return options
})

const dbOptions = computed(() => {
  const { logger: _, schema: __, ...dbOptions } = (db.value as NuxtPowerSyncDatabase).dbOptions
  return dbOptions
})

const schema = computed(() => {
  return `/**
 * This is the inferred schema of the data received by the diagnostics app.
 * Because this schema is generated on-the-fly based on the data received by the app, it can
 * be incomplete and should NOT be relied upon as a source of truth for your app schema.
 * If a table is empty, it will not be shown here.
 * If a column contains only NULL values, the column will not be shown here.
 * Tables and columns are only added here. Nothing is removed until the database is cleared.
 */
${schemaManager.schemaToString()}`
})

const connectionOptionsHtml = asyncComputed(
  async () =>
    await codeToHtml(JSON.stringify(currentConnectionOptions.value, null, 2), {
      lang: 'json',
      themes: {
        light: 'min-light',
        dark: 'min-dark',
      },
    }),
)

const dbOptionsHtml = asyncComputed(
  async () =>
    await codeToHtml(JSON.stringify(dbOptions.value, null, 2), {
      lang: 'json',
      themes: {
        light: 'min-light',
        dark: 'min-dark',
      },
    }),
)

const schemaHtml = asyncComputed(
  async () =>
    await codeToHtml(schema.value, {
      lang: 'typescript',
      themes: {
        light: 'min-light',
        dark: 'min-dark',
      },
    }),
)

onMounted(async () => {
  await db.value?.waitForFirstSync()
})
</script>

<style>
/* Schema code block styling with line numbers */
.schema-code-block {
  font-family: "Monaco", "Menlo", "Ubuntu Mono", monospace;
  font-size: 12px;
  line-height: 1.4;
}

.schema-code-block pre {
  height: 100%;
  margin: 0;
  padding: 0;
  background: transparent !important;
  overflow: visible;
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
}

.schema-code-block code {
  counter-reset: step;
  counter-increment: step 0;
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
  display: block;
  padding: 0;
  margin: 0;
}

.schema-code-block code .line::before {
  content: counter(step);
  counter-increment: step;
  width: 1rem;
  margin-right: 1.5rem;
  display: inline-block;
  text-align: right;
  color: rgba(115, 138, 148, 0.4);
}

.dark .schema-code-block code .line::before {
  color: hsl(0, 2%, 51%);
}
</style>
