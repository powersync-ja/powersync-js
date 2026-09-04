<script setup lang="ts">
import { useDiagnostics } from '../../composables/diagnostics';
import { formatBytes, formatNumber } from '../../lib/format';
import Badge from '../ui/Badge.vue';

const { buckets } = useDiagnostics();
</script>

<template>
  <div>
    <div v-if="!buckets.length" class="text-muted-foreground">No buckets.</div>
    <div v-else class="overflow-x-auto rounded-lg border">
      <table class="w-full text-sm">
        <thead class="bg-muted/50 text-left text-xs text-muted-foreground">
          <tr>
            <th class="px-3 py-2 font-medium">Bucket</th>
            <th class="px-3 py-2 text-right font-medium">Operations</th>
            <th class="px-3 py-2 text-right font-medium">Size</th>
            <th class="px-3 py-2 font-medium">Last op</th>
            <th class="px-3 py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="b in buckets" :key="b.name" class="border-t">
            <td class="px-3 py-2 font-mono">{{ b.name }}</td>
            <td class="px-3 py-2 text-right tabular-nums">
              {{ formatNumber(b.downloadedOperations) }}<span
                v-if="b.totalOperations != null"
                class="text-muted-foreground"
              >
                / {{ formatNumber(b.totalOperations) }}</span
              >
            </td>
            <td class="px-3 py-2 text-right tabular-nums">{{ formatBytes(b.downloadedSize) }}</td>
            <td class="px-3 py-2 font-mono text-xs">{{ b.lastOp ?? '—' }}</td>
            <td class="px-3 py-2">
              <Badge :variant="b.downloading ? 'default' : 'muted'">{{ b.downloading ? 'downloading' : 'idle' }}</Badge>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
