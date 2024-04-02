<template>
  <LoginDetailsWidget :secondaryActions="actions" @submit="onLogin" :errorMessage="errorMessage" />
</template>

<script setup lang="ts">
import LoginDetailsWidget from '@/components/widgets/LoginDetailsWidget.vue';
import { REGISTER_ROUTE } from '@/plugins/router';
import { supabase } from '@/plugins/supabase';
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const errorMessage = ref<string>('');

const onLogin = async (form: { email: string, password: string }) => {
  if (!supabase) {
    throw new Error('Supabase has not been initialized yet');
  }
  try {
    await supabase.login(form.email, form.password);
  } catch (error) {
    errorMessage.value = (error as any).message || 'unknown failure';

  }
  // navigate(DEFAULT_ENTRY_ROUTE);
  // router.push('/');
};

const actions = [
  {
    title: 'Register',
    onClick: () => {
      router.push(REGISTER_ROUTE);
    },
  },
];

</script>
