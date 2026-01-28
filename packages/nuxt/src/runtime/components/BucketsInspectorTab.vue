<template>
  <TooltipProvider :delay-duration="100">
    <div
      border="t"
      border-color="gray-100"
      relative
      n-bg="base"
      flex="~ col"
      h="screen"
      overflow="hidden"
    >
      <SplitterGroup
        id="buckets-splitter-group"
        class="h-full"
        direction="horizontal"
      >
        <!-- Buckets List Panel -->
        <SplitterPanel
          id="buckets-list-panel"
          :min-size="30"
          :default-size="40"
          class="border-r border-gray-200 flex flex-col overflow-hidden"
        >
          <div class="flex-1 flex flex-col overflow-hidden">
            <!-- Header -->
            <div class="p-3 border-b border-gray-200 dark:border-neutral-700">
              <div class="flex items-center justify-between mb-2">
                <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Buckets
                </h2>
                <NBadge n="slate xs">
                  {{ filteredBuckets.length }}
                </NBadge>
              </div>

              <!-- Search Bar -->
              <NTextInput
                v-model="searchQuery"
                n="xs"
                class="w-full"
                placeholder="Search buckets..."
                icon="carbon:search"
                @input="onSearchInput"
              />
            </div>

            <!-- Buckets List -->
            <div class="flex-1 overflow-y-auto">
              <div
                v-if="filteredBuckets.length === 0 && !isLoading"
                class="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400 text-sm mt-3"
              >
                <div class="text-center">
                  <NIcon
                    icon="carbon:data-error"
                    class="text-2xl mb-2"
                  />
                  <div>No buckets found</div>
                </div>
              </div>

              <div
                v-else-if="isLoading"
                class="flex-1 flex items-center justify-center"
              >
                <NLoading />
              </div>

              <div
                v-else
                class="p-2 space-y-1"
              >
                <div
                  v-for="bucket in filteredBuckets"
                  :key="bucket.name"
                  class="bucket-item p-3 rounded-lg border border-gray-200 dark:border-neutral-700 cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-neutral-800"
                  :class="{
                    'bg-gray-100 dark:bg-neutral-400/20 border-gray-300 dark:border-blue-700': selectedBucket?.name === bucket.name,
                  }"
                  @click="selectBucket(bucket)"
                >
                  <div class="flex items-start justify-between">
                    <div class="flex-1 min-w-0 flex flex-col gap-1">
                      <div class="flex items-center gap-2 mb-1">
                        <NIcon
                          icon="carbon:db2-database"
                          class="text-blue-500 flex-shrink-0"
                        />
                        <span class="font-medium text-gray-900 dark:text-gray-100 truncate">
                          {{ bucket.name }}
                        </span>
                      </div>

                      <!-- Bucket Details - Two Lines -->
                      <div class="grid grid-cols-4 gap-2 text-xs text-gray-600 dark:text-gray-400">
                        <!-- Data Size -->
                        <TooltipRoot>
                          <TooltipTrigger as-child>
                            <div class="flex items-center gap-1">
                              <NIcon
                                icon="carbon:data-volume"
                                class="text-xs"
                              />
                              <span>{{ formatBytes(bucket.data_size || 0) }}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent
                            side="bottom"
                            class="text-xs bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-md p-2"
                          >
                            Data Size: {{ formatBytes(bucket.data_size || 0) }}
                          </TooltipContent>
                        </TooltipRoot>

                        <!-- Row Count -->
                        <TooltipRoot>
                          <TooltipTrigger as-child>
                            <div class="flex items-center gap-1">
                              <NIcon
                                icon="carbon:data-2"
                                class="text-xs"
                              />
                              <span>{{ bucket.row_count || 0 }} rows</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent
                            side="bottom"
                            class="text-xs bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-md p-2"
                          >
                            Row Count: {{ bucket.row_count || 0 }} rows
                          </TooltipContent>
                        </TooltipRoot>

                        <!-- Metadata Size -->
                        <TooltipRoot>
                          <TooltipTrigger as-child>
                            <div class="flex items-center gap-1">
                              <NIcon
                                icon="carbon:array-objects"
                                class="text-xs"
                              />
                              <span>{{ formatBytes(bucket.metadata_size || 0) }}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent
                            side="bottom"
                            class="text-xs bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-md p-2"
                          >
                            Metadata Size: {{ formatBytes(bucket.metadata_size || 0) }}
                          </TooltipContent>
                        </TooltipRoot>

                        <!-- Download Size -->
                        <TooltipRoot>
                          <TooltipTrigger as-child>
                            <div class="flex items-center gap-1">
                              <NIcon
                                icon="carbon:download"
                                class="text-xs"
                              />
                              <span>{{ formatBytes(bucket.download_size || 0) }}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent
                            side="bottom"
                            class="text-xs bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-md p-2"
                          >
                            Download Size: {{ formatBytes(bucket.download_size || 0) }}
                          </TooltipContent>
                        </TooltipRoot>
                      </div>

                      <!-- Status Line -->
                      <div class="flex items-center justify-between mt-1">
                        <div class="flex items-center gap-1 flex-wrap">
                          <span class="text-xs text-gray-500 dark:text-gray-400">Tables:</span>
                          <template v-if="JSON.parse(bucket.tables) && JSON.parse(bucket.tables).length > 0">
                            <template
                              v-for="tableName in JSON.parse(bucket.tables).slice(0, 3)"
                              :key="tableName"
                            >
                              <NBadge
                                n="gray xs"
                                class="text-xs"
                              >
                                {{ tableName }}
                              </NBadge>
                            </template>
                            <TooltipRoot v-if="JSON.parse(bucket.tables).length > 3">
                              <TooltipTrigger as-child>
                                <NBadge
                                  n="gray xs"
                                  class="text-xs"
                                >
                                  +{{ JSON.parse(bucket.tables).length - 3 }}
                                </NBadge>
                              </TooltipTrigger>
                              <TooltipContent
                                side="bottom"
                                class="text-xs bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-md p-2"
                              >
                                All tables: {{ JSON.parse(bucket.tables).join(', ') }}
                              </TooltipContent>
                            </TooltipRoot>
                          </template>
                          <span
                            v-else
                            class="text-xs text-gray-500 dark:text-gray-400"
                          >
                            No tables
                          </span>
                        </div>
                        <NBadge
                          :n="bucket.downloading ? 'blue' : 'gray'"
                          :icon="bucket.downloading ? 'carbon:arrow-down' : 'carbon:pause'"
                          class="text-xs"
                        >
                          {{ bucket.downloading ? 'Downloading' : 'Idle' }}
                        </NBadge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </SplitterPanel>

        <SplitterResizeHandle
          id="buckets-resize-handle"
          class="w-[2px] bg-gray-200 hover:bg-indigo-300 dark:hover:bg-indigo-700"
        />

        <!-- Bucket Content Panel -->
        <SplitterPanel
          id="bucket-content-panel"
          :min-size="30"
          class="flex flex-col overflow-hidden"
        >
          <div
            v-if="!selectedBucket"
            class="flex w-full h-full justify-center items-center"
          >
            <div
              text="sm gray-500"
              flex="~ gap-2 items-center"
            >
              <NIcon icon="carbon:data-base" />
              <span>Select a bucket to view its content</span>
            </div>
          </div>

          <div
            v-else
            class="flex-1 flex flex-col overflow-hidden"
          >
            <!-- Bucket Header -->
            <div class="p-3 border-b border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <NIcon
                    icon="carbon:data-base"
                    class="text-blue-500"
                  />
                  <h3 class="font-semibold text-gray-900 dark:text-gray-100">
                    {{ selectedBucket.name }}
                  </h3>
                  <NBadge n="blue xs">
                    {{ bucketContentRows?.length || 0 }} items
                  </NBadge>
                </div>

                <div class="flex items-center gap-2">
                  <NButton
                    n="xs"
                    icon="carbon:refresh"
                    @click="refreshBucketContent"
                  >
                    Refresh
                  </NButton>
                </div>
              </div>
            </div>

            <!-- Bucket Content Table -->
            <div class="flex-1 overflow-hidden">
              <div
                v-if="isLoadingContent"
                class="flex justify-center items-center h-full"
              >
                <NLoading />
              </div>

              <div
                v-else-if="bucketContentError"
                class="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded m-4"
              >
                <div class="text-red-800 dark:text-red-200 font-medium">
                  Error loading bucket content:
                </div>
                <div class="text-red-700 dark:text-red-300 text-sm mt-1">
                  {{ bucketContentError }}
                </div>
              </div>

              <div
                v-else-if="bucketContentRows && bucketContentRows.length > 0"
                class="flex-1 flex flex-col overflow-hidden"
              >
                <!-- Table Controls -->
                <div class="px-3 py-2 flex justify-between items-center bg-gray-50 dark:bg-neutral-800 border-b border-gray-200 dark:border-neutral-700 flex-shrink-0">
                  <div class="flex items-center gap-3">
                    <div class="text-xs text-gray-600 dark:text-gray-400">
                      {{ bucketContentRows.length }} row{{
                        bucketContentRows.length !== 1 ? "s" : ""
                      }}
                    </div>
                  </div>

                  <div class="flex items-center gap-1">
                    <NButton
                      n="xs"
                      icon="carbon:chevron-left"
                      :disabled="!table.getCanPreviousPage()"
                      @click="table.previousPage()"
                    />

                    <!-- Page Jump Input -->
                    <div class="flex items-center gap-1">
                      <span class="text-xs text-gray-600 dark:text-gray-400">Page</span>
                      <NTextInput
                        v-model="currentPageInput"
                        n="xs"
                        class="w-12 text-center"
                        type="number"
                        min="1"
                        :max="table.getPageCount()"
                        @blur="jumpToPage"
                        @keydown.enter="jumpToPage"
                      />
                      <span class="text-xs text-gray-600 dark:text-gray-400">of {{ table.getPageCount() }}</span>
                    </div>

                    <NButton
                      n="xs"
                      icon="carbon:chevron-right"
                      :disabled="!table.getCanNextPage()"
                      @click="table.nextPage()"
                    />
                  </div>

                  <!-- Page Size Control -->
                  <div class="flex items-center gap-1">
                    <span class="text-xs text-gray-600 dark:text-gray-400">Show:</span>
                    <NTextInput
                      v-model="pageSizeInput"
                      n="xs"
                      class="w-16"
                      type="number"
                      min="1"
                      max="1000"
                      @blur="updatePageSize"
                      @keydown.enter="updatePageSize"
                    />
                    <span class="text-xs text-gray-600 dark:text-gray-400">per page</span>
                  </div>
                </div>

                <!-- Data Table -->
                <div class="flex-1 border border-gray-200 dark:border-neutral-700 rounded-b-lg overflow-auto">
                  <table class="w-full min-w-max">
                    <thead class="bg-gray-50 dark:bg-neutral-800 sticky top-0">
                      <tr>
                        <th
                          v-for="header in table.getFlatHeaders()"
                          :key="header.id"
                          class="px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 tracking-wider border-r border-gray-200 dark:border-neutral-700 last:border-r-0 relative overflow-hidden"
                          :class="
                            header.column.getCanSort()
                              ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-neutral-700'
                              : ''
                          "
                          :style="{
                            width: `${header.getSize()}px`,
                            maxWidth: `${header.getSize()}px`,
                            minWidth: `${header.getSize()}px`,
                          }"
                          @click="
                            header.column.getToggleSortingHandler()?.($event)
                          "
                        >
                          <div class="flex items-center gap-1 min-w-0">
                            <div class="truncate flex-1 min-w-0">
                              <FlexRender
                                :render="header.column.columnDef.header"
                                :props="header.getContext()"
                              />
                            </div>
                            <span
                              v-if="header.column.getIsSorted()"
                              class="text-xs flex-shrink-0"
                            >
                              {{
                                header.column.getIsSorted() === "asc" ? "▲" : "▼"
                              }}
                            </span>
                          </div>
                          <!-- Column Resize Handle -->
                          <div
                            v-if="header.column.getCanResize()"
                            class="absolute top-0 right-0 h-full w-1 cursor-col-resize bg-transparent hover:bg-gray-500 hover:bg-opacity-50 group"
                            @mousedown="header.getResizeHandler()?.($event)"
                            @touchstart="header.getResizeHandler()?.($event)"
                            @click.stop
                          >
                            <div
                              class="w-full h-full group-hover:bg-gray-500 transition-colors duration-150"
                            />
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody
                      class="bg-white dark:bg-neutral-900 border-t border-gray-200 dark:border-neutral-700"
                    >
                      <tr
                        v-for="row in table.getRowModel().rows"
                        :key="row.id"
                        class="hover:bg-gray-50 dark:hover:bg-neutral-800 border-b border-gray-200 dark:border-neutral-700"
                      >
                        <td
                          v-for="cell in row.getVisibleCells()"
                          :key="cell.id"
                          class="px-2 py-3 text-sm text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-neutral-700 last:border-r-0 overflow-hidden"
                          :style="{
                            width: `${cell.column.getSize()}px`,
                            maxWidth: `${cell.column.getSize()}px`,
                            minWidth: `${cell.column.getSize()}px`,
                          }"
                        >
                          <div
                            class="truncate w-full"
                            :title="String(cell.getValue())"
                          >
                            <FlexRender
                              :render="cell.column.columnDef.cell"
                              :props="cell.getContext()"
                            />
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div
                v-else
                class="text-center py-8"
              >
                <div class="text-gray-500 dark:text-gray-400">
                  No content found in this bucket
                </div>
              </div>
            </div>
          </div>
        </SplitterPanel>
      </SplitterGroup>
    </div>
  </TooltipProvider>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { usePowerSyncInspectorDiagnostics } from '#imports'
