<script setup lang="ts">
const client = useSupabaseClient()
const user = useSupabaseUser()
const powerSync = usePowerSync()

const logout = async () => {
  await powerSync.value.disconnectAndClear()

  await client.auth.signOut()
  navigateTo('/login')
}
</script>

<template>
  <UHeader :toggle="false">
    <template #left>
      <UButton
        variant="link"
        @click="navigateTo('/')"
      >
        <img
          src="~/assets/img/powersync-icon.svg"
          alt="Powersync"
          class="size-10 inline-flex"
        >
      </UButton>
    </template>

    <template #right>
      <UColorModeButton variant="link" />

      <UButton
        v-if="user"
        variant="link"
        class="cursor-pointer"
        color="neutral"
        @click="logout"
      >
        Logout
      </UButton>
    </template>
  </UHeader>
</template>
