<template>
  <div
    border="t"
    border-color="gray-100"
    relative
    n-bg="base"
    flex="~ col"
    h="screen"
  >
    <div flex="~ col gap-2">
      <NSectionBlock
        icon="carbon:data-share"
        text="Data Flow"
      >
        <div
          grid="~ cols-6 gap-4"
          mb="4"
        >
          <!-- Download Progress -->
          <div flex="~ col gap-2">
            <span text="sm gray-500">Download Progress</span>
            <div flex="~ items-center gap-2">
              <template v-if="downloadProgressDetails !== null">
                <div
                  flex="1"
                  bg="gray-200"
                  rounded="full"
                  h="2"
                >
                  <div
                    bg="blue-600"
                    h="2"
                    rounded="full"
                    transition="all"
                    duration="300"
                    :style="{
                      width: `${totalDownloadProgress}%`,
                    }"
                  />
                </div>
                <span
                  text="sm"
                  font="medium"
                >{{ totalDownloadProgress }}%</span>
              </template>
              <template v-else>
                <span text="sm gray-400">No active download</span>
              </template>
            </div>
          </div>

          <!-- Error Indicator -->
          <div flex="~ col gap-2">
            <span text="sm gray-500">Status</span>
            <NBadge
              :n="downloadError ? 'red' : 'green'"
              :icon="
                downloadError
                  ? 'carbon:warning-filled'
                  : 'carbon:checkmark-filled'
              "
            >
              {{ downloadError ? "Error" : "Healthy" }}
            </NBadge>
          </div>

          <!-- Error Details -->
          <div
            flex="~ col gap-2"
            col="span-4"
          >
            <span text="sm gray-500">Error Message</span>
            <NBadge
              v-if="downloadError"
              n="red sm"
              icon="carbon:warning-filled"
            >
              {{ downloadError.message }}
            </NBadge>
            <NBadge
              v-else
              n="slate sm"
              icon="carbon:checkmark-filled"
            >
              N/A
            </NBadge>
          </div>
        </div>

        <div
          grid="~ cols-6 gap-4"
          mb="4"
        >
          <!-- Upload Progress -->
          <div flex="~ col gap-2">
            <span text="sm gray-500">Upload Progress</span>
            <div flex="~ items-center gap-2">
              <span v-if="syncStatus?.dataFlowStatus.uploading">upload in progress...</span>
              <span
                v-else
                text="sm gray-400"
              >No active upload</span>
            </div>
          </div>

          <!-- Error Indicator -->
          <div flex="~ col gap-2">
            <span text="sm gray-500">Status</span>
            <NBadge
              :n="uploadError ? 'red' : 'green'"
              :icon="
                uploadError
                  ? 'carbon:warning-filled'
                  : 'carbon:checkmark-filled'
              "
            >
              {{ uploadError ? "Error" : "Healthy" }}
            </NBadge>
          </div>

          <div flex="~ col gap-2">
            <span text="sm gray-500">Upload Queue Count</span>
            <span text="sm"> {{ uploadQueueCount }} </span>
          </div>

          <div flex="~ col gap-2">
            <span text="sm gray-500">Upload Queue Size</span>
            <span text="sm">
              {{ uploadQueueSize }}
            </span>
          </div>

          <!-- Error Details -->
          <div
            flex="~ col gap-2"
            col="span-2"
          >
            <span text="sm gray-500">Error Message</span>
            <NBadge
              v-if="uploadError"
              n="red sm"
              icon="carbon:warning-filled"
            >
              {{ uploadError.message }}
            </NBadge>
            <NBadge
              v-else
              n="slate sm"
              icon="carbon:checkmark-filled"
            >
              N/A
            </NBadge>
          </div>
        </div>
      </NSectionBlock>

      <span
        border="b"
        border-color="gray-100"
      />

      <NSectionBlock
        icon="carbon:data-volume"
        text="Data Size"
      >
        <NTip
          v-if="!isDiagnosticSchemaSetup"
          n="red6 dark:red5"
          icon="carbon:warning-alt"
        >
          Make sure to extend your schema with the diagnostics schema using the
          `diagnosticsSchema` from the `usePowerSyncInspector` composable.
        </NTip>
        <div
          v-else
          grid="~ cols-5 gap-4"
          mb="4"
        >
          <div flex="~ col gap-2">
            <span text="sm gray-500">Buckets Synced</span>
            <span text="sm"> {{ totals?.buckets }} </span>
          </div>

          <div flex="~ col gap-2">
            <span text="sm gray-500">Rows Synced</span>
            <span text="sm"> {{ totals?.row_count }} </span>
          </div>

          <div flex="~ col gap-2">
            <span text="sm gray-500">Data size</span>
            <span text="sm">
              {{ totals?.data_size }}
            </span>
          </div>

          <div flex="~ col gap-2">
            <span text="sm gray-500">Metadata size</span>
            <span text="sm">
              {{ totals?.metadata_size }}
            </span>
          </div>

          <div flex="~ col gap-2">
            <span text="sm gray-500">Download size</span>
            <span text="sm">
              {{ totals?.download_size }}
            </span>
          </div>
        </div>
      </NSectionBlock>

      <span
        border="b"
        border-color="gray-100"
      />

      <NSectionBlock
        icon="carbon:data-share"
        text="Operations"
      >
        <NTip
          v-if="!isDiagnosticSchemaSetup"
          n="red6 dark:red5"
          icon="carbon:warning-alt"
        >
          Make sure to extend your schema with the diagnostics schema using the
          `diagnosticsSchema` from the `usePowerSyncInspector` composable.
        </NTip>
        <div
          v-else
          grid="~ cols-2 gap-4"
          mb="4"
        >
          <div flex="~ col gap-2">
            <span text="sm gray-500">Total operations</span>
            <span text="sm">
              {{ totals?.total_operations }}
            </span>
          </div>

          <div flex="~ col gap-2">
            <span text="sm gray-500">Downloaded operations</span>
            <span text="sm">
              {{ totals?.downloaded_operations }}
            </span>
          </div>
        </div>
      </NSectionBlock>

      <span
        border="b"
        border-color="gray-100"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { usePowerSyncInspectorDiagnostics } from '#imports'
import { onMounted } from 'vue'

const {
  db,
  isDiagnosticSchemaSetup,
  syncStatus,
  downloadProgressDetails,
  totalDownloadProgress,
  downloadError,
  uploadError,
  uploadQueueCount,
  uploadQueueSize,
  totals,
} = usePowerSyncInspectorDiagnostics()

onMounted(async () => {
  await db.value?.waitForFirstSync()
})
</script>
