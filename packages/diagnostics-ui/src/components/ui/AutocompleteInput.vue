<script setup lang="ts">
import { computed, ref } from 'vue';
import Fuse from 'fuse.js';

const model = defineModel<string>({ required: true });
const props = defineProps<{ options: string[]; placeholder?: string }>();

const open = ref(false);
const active = ref(0);

const filtered = computed(() => {
  const q = model.value.trim();
  const list = q
    ? new Fuse(props.options, { threshold: 0.4, ignoreLocation: true }).search(q).map((r) => r.item)
    : props.options;
  return list.slice(0, 8);
});

function select(value: string) {
  model.value = value;
  open.value = false;
}
function onInput() {
  open.value = true;
  active.value = 0;
}
function onBlur() {
  // Delay so a click on an option registers before the list closes.
  setTimeout(() => (open.value = false), 120);
}
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'ArrowDown') {
    open.value = true;
    active.value = Math.min(active.value + 1, filtered.value.length - 1);
    e.preventDefault();
  } else if (e.key === 'ArrowUp') {
    active.value = Math.max(active.value - 1, 0);
    e.preventDefault();
  } else if (e.key === 'Enter' && open.value && filtered.value[active.value]) {
    select(filtered.value[active.value]);
    e.preventDefault();
  } else if (e.key === 'Escape') {
    open.value = false;
  }
}
</script>

<template>
  <div class="relative">
    <input
      v-model="model"
      :placeholder="placeholder"
      autocomplete="off"
      class="h-7 w-full rounded-md border bg-transparent px-2 text-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
      @focus="open = true"
      @blur="onBlur"
      @input="onInput"
      @keydown="onKeydown"
    />
    <ul
      v-if="open && filtered.length"
      class="absolute left-0 top-full z-20 mt-1 max-h-48 w-full overflow-auto rounded-md border bg-card py-1 shadow-md"
    >
      <li v-for="(opt, i) in filtered" :key="opt">
        <button
          type="button"
          :class="[
            'block w-full truncate px-2 py-1 text-left font-mono text-xs',
            i === active ? 'bg-accent text-accent-foreground' : 'hover:bg-accent'
          ]"
          @mousedown.prevent="select(opt)"
          @mouseenter="active = i"
        >
          {{ opt }}
        </button>
      </li>
    </ul>
  </div>
</template>
