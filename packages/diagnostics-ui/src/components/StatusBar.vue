<script setup lang="ts">
import { computed } from 'vue';
import { useDiagnostics } from '../composables/diagnostics';
import { formatCompact, formatRelative } from '../lib/format';
import IconWifi from '~icons/carbon/wifi';
import IconWifiOff from '~icons/carbon/wifi-off';
import IconWarning from '~icons/carbon/warning-alt';
import IconError from '~icons/carbon/error-filled';
import IconConnecting from '~icons/carbon/circle-dash';
import IconDownload from '~icons/carbon/download';
import IconUpload from '~icons/carbon/upload';
import IconRestart from '~icons/carbon/restart';
import IconIdle from '~icons/carbon/dot-mark';
import IconBuckets from '~icons/carbon/data-base';
import IconQueue from '~icons/carbon/cloud-upload';
import IconTime from '~icons/carbon/time';

const { connected, status, buckets, uploadQueue } = useDiagnostics();

/** Primary connection state — one indicator, most-severe first. */
const primary = computed(() => {
  if (!connected.value) {
    return { label: 'No client', icon: IconWarning, tone: 'warning' as const };
  }
  const s = status.value;
  if (s?.downloadError || s?.uploadError) {
    return { label: 'Error', icon: IconError, tone: 'error' as const };
  }
  if (s?.connecting) {
    return { label: 'Connecting', icon: IconConnecting, tone: 'muted' as const, spin: true };
  }
  if (!s?.connected) {
    return { label: 'Offline', icon: IconWifiOff, tone: 'muted' as const };
  }
  return { label: 'Connected', icon: IconWifi, tone: 'success' as const };
});

/** Sync activity — always shown (Idle / Downloading / Uploading / Syncing). */
const activity = computed(() => {
  const s = status.value;
  const down = !!s?.downloading;
  const up = !!s?.uploading;
  if (down && up) return { label: 'Syncing', icon: IconRestart, active: true, spin: true };
  if (down) return { label: 'Downloading', icon: IconDownload, active: true };
  if (up) return { label: 'Uploading', icon: IconUpload, active: true };
  return { label: 'Idle', icon: IconIdle, active: false };
});

const toneClass: Record<string, string> = {
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-destructive',
  muted: 'text-muted-foreground'
};

const errorText = computed(() => status.value?.downloadError ?? status.value?.uploadError ?? null);
const pending = computed(() => uploadQueue.value?.count ?? 0);
const bucketCount = computed(() => buckets.value.length);
const totalOps = computed(() => buckets.value.reduce((sum, b) => sum + (b.downloadedOperations || 0), 0));
const lastSynced = computed(() => (status.value?.lastSyncedAt ? formatRelative(status.value.lastSyncedAt) : null));
</script>

<template>
  <div class="flex items-center gap-3 border-b bg-card/40 px-3 py-1 text-xs tabular-nums text-muted-foreground">
    <!-- Primary connection state -->
    <span :class="['inline-flex items-center gap-1.5 font-medium', toneClass[primary.tone]]">
      <component :is="primary.icon" :class="['size-3.5 shrink-0', primary.spin && 'animate-spin']" />
      {{ primary.label }}
    </span>

    <!-- Sync activity (always visible) -->
    <span
      :class="[
        'inline-flex items-center gap-1',
        activity.active ? 'text-foreground' : 'text-muted-foreground/70'
      ]"
    >
      <component :is="activity.icon" :class="['size-3.5', activity.spin && 'animate-spin', activity.active && !activity.spin && 'animate-pulse']" />
      {{ activity.label }}
    </span>

    <span class="mx-0.5 h-3.5 w-px bg-border" aria-hidden="true" />

    <!-- Aggregate stats -->
    <span class="inline-flex items-center gap-1" title="Buckets · total downloaded operations">
      <IconBuckets class="size-3.5" />
      {{ formatCompact(bucketCount) }} buckets · {{ formatCompact(totalOps) }} ops
    </span>
    <span
      class="inline-flex items-center gap-1"
      :class="pending > 0 && 'text-warning'"
      title="Local changes waiting to upload (pending CRUD queue)"
    >
      <IconQueue class="size-3.5" />
      {{ formatCompact(pending) }} to upload
    </span>
    <span v-if="lastSynced" class="inline-flex items-center gap-1" title="Last synced">
      <IconTime class="size-3.5" />
      synced {{ lastSynced }}
    </span>

    <!-- Error detail, pushed right -->
    <span
      v-if="errorText"
      class="ml-auto inline-flex max-w-[45%] items-center gap-1 truncate text-destructive"
      :title="errorText"
    >
      <IconError class="size-3.5 shrink-0" />
      <span class="truncate">{{ errorText }}</span>
    </span>
  </div>
</template>
