<script setup lang="ts">
import { ref, watch } from 'vue';
import { getHighlighter, CODE_THEME } from '../../composables/highlighter';
import { useTheme } from '../../composables/theme';

const model = defineModel<string>({ required: true });
defineProps<{ placeholder?: string }>();
const emit = defineEmits<{ run: [] }>();

const { isDark } = useTheme();
const highlighted = ref('');
const preRef = ref<HTMLElement | null>(null);

async function highlight() {
  try {
    const hl = await getHighlighter();
    highlighted.value = hl.codeToHtml(model.value || ' ', {
      lang: 'sql',
      theme: isDark.value ? CODE_THEME.dark : CODE_THEME.light
    });
  } catch {
    highlighted.value = '';
  }
}
watch([model, isDark], highlight, { immediate: true });

function onScroll(e: Event) {
  const ta = e.target as HTMLTextAreaElement;
  if (preRef.value) {
    preRef.value.scrollTop = ta.scrollTop;
    preRef.value.scrollLeft = ta.scrollLeft;
  }
}
function onKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    e.preventDefault();
    emit('run');
  }
}
</script>

<template>
  <div class="relative h-24 overflow-hidden rounded-md border bg-muted/40 font-mono text-xs leading-5">
    <!-- Highlighted layer (behind); the Shiki <pre> is padded/leading-matched to the textarea. -->
    <div
      ref="preRef"
      class="pointer-events-none absolute inset-0 overflow-auto whitespace-pre [&>pre]:!m-0 [&>pre]:!bg-transparent [&>pre]:p-2 [&>pre]:leading-5"
      aria-hidden="true"
      v-html="highlighted"
    />
    <!-- Editable layer (front); text transparent once highlighting is ready so the caret shows over the highlight. -->
    <textarea
      v-model="model"
      spellcheck="false"
      :placeholder="placeholder"
      :class="[
        'absolute inset-0 size-full resize-none overflow-auto whitespace-pre bg-transparent p-2 leading-5 caret-foreground outline-none placeholder:text-muted-foreground',
        highlighted ? 'text-transparent' : 'text-foreground'
      ]"
      @scroll="onScroll"
      @keydown="onKeydown"
    />
  </div>
</template>
