<template>
  <div
    flex="~ justify-between"
    border="b"
    border-color="gray-100"
    py="3"
    mb="3"
  >
    <div flex="~ gap-2">
      <NTip
        :n="`${isConnected ? 'green' : isSyncing ? 'blue' : 'red'} xs`"
        :icon="`${
          isConnected
            ? 'carbon:plug-filled'
            : isSyncing
              ? 'carbon:plug'
              : 'carbon:connection-signal-off'
        }`"
      >
        Powersync is
        {{
          isConnected
            ? "connected"
            : isSyncing
              ? "connecting..."
              : "disconnected"
        }}
      </NTip>
      <NTip
        :n="`${isSyncing ? 'blue' : hasSynced ? 'green' : 'yellow'} xs`"
        :icon="`${
          isSyncing
            ? 'carbon:data-unreal'
            : hasSynced
              ? 'carbon:checkmark-filled'
              : 'carbon:async'
        }`"
      >
        {{ isSyncing ? "Syncing" : hasSynced ? "Synced" : "Not Synced" }}
      </NTip>
      <NTip
        :n="isUploading ? 'green' : 'gray' + ' xs'"
        :icon="isUploading ? 'carbon:cloud-upload' : 'carbon:pause-outline'"
      >
        {{ isUploading ? "Uploading" : "Upload Idle" }}
      </NTip>
      <NTip
        :n="isDownloading ? 'green' : 'gray' + ' xs'"
        :icon="isDownloading ? 'carbon:cloud-download' : 'carbon:pause-outline'"
      >
        {{ isDownloading ? "Downloading" : "Download Idle" }}
      </NTip>
      <NBadge
        flex="~ gap-2 items-center"
        n="gray xs"
        icon="carbon:server-time"
      >
        Last Synced:
        {{ lastSyncedFormatted }}
      </NBadge>
      <NBadge
        flex="~ gap-2 items-center"
        n="gray xs"
        icon="carbon:user-admin"
      >
        Logged in as: {{ userID }}
      </NBadge>
    </div>

    <div flex="~ gap-2">
      <NButton
        n="red sm"
        icon="carbon:clean"
        @click="resync"
      >
        Prune & Re-sync
      </NButton>
      <NDarkToggle />
    </div>
  </div>

  <div flex="~ gap-4">
    <NTip
      v-if="downloadError || uploadError"
      n="red sm"
      mb="3"
      icon="carbon:warning-hex-filled"
    >
      {{ downloadError?.message ?? uploadError?.message }}
    </NTip>
  </div>

  <div
    flex="~ gap-2"
    mb="3"
  >
    <NSelectTabs
      v-model="selectedTab"
      n="amber6 dark:amber5"
      cursor="pointer"
      :options="tabs"
      @update:model-value="handleTabChange"
    />
  </div>

  <!-- switching tabs -->
  <SyncStatusTab v-if="selectedTab === 'sync-status'" />
  <DataInspectorTab v-if="selectedTab === 'data'" />
  <ConfigInspectorTab v-if="selectedTab === 'config'" />
  <BucketsInspectorTab v-if="selectedTab === 'buckets'" />
  <LogsTab v-if="selectedTab === 'logs'" />
  <PowerSyncInstanceTab v-if="selectedTab === 'powersync-instance'" />
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useTimeAgo } from '@vueuse/core'
import { definePageMeta, usePowerSyncInspectorDiagnostics, useRoute, useRouter } from '#imports'
import SyncStatusTab from '../components/SyncStatusTab.vue'
import DataInspectorTab from '../components/DataInspectorTab.vue'
import ConfigInspectorTab from '../components/ConfigInspectorTab.vue'
import LogsTab from '../components/LogsTab.vue'
import BucketsInspectorTab from '../components/BucketsInspectorTab.vue'
import PowerSyncInstanceTab from '../components/PowerSyncInstanceTab.vue'

definePageMeta({
  layout: 'powersync-inspector-layout',
})

const {
  db,
  isConnected,
  isSyncing,
  hasSynced,
  isDownloading,
  isUploading,
  downloadError,
  uploadError,
  lastSyncedAt,
  userID,
  clearData,
} = usePowerSyncInspectorDiagnostics()

onMounted(async () => {
  await db.value?.waitForFirstSync()
})

const route = useRoute()
const router = useRouter()
const selectedTab = ref(route.query.tab as string || 'sync-status')

const handleTabChange = (tab: string) => {
  router.push({ query: { tab } })
}

const tabs = [
  { label: 'Sync Status', value: 'sync-status' },
  { label: 'Data Inspector', value: 'data' },
  { label: 'Buckets Inspector', value: 'buckets' },
  { label: 'Config Inspector', value: 'config' },
  { label: 'Client Logs', value: 'logs' },
  // { label: 'PowerSync Instance', value: 'powersync-instance' },
]

const lastSyncedFormatted = computed(() =>
  lastSyncedAt.value ? useTimeAgo(new Date(lastSyncedAt.value)) : 'NA',
)

const resync = async () => {
  await clearData()
  await db.value?.waitForFirstSync()
}
</script>

<style>
html,
body,
#__nuxt,
#nuxt-test {
  background-color: transparent;
}
</style>