import {
  SplitterGroup,
  SplitterPanel,
  SplitterResizeHandle,
  TooltipContent,
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
} from 'reka-ui'

import {
  FlexRender,
  getCoreRowModel,
  useVueTable,
  getSortedRowModel,
  getPaginationRowModel,
} from '@tanstack/vue-table'

import Fuse from 'fuse.js'

const { db, bucketRows, formatBytes } = usePowerSyncInspectorDiagnostics()

// Bucket listing state
const searchQuery = ref('')
const selectedBucket = ref<any>(null)
const isLoading = ref(false)
const fuse = ref<Fuse<any>>()

// Bucket content state
const bucketContentRows = ref<any[] | null>(null)
const isLoadingContent = ref(false)
const bucketContentError = ref<string | null>(null)

// Table state
const currentPageInput = ref<string>('1')
const pageSizeInput = ref<string>('50')

// Initialize Fuse.js for fuzzy search
const initializeFuse = () => {
  if (!bucketRows.value) return

  const fuseOptions = {
    keys: ['name'],
    threshold: 0.3,
    includeScore: true,
    includeMatches: true,
  }

  fuse.value = new Fuse(bucketRows.value, fuseOptions)
}

// Filtered buckets based on search
const filteredBuckets = computed(() => {
  if (!bucketRows.value) return []

  if (!searchQuery.value || !fuse.value) {
    return bucketRows.value
  }

  const searchResults = fuse.value.search(searchQuery.value)
  return searchResults.map((result: any) => result.item)
})

