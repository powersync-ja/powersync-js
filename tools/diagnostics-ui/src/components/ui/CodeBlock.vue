<script setup lang="ts">
import { ref, watch } from 'vue';
import { getHighlighter, CODE_THEME } from '../../composables/highlighter';
import { useTheme } from '../../composables/theme';
import CopyButton from './CopyButton.vue';

const props = withDefaults(defineProps<{ code: string; lang?: string }>(), { lang: 'javascript' });

const { isDark } = useTheme();
const html = ref('');

async function highlight() {
  try {
    const hl = await getHighlighter();
    html.value = hl.codeToHtml(props.code, {
      lang: props.lang,
      theme: isDark.value ? CODE_THEME.dark : CODE_THEME.light
    });
  } catch {
    html.value = '';
  }
}
watch([() => props.code, () => props.lang, isDark], highlight, { immediate: true });
</script>

<template>
  <div class="group relative rounded-md border bg-muted/40 text-left">
    <div class="absolute right-1.5 top-1.5 opacity-0 transition group-hover:opacity-100">
      <CopyButton :value="code" />
    </div>
    <!-- eslint-disable-next-line vue/no-v-html -->
    <div
      v-if="html"
      class="overflow-x-auto p-3 text-xs leading-relaxed [&_pre]:!bg-transparent"
      v-html="html"
    />
    <pre v-else class="overflow-x-auto p-3 text-xs leading-relaxed"><code>{{ code }}</code></pre>
  </div>
</template>
