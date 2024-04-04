<template>
  <LoginDetailsWidget
    class="d-flex justify-center"
    :secondaryActions="actions"
    :errorMessage="errorMessage"
    @submit="onLogin"
  />
</template>

<script setup lang="ts">
import LoginDetailsWidget from '@/components/widgets/LoginDetailsWidget.vue';
import { DEFAULT_ENTRY_ROUTE, REGISTER_ROUTE } from '@/plugins/router';
import { supabase } from '@/plugins/supabase';
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const errorMessage = ref<string>('');

const onLogin = async (form: { email: string; password: string }) => {
  if (!supabase.ready) {
    throw new Error('Supabase has not been initialized yet');
  }
  errorMessage.value = '';

  try {
    await supabase.login(form.email, form.password);
    router.push(DEFAULT_ENTRY_ROUTE);
  } catch (error) {
    errorMessage.value = (error as any).message || 'unknown failure';
  }
};

const actions = [
  {
    title: 'Register',
    onClick: () => {
      router.push(REGISTER_ROUTE);
    }
  }
];
</script>
