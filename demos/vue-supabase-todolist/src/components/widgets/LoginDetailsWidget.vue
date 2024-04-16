<template>
  <v-container class="fill-height" fluid>
    <v-card class="elevation-1 pa-5" width="600">
      <v-card-title class="text-h4 pl-0 mb-0 text-left">{{ title }}</v-card-title>
      <div class="d-flex flex-column align-center ma-12">
        <img alt="PowerSync Logo" width="400" src="@/assets/powersync-logo.svg" />
        <img alt="Supabase Logo" width="300" src="@/assets/supabase-logo.png" />
      </div>
      <v-form ref="form" @submit.prevent="handleSubmit">
        <v-text-field
          v-model="state.email"
          variant="outlined"
          label="Email Address"
          :error-messages="emailMessage"
          required
        />
        <v-text-field
          v-model="state.password"
          variant="outlined"
          label="Password"
          type="password"
          :error-messages="passwordMessage"
          required
        />
        <div class="d-flex justify-end">
          <v-btn
            color="primary"
            v-for="action in secondaryActions"
            :key="action.title"
            variant="text"
            @click="action.onClick(state)"
            class="mt-4"
          >
            {{ action.title }}
          </v-btn>
          <v-btn color="primary" :disabled="!valid" type="submit" variant="outlined" class="mt-4">{{
            submitTitle
          }}</v-btn>
        </div>
      </v-form>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
export type LoginDetailsFormValues = {
  email: string;
  password: string;
};

export type LoginAction = {
  title: string;
  onClick: (values: LoginDetailsFormValues) => any;
};

import { useVuelidate } from '@vuelidate/core';
import { email, required } from '@vuelidate/validators';
import { computed, PropType, reactive, toValue } from 'vue';

const props = defineProps({
  title: { type: String, default: 'Login' },
  submitTitle: { type: String, default: 'Login' },
  secondaryActions: { type: Array as PropType<LoginAction[]>, default: () => [] },
  errorMessage: { type: String, default: '' }
});

const initialState = {
  email: '',
  password: ''
};

const state = reactive({
  ...initialState
});

const emit = defineEmits<{
  submit: [form: typeof initialState];
}>();

const rules = {
  email: { required, email },
  password: { required }
};

const v$ = useVuelidate(rules, state);
const valid = computed(() => v$.value.$error === false);

const emailMessage = computed(() => v$.value.email.$errors.map((e) => toValue(e.$message)));
const passwordMessage = computed(() => props.errorMessage || v$.value.password.$errors.map((e) => toValue(e.$message)));

const handleSubmit = async () => {
  v$.value.$touch();
  if (!valid.value) return;

  try {
    emit('submit', state);
  } catch (error) {
    console.error(error);
  }
};
</script>

<style scoped>
.v-input :deep(.v-messages) {
  text-align: left;
}
</style>
