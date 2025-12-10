<template>
  <div
    border="t"
    border-color="gray-100"
    relative
    n-bg="base"
    flex="~ col"
    h="screen"
    overflow="hidden"
  >
    <!-- Toolbar -->
    <div
      class="flex items-center justify-between gap-3 px-3 py-2 border-b border-gray-200 dark:border-neutral-700"
    >
      <div class="flex items-center gap-2 flex-1">
        <NTextInput
          v-model="searchQuery"
          n="xs"
          class="flex-1 max-w-md"
          placeholder="Search logs..."
          icon="carbon:search"
        />

        <select
          v-model="selectedLevel"
          class="px-2 py-1 text-xs border border-gray-300 dark:border-neutral-600 rounded bg-white dark:bg-neutral-800"
        >
          <option value="all">
            All Levels
          </option>
          <option value="error">
            Error
          </option>
          <option value="warn">
            Warning
          </option>
          <option value="info">
            Info
          </option>
          <option value="debug">
            Debug
          </option>
        </select>
      </div>

      <div class="flex items-center gap-2">
        <NBadge n="slate xs">
          {{ filteredLogs.length }}
        </NBadge>
        <NButton
          n="xs red"
          icon="carbon:trash-can"
          @click="clearLogs"
        >
          Clear
        </NButton>
      </div>
    </div>

    <!-- Logs Table -->
    <div class="flex-1 overflow-auto">
      <div
        v-if="filteredLogs.length === 0"
        class="text-center py-12"
      >
        <div class="text-gray-500 dark:text-gray-400 text-sm">
          No logs found
        </div>
      </div>

      <table
        v-else
        class="w-full"
      >
        <thead class="sticky top-0 bg-gray-50 dark:bg-neutral-900 border-b border-gray-200 dark:border-neutral-700 z-10">
          <tr>
            <th class="px-2 py-1.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 w-8" />
            <th class="px-2 py-1.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 w-32">
              Time
            </th>
            <th class="px-2 py-1.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 w-20">
              Source
            </th>
            <th class="px-2 py-1.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 w-20">
              Level
            </th>
            <th class="px-2 py-1.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
              Message
            </th>
            <th class="px-2 py-1.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 w-16" />
          </tr>
        </thead>
        <tbody>
          <template
            v-for="log in filteredLogs"
            :key="log.key"
          >
            <tr
              class="log-entry hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer border-b border-b-gray-100 dark:border-b-neutral-800"
              @click="toggleExpand(log.key)"
            >
              <td class="px-2 py-1.5">
                <div
                  class="w-1.5 h-1.5 rounded-full"
                  :class="getLogDotClass(log)"
                />
              </td>
              <td class="px-2 py-1.5">
                <span class="text-xs font-mono text-gray-600 dark:text-gray-400">
                  {{ log.value ? formatTime(log.value.date) : '' }}
                </span>
              </td>
              <td class="px-2 py-1.5">
                <div class="text-xs text-gray-700 dark:text-gray-300 truncate max-w-3xl">
                  {{ getLogSource(log) }}
                </div>
              </td>
              <td class="px-2 py-1.5">
                <NBadge
                  :n="`${getLogBadgeColor(log)} xs`"
                >
                  {{ getLogType(log) }}
                </NBadge>
              </td>
              <td class="px-2 py-1.5">
                <div class="text-xs text-gray-700 dark:text-gray-300 truncate max-w-3xl">
                  {{ getLogMessage(log) }}
                </div>
              </td>
              <td class="px-2 py-1.5 text-center">
                <NIcon
                  v-if="hasExtraData(log)"
                  :icon="expandedLogs.has(log.key) ? 'carbon:chevron-up' : 'carbon:constraint'"
                  class="text-gray-600 text-xs"
                />
              </td>
            </tr>
            <tr
              v-if="expandedLogs.has(log.key) && hasExtraData(log)"
              class="bg-gray-50 dark:bg-neutral-900/50"
            >
              <td colspan="12">
                <div class="px-10 py-2">
                  <div class="inline-flex items-center gap-2 mb-2">
                    <NIcon
                      n="sm"
                      icon="carbon:object"
                    />
                    <span class="text-xs text-gray-600 dark:text-gray-400">JSON</span>
                  </div>
                  <div class="bg-white dark:bg-neutral-800 p-3 rounded border border-gray-200 dark:border-neutral-700 overflow-x-auto">
                    <div
                      class="json-code-block text-xs"
                      v-html="highlightedJson.get(log.key)"
                    />
                  </div>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useDiagnosticsLogger } from '#imports'
import { ref, computed, onMounted, onUnmounted } from 'vue'
import Fuse from 'fuse.js'
import type { LogObject } from 'consola'
import { codeToHtml } from 'shiki'

interface LogItem {
  key: string
  value: LogObject | null
}

const { logsStorage, emitter } = useDiagnosticsLogger()

const searchQuery = ref('')
const selectedLevel = ref('all')
const expandedLogs = ref<Set<string>>(new Set())
const logs = ref<LogItem[]>([])
const highlightedJson = ref<Map<string, string>>(new Map())

// Load initial logs
async function loadInitialLogs() {
  const keys = await logsStorage.getKeys('log:')
  const items = await logsStorage.getItems(keys.map(key => ({ key }))) as LogItem[]
  logs.value = items.sort((a, b) => {
    const dateA = a.value ? new Date(a.value.date).getTime() : 0
    const dateB = b.value ? new Date(b.value.date).getTime() : 0
    return dateB - dateA
  })
}

