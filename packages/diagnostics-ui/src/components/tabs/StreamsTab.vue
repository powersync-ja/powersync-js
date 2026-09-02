<script setup lang="ts">
import { ref } from 'vue';
import type { StreamState } from '@powersync/diagnostics-core';
import { useDiagnostics } from '../../composables/diagnostics';
import { formatParams, formatRelative } from '../../lib/format';
import Badge from '../ui/Badge.vue';
import Button from '../ui/Button.vue';
import Card from '../ui/Card.vue';

const { client, streams } = useDiagnostics();

const name = ref('');
const paramsText = ref('');
const error = ref('');

async function subscribe() {
  error.value = '';
  let params: Record<string, unknown> | undefined;
  if (paramsText.value.trim()) {
    try {
      params = JSON.parse(paramsText.value);
    } catch {
      error.value = 'Params must be valid JSON';
      return;
    }
  }
  try {
    // TTL 0: a debug subscription is evicted as soon as it is unsubscribed.
    await client.action({ action: 'subscribeStream', args: { name: name.value, params, ttl: 0 } });
    name.value = '';
    paramsText.value = '';
  } catch (e) {
    error.value = String((e as Error).message ?? e);
  }
}

async function unsubscribe(stream: StreamState) {
  error.value = '';
  try {
    await client.action({ action: 'unsubscribeStream', args: { name: stream.name, params: stream.params } });
  } catch (e) {
    error.value = String((e as Error).message ?? e);
  }
}
</script>

<template>
  <div class="space-y-4">
    <div class="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-[color:var(--warning)]">
      Subscriptions are shared across all tabs and affect the app's real sync. Debug subscriptions use TTL 0 (evicted on
      unsubscribe).
    </div>

    <div v-if="!streams.length" class="text-muted-foreground">No stream subscriptions.</div>
    <div v-else class="overflow-x-auto rounded-lg border">
      <table class="w-full text-sm">
        <thead class="bg-muted/50 text-left text-xs text-muted-foreground">
          <tr>
            <th class="px-3 py-2 font-medium">Stream</th>
            <th class="px-3 py-2 font-medium">Params</th>
            <th class="px-3 py-2 font-medium">Kind</th>
            <th class="px-3 py-2 text-right font-medium">Priority</th>
            <th class="px-3 py-2 font-medium">Synced</th>
            <th class="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in streams" :key="(s.name ?? '') + JSON.stringify(s.params)" class="border-t">
            <td class="px-3 py-2 font-mono">{{ s.name }}</td>
            <td class="px-3 py-2 font-mono text-xs">{{ formatParams(s.params) }}</td>
            <td class="px-3 py-2">
              <div class="flex flex-wrap gap-1">
                <Badge v-if="s.autoSubscribed" variant="muted">default</Badge>
                <Badge v-if="s.explicitlySubscribed" variant="default">explicit</Badge>
                <Badge v-if="s.active" variant="success">active</Badge>
              </div>
            </td>
            <td class="px-3 py-2 text-right tabular-nums">{{ s.priority ?? '—' }}</td>
            <td class="px-3 py-2 text-xs text-muted-foreground">
              {{ s.hasSynced ? formatRelative(s.lastSyncedAt) : 'pending' }}
            </td>
            <td class="px-3 py-2 text-right">
              <Button size="sm" variant="outline" :disabled="!s.explicitlySubscribed" @click="unsubscribe(s)">
                Unsubscribe
              </Button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <Card>
      <div class="space-y-2 p-3">
        <div class="text-xs font-medium text-muted-foreground">Manually subscribe (debug)</div>
        <div class="flex flex-wrap items-center gap-2">
          <input
            v-model="name"
            placeholder="stream name"
            class="h-8 w-40 rounded-md border bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <input
            v-model="paramsText"
            placeholder='params JSON e.g. {"id":1}'
            class="h-8 flex-1 rounded-md border bg-background px-2 font-mono text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Button size="sm" :disabled="!name" @click="subscribe">Subscribe</Button>
        </div>
        <div v-if="error" class="text-xs text-destructive">{{ error }}</div>
      </div>
    </Card>
  </div>
</template>
