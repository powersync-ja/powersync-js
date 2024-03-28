<template>
    <v-container class="fill-height" fluid>
        <v-row align="center" justify="center">
            <v-col cols="12" sm="8" md="6">
                <v-card class="elevation-1 pa-5">
                    <v-card-title class="text-h4 mb-4">{{ title }}</v-card-title>
                    <div class="d-flex flex-column align-center my-4">
                        <v-img :src="'/powersync-logo.svg'" max-width="400" max-height="100" class="mb-2"></v-img>
                        <v-img :src="'/supabase-logo.png'" max-width="300" max-height="80"></v-img>
                    </div>
                    <v-form ref="form" v-model="valid" @submit.prevent="handleSubmit">
                        <v-text-field v-model="form.email" label="Email Address" :rules="emailRules"
                            required></v-text-field>
                        <v-text-field v-model="form.password" label="Password" type="password" :rules="passwordRules"
                            required></v-text-field>
                        <v-btn :disabled="!valid" type="submit" outlined class="mt-4">{{ submitTitle }}</v-btn>
                        <v-btn v-for="action in secondaryActions" :key="action.title" text @click="action.onClick(form)"
                            class="mt-4">
                            {{ action.title }}
                        </v-btn>
                    </v-form>
                </v-card>
            </v-col>
        </v-row>
    </v-container>
</template>

<script setup lang="ts">
import { computed, ref, defineProps, PropType } from 'vue';
import { useVuelidate } from '@vuelidate/core';
import { email, required } from '@vuelidate/validators';

const form = ref({
    email: '',
    password: '',
});

const props = defineProps({
    title: String,
    secondaryActions: Array,
    submitTitle: String,
});

const emit = defineEmits<{
    submit: [form: typeof form.value]
}>()

const rules = {
    email: { required, email },
    password: { required },
};

const v$ = useVuelidate(rules, form);

const valid = computed(() => v$.value.$error === false);

const handleSubmit = async () => {
    v$.value.$touch();
    if (!valid.value) return;

    try {
        // await .onSubmit(form.value);
        emit('submit', form.value);
    } catch (error) {
        console.error(error);
    }
};
</script>

<style scoped>
/* Add any styles specific to your component here */
</style>