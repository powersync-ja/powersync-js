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
          src="https://cdn.prod.website-files.com/67eea61902e19994e7054ea0/67f910109a12edc930f8ffb6_powersync-icon.svg"
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
