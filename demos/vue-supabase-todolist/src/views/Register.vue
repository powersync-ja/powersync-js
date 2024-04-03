<template>
  <LoginDetailsWidget title="Register" submitTitle="Register" :secondaryActions="actions" />
</template>

<script setup>
import LoginDetailsWidget from '@/components/widgets/LoginDetailsWidget.vue';
import { LOGIN_ROUTE } from '@/plugins/router';
import { useRouter } from 'vue-router';

const router = useRouter();

const actions = [
  {
    title: 'BACK',
    onClick: () => {
      router.push(LOGIN_ROUTE);
    }
  }
];
</script>
