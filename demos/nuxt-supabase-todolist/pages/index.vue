<script setup lang="ts">
import type { Database, TaskRecord } from '~/powersync/AppSchema'

const client = useSupabaseClient()
const user = asyncComputed(async () => await client.auth.getUser().then(res => res.data.user))
const toast = useToast()

const db = usePowerSyncKysely<Database>()
const { clearData } = usePowerSyncInspectorDiagnostics()

const taskQuery = computed(() => db.selectFrom('tasks')
  .where('user_id', '=', user.value?.id ?? '')
  .orderBy('created_at')
  .selectAll(),
)

const { data: tasks, isLoading } = await useQuery(taskQuery)

console.log('tasks', tasks.value)

const newTask = ref('')

async function addTask() {
  if (newTask.value.trim().length === 0) return
  try {
    if (user.value) {
      await db.insertInto('tasks').values({
        user_id: user.value.id,
        description: newTask.value,
        completed: 0,
        id: crypto.randomUUID(),
      }).execute()
    }
  }
  catch (error: any) {
    toast.add({
      title: 'Error',
      description: error.message,
      color: 'error',
    })
  }
  newTask.value = ''
}

const completeTask = async (
  task: TaskRecord,
) => {
  await db.updateTable('tasks').set({ completed: task.completed, completed_at: task.completed ? new Date().toISOString() : null }).where('id', '=', task.id).execute()
}

const removeTask = async (
  task: TaskRecord,
) => {
  await db.deleteFrom('tasks').where('id', '=', task.id).execute()
}

const links = [
  {
    label: 'PowerSync Inspector',
    to: '/__powersync-inspector',
    icon: 'lucide:binoculars',
    color: 'neutral' as const,
  },
  {
    label: 'PowerSync Documentation',
    to: 'https://docs.powersync.com/intro/powersync-overview',
    color: 'neutral' as const,
    variant: 'subtle' as const,
    trailingIcon: 'i-lucide-arrow-right',
    target: '_blank',
  },
]
</script>

<template>
  <UContainer>
    <UPageSection
      title="Todo List."
      description="Demo of a simple todo list app using PowerSync and Nuxt."
      headline="PowerSync x Nuxt"
      :links="links"
    >
      <div class="flex justify-center items-center">
        <div class="flex flex-col gap-4 w-xl">
          <div class="flex gap-2">
            <UInput
              v-model="newTask"
              :loading="isLoading"
              class="w-full"
              size="xl"
              variant="subtle"
              placeholder="Make a coffee"
              autofocus
              @keyup.enter="addTask"
            />
            <UButton
              icon="i-lucide-plus"
              trailing
              :loading="isLoading"
              @click="addTask"
            >
              Add
            </UButton>
          </div>
          <div v-if="tasks.length > 0">
            <UCard variant="subtle">
              <ul>
                <li
                  v-for="task of tasks"
                  :key="task.id"
                  class="border-b border-muted last:border-b-0 py-3 first:pt-0 last:pb-0"
                >
                  <div class="flex items-center justify-between gap-2 min-w-0">
                    <span
                      class="truncate"
                      :class="task.completed ? 'line-through text-muted' : ''"
                    >
                      {{ task.description }}
                    </span>

                    <div class="flex items-center gap-2">
                      <USwitch
                        v-model="task.completed"
                        unchecked-icon="i-lucide-x"
                        checked-icon="i-lucide-check"
                        size="lg"
                        @update:model-value="completeTask(task)"
                      />
                      <UButton
                        variant="link"
                        icon="i-lucide-trash"
                        color="neutral"
                        @click="removeTask(task)"
                      />
                    </div>
                  </div>
                </li>
              </ul>
            </UCard>
            <div class="flex justify-end mt-4">
              <UButton
                label="Clear & Re-sync"
                color="neutral"
                variant="link"
                @click="clearData()"
              />
            </div>
          </div>
        </div>
      </div>
    </UPageSection>
  </UContainer>
</template>
