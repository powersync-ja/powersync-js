<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { PortInfo } from '@powersync/diagnostics-core';
import { useDiagnostics } from '../../composables/diagnostics';
import { formatBytes, formatCompact, formatPrecise } from '../../lib/format';
import Button from '../ui/Button.vue';
import InfoRow from '../ui/InfoRow.vue';
import UploadQueueList, { type CrudOp } from '../UploadQueueList.vue';
import IconId from '~icons/carbon/identification';
import IconUser from '~icons/carbon/user';
import IconLink from '~icons/carbon/link';
import IconConnect from '~icons/carbon/connect';
import IconTime from '~icons/carbon/time';
import IconWarning from '~icons/carbon/warning-alt';
import IconRenew from '~icons/carbon/renew';
import IconDisconnect from '~icons/carbon/connection-signal-off';
import IconReset from '~icons/carbon/reset';
import IconQueue from '~icons/carbon/cloud-upload';
import IconDownload from '~icons/carbon/download';
import IconLayers from '~icons/carbon/layers';

const { client, connected, status, uploadQueue } = useDiagnostics();

const info = ref<PortInfo | null>(null);
const pendingOps = ref<CrudOp[]>([]);

async function loadInfo() {
  try {
    info.value = await client.getInfo();
  } catch {
    /* ignore */
  }
}
async function loadPending() {
  try {
    // Oldest first: the lowest id is the next operation to upload.
    const res = await client.query(
      "SELECT id, json_extract(data, '$.op') AS op, json_extract(data, '$.type') AS tbl, json_extract(data, '$.id') AS row_id FROM ps_crud ORDER BY id"
    );
    pendingOps.value = res.rows as unknown as CrudOp[];
  } catch {
    pendingOps.value = [];
  }
}

watch(
  connected,
  (isConnected) => {
    if (isConnected) {
      loadInfo();
      loadPending();
    }
  },
  { immediate: true }
);
// Refresh the pending list in real time whenever the upload queue changes.
watch(
  () => uploadQueue.value?.count,
  () => connected.value && loadPending()
);

const progress = computed(() => status.value?.downloadProgress ?? null);
// Always show a bar (no layout shift): full when caught up, empty before first sync.
const downloadFraction = computed(() => progress.value?.downloadedFraction ?? (status.value?.hasSynced ? 1 : 0));
const queueCount = computed(() => uploadQueue.value?.count ?? 0);
const downloadError = computed(() => status.value?.downloadError ?? null);
const uploadError = computed(() => status.value?.uploadError ?? null);
</script>

<template>
  <div v-if="!status" class="text-xs text-muted-foreground">Waiting for status…</div>

  <div v-else class="space-y-3">
    <!-- Connection / identity -->
    <section class="rounded-lg border bg-card">
      <header class="flex items-center gap-1.5 border-b px-3 py-1.5 text-xs font-medium text-muted-foreground">
        <IconId class="size-3.5" /> Connection
      </header>
      <div class="divide-y">
        <InfoRow :icon="IconId" label="Client ID" :value="info?.clientId" mono copyable />
        <InfoRow :icon="IconUser" label="User ID" :value="info?.userId" mono copyable />
        <InfoRow :icon="IconLink" label="Endpoint" :value="info?.endpoint" mono copyable />
        <InfoRow :icon="IconConnect" label="Method" :value="info?.connectionMethod" />
        <InfoRow :icon="IconTime" label="Last synced">
          <span :class="status.hasSynced ? 'tabular-nums' : 'text-warning'">
            {{ status.hasSynced ? formatPrecise(status.lastSyncedAt) : 'Never synced' }}
          </span>
        </InfoRow>
      </div>
    </section>

    <!-- Download health: progress (always visible) + errors -->
    <section class="rounded-lg border bg-card">
      <header class="flex items-center justify-between border-b px-3 py-1.5 text-xs">
        <span class="inline-flex items-center gap-1.5 font-medium text-muted-foreground"><IconDownload class="size-3.5" /> Download</span>
        <span class="tabular-nums text-foreground">
          <template v-if="progress">
            {{ formatCompact(progress.downloadedOperations) }} / {{ formatCompact(progress.totalOperations) }} ops ·
          </template>
          {{ Math.round(downloadFraction * 100) }}%
        </span>
      </header>
      <div class="space-y-2 px-3 py-2">
        <div class="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            class="h-full rounded-full transition-all"
            :class="status.downloading ? 'bg-primary' : 'bg-success'"
            :style="{ width: downloadFraction * 100 + '%' }"
          />
        </div>
        <div v-if="downloadError" class="flex items-start gap-1.5 text-xs text-destructive">
          <IconWarning class="mt-0.5 size-3.5 shrink-0" />
          <span class="break-words">{{ downloadError }}</span>
        </div>
      </div>
    </section>

    <!-- Upload health: full queue (virtualized, oldest first) + errors -->
    <section class="rounded-lg border bg-card">
      <header class="flex items-center justify-between border-b px-3 py-1.5 text-xs">
        <span class="inline-flex items-center gap-1.5 font-medium text-muted-foreground"><IconQueue class="size-3.5" /> Upload queue</span>
        <span class="tabular-nums text-foreground">{{ formatCompact(queueCount) }} to upload · {{ formatBytes(uploadQueue?.size ?? null) }}</span>
      </header>
      <div v-if="uploadError" class="flex items-start gap-1.5 border-b px-3 py-2 text-xs text-destructive">
        <IconWarning class="mt-0.5 size-3.5 shrink-0" />
        <span class="break-words">{{ uploadError }}</span>
      </div>
      <div v-if="!pendingOps.length" class="px-3 py-2 text-xs text-muted-foreground">No local changes pending.</div>
      <UploadQueueList v-else :ops="pendingOps" />
    </section>

    <!-- Priority sync (always visible) -->
    <section class="rounded-lg border bg-card">
      <header class="flex items-center gap-1.5 border-b px-3 py-1.5 text-xs font-medium text-muted-foreground">
        <IconLayers class="size-3.5" /> Priority sync
      </header>
      <div v-if="!status.priorities.length" class="px-3 py-2 text-xs text-muted-foreground">None</div>
      <ul v-else class="divide-y text-xs">
        <li v-for="p in status.priorities" :key="p.priority" class="flex items-center justify-between px-3 py-1.5">
          <span>Priority {{ p.priority }}</span>
          <span class="inline-flex items-center gap-2">
            <span :class="p.hasSynced ? 'text-success' : 'text-muted-foreground'">{{ p.hasSynced ? 'synced' : 'pending' }}</span>
            <span class="tabular-nums text-muted-foreground">{{ formatPrecise(p.lastSyncedAt) }}</span>
          </span>
        </li>
      </ul>
    </section>

    <!-- Actions -->
    <div class="flex flex-wrap gap-2">
      <Button size="sm" variant="outline" @click="client.reconnect()"><IconRenew class="size-3.5" /> Reconnect</Button>
      <Button size="sm" variant="outline" @click="client.disconnect()"><IconDisconnect class="size-3.5" /> Disconnect</Button>
      <Button size="sm" variant="destructive" @click="client.clearData()"><IconReset class="size-3.5" /> Clear &amp; re-sync</Button>
    </div>
  </div>
</template>