// Search input handler
const onSearchInput = () => {
  // Auto-expand search results
}

// Select bucket and load its content
const selectBucket = async (bucket: any) => {
  selectedBucket.value = bucket
  await loadBucketContent(bucket)
}

// Load bucket content
const loadBucketContent = async (bucket: any) => {
  if (!db.value) return

  isLoadingContent.value = true
  bucketContentError.value = null

  try {
    // Query to get bucket content - this will depend on your specific bucket structure
    // For now, we'll use a generic query that should work with most bucket data
    const query = `
      SELECT * FROM ps_oplog WHERE bucket = ?
      ORDER BY op_id DESC
    `

    const result = await db.value.getAll(query, [bucket.id])
    bucketContentRows.value = result
  }
  catch (error) {
    bucketContentError.value = error instanceof Error ? error.message : 'Unknown error occurred'
    bucketContentRows.value = null
  }
  finally {
    isLoadingContent.value = false
  }
}

// Refresh bucket content
const refreshBucketContent = async () => {
  if (selectedBucket.value) {
    await loadBucketContent(selectedBucket.value)
  }
}

// Create dynamic columns based on bucket content
const columns = computed(() => {
  if (!bucketContentRows.value || bucketContentRows.value.length === 0) return []

  const firstRow = bucketContentRows.value[0]
  const dataColumns = Object.keys(firstRow)

  // Create columns array with row number column first
  const columnsArray = [
    // Row number column
    {
      id: 'rowNumber',
      header: '',
      cell: ({ row }: any) => row.index + 1,
      size: 60,
      enableSorting: false,
      enableResizing: false,
    },
    // Data columns
    ...dataColumns.map(key => ({
      accessorKey: key,
      header: key,
      size: 150,
      minSize: 20,
      maxSize: 800,
      enableResizing: true,
      cell: ({ getValue }: any) => {
        const value = getValue()
        if (value === null) return 'NULL'
        if (value === undefined) return 'UNDEFINED'
        if (typeof value === 'object') return JSON.stringify(value)
        return String(value)
      },
    })),
  ]

  return columnsArray
})

