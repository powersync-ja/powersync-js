<script setup lang="ts">
import { useDiagnostics } from '../../composables/diagnostics';
import { formatBytes, formatNumber, formatRelative } from '../../lib/format';
import Card from '../ui/Card.vue';
import Badge from '../ui/Badge.vue';
import Button from '../ui/Button.vue';
import Stat from '../ui/Stat.vue';

const { client, status, uploadQueue } = useDiagnostics();
</script>

<template>
  <div class="space-y-4">
    <div v-if="!status" class="text-muted-foreground">Waiting for status…</div>
    <template v-else>
      <div class="flex flex-wrap items-center gap-2">
        <Badge :variant="status.connected ? 'success' : 'muted'">
          {{ status.connected ? 'Connected' : status.connecting ? 'Connecting' : 'Disconnected' }}
        </Badge>
        <Badge v-if="status.downloading" variant="default">Downloading</Badge>
        <Badge v-if="status.uploading" variant="default">Uploading</Badge>
        <Badge :variant="status.hasSynced ? 'success' : 'warning'">
          {{ status.hasSynced ? 'Has synced' : 'Never synced' }}
        </Badge>
        <span class="text-xs text-muted-foreground">Last synced: {{ formatRelative(status.lastSyncedAt) }}</span>
      </div>

      <Card v-if="status.downloadError || status.uploadError" class="border-destructive/40">
        <div class="space-y-1 p-3 text-sm text-destructive">
          <div v-if="status.downloadError">Download error: {{ status.downloadError }}</div>
          <div v-if="status.uploadError">Upload error: {{ status.uploadError }}</div>
        </div>
      </Card>

      <Card v-if="status.downloadProgress">
        <div class="p-3">
          <div class="mb-1 flex justify-between text-xs text-muted-foreground">
            <span>Download progress</span>
            <span>{{ Math.round(status.downloadProgress.downloadedFraction * 100) }}%</span>
          </div>
          <div class="h-2 w-full overflow-hidden rounded bg-muted">
            <div
              class="h-full bg-primary transition-all"
              :style="{ width: status.downloadProgress.downloadedFraction * 100 + '%' }"
            />
          </div>
          <div class="mt-1 text-xs text-muted-foreground">
            {{ formatNumber(status.downloadProgress.downloadedOperations) }} /
            {{ formatNumber(status.downloadProgress.totalOperations) }} operations
          </div>
        </div>
      </Card>

      <div class="grid grid-cols-3 gap-3">
        <Stat label="Pending uploads" :value="formatNumber(uploadQueue?.count ?? 0)" />
        <Stat label="Upload size" :value="formatBytes(uploadQueue?.size ?? null)" />
        <Stat label="Priorities" :value="status.priorities.length" />
      </div>

      <Card v-if="status.priorities.length">
        <div class="p-3">
          <div class="mb-2 text-xs font-medium text-muted-foreground">Priority sync</div>
          <div class="space-y-1">
            <div v-for="p in status.priorities" :key="p.priority" class="flex items-center justify-between text-sm">
              <span>Priority {{ p.priority }}</span>
              <span class="flex items-center gap-2">
                <Badge :variant="p.hasSynced ? 'success' : 'muted'">{{ p.hasSynced ? 'synced' : 'pending' }}</Badge>
                <span class="text-xs text-muted-foreground">{{ formatRelative(p.lastSyncedAt) }}</span>
              </span>
            </div>
          </div>
        </div>
      </Card>

      <div class="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" @click="client.reconnect()">Reconnect</Button>
        <Button size="sm" variant="outline" @click="client.disconnect()">Disconnect</Button>
        <Button size="sm" variant="destructive" @click="client.clearData()">Clear &amp; re-sync</Button>
      </div>
    </template>
  </div>
</template>
