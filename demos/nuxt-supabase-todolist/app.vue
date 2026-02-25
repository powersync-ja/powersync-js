<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>

<script setup lang="ts">
useHead({
  meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
  link: [{ rel: 'icon', href: '/favicon.ico' }],
  htmlAttrs: {
    lang: 'en',
  },
})

const title = 'PowerSync Playground'
const description
  = 'Demo of a simple todo list app using PowerSync and Supabase.'

useSeoMeta({
  title,
  ogTitle: title,
  description,
  ogDescription: description,
})

const appIsReady = ref(false)

provide('appIsReady', readonly(appIsReady))

const powerSync = usePowerSync()
const syncStatus = usePowerSyncStatus()

const user = useSupabaseUser()
const { logger: powerSyncLogger } = useDiagnosticsLogger()

watch(user, () => {
  if (user) {
    if (syncStatus.value.hasSynced) {
      powerSyncLogger.log('User is logged in and has synced...', { user: user, syncStatus: syncStatus.value })
      appIsReady.value = true
    }
    else {
      powerSyncLogger.log('User is logged waiting for first sync...', { user: user, syncStatus: syncStatus.value })
      powerSync.value.waitForFirstSync().then(() => {
        appIsReady.value = true
      })
    }
  }
  else {
    powerSyncLogger.log('User is not logged in disconnecting...', { user: user, syncStatus: syncStatus.value })
    powerSync.value.disconnect()
    appIsReady.value = true
  }
}, { immediate: true })
</script>