// TanStack table setup
const table = useVueTable({
  get data() {
    return bucketContentRows.value || []
  },
  get columns() {
    return columns.value
  },
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
  getPaginationRowModel: getPaginationRowModel(),
  enableColumnResizing: true,
  columnResizeMode: 'onChange',
  defaultColumn: {
    size: 150,
    minSize: 20,
    maxSize: 800,
  },
  initialState: {
    pagination: {
      pageSize: 50,
    },
  },
})

// Pagination control functions
const jumpToPage = () => {
  const pageNumber = Number.parseInt(currentPageInput.value, 10)
  if (pageNumber >= 1 && pageNumber <= table.getPageCount()) {
    table.setPageIndex(pageNumber - 1)
  }
  else {
    currentPageInput.value = String(table.getState().pagination.pageIndex + 1)
  }
}

const updatePageSize = () => {
  const pageSize = Number.parseInt(pageSizeInput.value, 10)
  if (pageSize >= 1 && pageSize <= 1000) {
    table.setPageSize(pageSize)
  }
  else {
    pageSizeInput.value = String(table.getState().pagination.pageSize)
  }
}

// Watch table state to sync inputs
watch(
  () => table.getState().pagination.pageIndex,
  (newPageIndex: number) => {
    currentPageInput.value = String(newPageIndex + 1)
  },
)

watch(
  () => table.getState().pagination.pageSize,
  (newPageSize: number) => {
    pageSizeInput.value = String(newPageSize)
  },
)

// Initialize when bucketRows are available
watch(bucketRows, () => {
  if (bucketRows.value) {
    initializeFuse()
  }
}, { immediate: true })

onMounted(async () => {
  if (bucketRows.value) {
    initializeFuse()
  }
})
</script>

<style scoped>
.bucket-item {
  transition: all 0.2s ease;
}

.bucket-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
</style>