// Real-time log handler
const handleLog = (event: any) => {
  logs.value.unshift({ key: event.key, value: event.value })
}

onMounted(() => {
  loadInitialLogs()
  emitter.on('log', handleLog)
})

onUnmounted(() => {
  emitter.off('log', handleLog)
})

// Initialize Fuse.js for fuzzy search
const fuse = computed(() => {
  if (!logs.value || logs.value.length === 0) return null

  return new Fuse(logs.value, {
    keys: [
      { name: 'message', getFn: log => getLogMessage(log as LogItem), weight: 2 },
      { name: 'type', getFn: log => (log as LogItem).value?.type || '' },
      { name: 'extraData', getFn: log => getSearchableExtraData(log as LogItem), weight: 0.5 },
    ],
    threshold: 0.3,
    includeScore: true,
    useExtendedSearch: true,
    includeMatches: true,
  })
})

// Filtered logs based on search and level
const filteredLogs = computed(() => {
  let filtered = logs.value || []

  // Filter by level
  if (selectedLevel.value !== 'all') {
    filtered = filtered.filter((log: LogItem) =>
      log.value?.type === selectedLevel.value,
    )
  }

  // Fuzzy search
  if (searchQuery.value && fuse.value) {
    const searchResults = fuse.value.search(searchQuery.value)
    const searchedItems = searchResults.map(result => result.item as LogItem)

    // Filter the already level-filtered results
    if (selectedLevel.value !== 'all') {
      filtered = filtered.filter((log: LogItem) =>
        searchedItems.some(item => item.key === log.key),
      )
    }
    else {
      filtered = searchedItems
    }
  }

  return filtered
})

// Toggle expanded state
async function toggleExpand(key: string) {
  if (expandedLogs.value.has(key)) {
    expandedLogs.value.delete(key)
  }
  else {
    expandedLogs.value.add(key)
    // Generate highlighted JSON if not already cached
    if (!highlightedJson.value.has(key)) {
      const log = logs.value.find(l => l.key === key)
      if (log) {
        const jsonStr = formatExtraData(log)
        const html = await codeToHtml(jsonStr, {
          lang: 'json',
          themes: {
            light: 'catppuccin-latte',
            dark: 'catppuccin-frappe',
          },
        })
        highlightedJson.value.set(key, html)
      }
    }
  }
}

// Helper functions
function getLogMessage(log: LogItem): string {
  if (!log.value?.args || log.value.args.length === 0) return 'Empty log message'
  return String(log.value.args[0] || 'Empty log message')
}

function getLogSource(log: LogItem): string {
  return log.value?.args[2]?.name || ''
}

function hasExtraData(log: LogItem): boolean {
  return !!(
    log.value?.args
    && log.value.args.length > 2
    && log.value.args[1]
    && !(typeof log.value.args[1] === 'object' && log.value.args[1] !== null && Object.keys(log.value.args[1]).length === 0)
  )
}

function formatExtraData(log: LogItem): string {
  if (!log.value?.args || log.value.args.length <= 1) return ''
  return JSON.stringify(log.value.args[1], null, 2)
}

// Extract searchable text from extra data
function getSearchableExtraData(log: LogItem): string {
  if (!log.value?.args || log.value.args.length <= 1) return ''
  const data = log.value.args[1]
  if (!data) return ''

  // Simple approach: convert to JSON string and clean it
  try {
    const jsonStr = JSON.stringify(data)
    // Remove JSON syntax characters and keep only content
    const result = jsonStr
      .replace(/[{}[\]",:]/g, ' ') // Replace JSON syntax with spaces
      .replace(/\s+/g, ' ') // Collapse multiple spaces
      .trim()

    return result
  }
  catch {
    return String(data)
  }
}

function formatTime(date: string | Date): string {
  return new Date(date).toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
  })
}

function getLogType(log: LogItem): string {
  return (log.value?.type || 'info').toUpperCase()
}

function getLogDotClass(log: LogItem): string {
  const type = log.value?.type || 'info'
  const classes = {
    error: 'bg-red-500',
    warn: 'bg-yellow-500',
    info: 'bg-blue-500',
    debug: 'bg-gray-400',
  }
  return classes[type as keyof typeof classes] || classes.info
}

function getLogBadgeColor(log: LogItem): string {
  const type = log.value?.type || 'info'
  const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'blue',
    debug: 'gray',
  }
  return colors[type as keyof typeof colors] || colors.info
}

async function clearLogs() {
  const keys = await logsStorage.getKeys('log:')
  await Promise.all(keys.map(key => logsStorage.removeItem(key)))
  logs.value = []
  expandedLogs.value.clear()
  highlightedJson.value.clear()
}
</script>

<style scoped>
.log-entry {
  animation: slideIn 0.2s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>

<style>
/* JSON code block styling with line numbers */
.json-code-block {
  font-family: "Monaco", "Menlo", "Ubuntu Mono", monospace;
  font-size: 12px;
  line-height: 1.4;
}

.json-code-block pre {
  margin: 0;
  padding: 0;
  background: transparent !important;
  overflow: visible;
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
}

.json-code-block code {
  counter-reset: step;
  counter-increment: step 0;
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
  display: block;
  padding: 0;
  margin: 0;
}

.json-code-block code .line::before {
  content: counter(step);
  counter-increment: step;
  width: 1rem;
  margin-right: 1.5rem;
  display: inline-block;
  text-align: right;
  color: rgba(115, 138, 148, 0.4);
}

.dark .json-code-block code .line::before {
  color: hsl(0, 2%, 51%);
}
</style>
