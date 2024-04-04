<template>
  <LoginDetailsWidget
    class="d-flex justify-center"
    title="Register"
    submitTitle="Register"
    :secondaryActions="actions"
    :errorMessage="errorMessage"
    @submit="onRegister"
  />
</template>

<script setup lang="ts">
import LoginDetailsWidget from '@/components/widgets/LoginDetailsWidget.vue';
import { DEFAULT_ENTRY_ROUTE, LOGIN_ROUTE } from '@/plugins/router';
import { supabase } from '@/plugins/supabase';
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const errorMessage = ref<string>('');

const onRegister = async (form: { email: string; password: string }) => {
  if (!supabase.ready) {
    throw new Error('Supabase has not been initialized yet');
  }
  errorMessage.value = '';

  const {
    data: { session },
    error
  } = await supabase.client.auth.signUp({ email: form.email, password: form.password });

  if (error) {
    errorMessage.value = (error as any).message || 'unknown failure';
    throw new Error(error.message);
  }

  if (session) {
    supabase.updateSession(session);
    router.push(DEFAULT_ENTRY_ROUTE);
    return;
  }

  alert('Registration successful, please login');
  router.push(LOGIN_ROUTE);
};

const actions = [
  {
    title: 'BACK',
    onClick: () => {
      router.push(LOGIN_ROUTE);
    }
  }
];
</script>
