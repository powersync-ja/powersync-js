<template>
  <div class="container mx-auto my-10 px-4">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-md font-semibold text-gray-900">Status: {{ status.connected ? 'Connected' : 'Disconnected' }}</h1>
      <button @click="logout()" class="text-red-500 hover:text-red-700 font-semibold">Logout</button>
    </div>

    <h1 class="text-center text-3xl md:text-4xl font-semibold text-gray-900 mb-6">To Do List</h1>
    <div class="max-w-2xl mx-auto bg-white shadow-md rounded-lg p-6">
      <form @submit.prevent="addTodo">
        <div class="flex items-center mb-4 space-x-3">
          <input
            v-model="newTodo"
            type="text"
            class="flex-1 px-4 py-2 rounded-lg border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
            id="todo-input"
            placeholder="Add new task"
            required
          />
          <button
            type="submit"
            :disabled="newTodo.length === 0"
            class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-blue-300"
          >
            Add
          </button>
        </div>
      </form>
      <ul id="todo-list" class="divide-y divide-gray-200">
        <li
          v-for="(todo, index) in todos"
          :key="index"
          class="py-4 flex justify-between items-center border-b border-gray-200 p-4"
        >
          <div class="flex items-center">
            <input
              type="checkbox"
              class="mr-2 h-4 w-4 text-blue-500 rounded"
              @change="updateTodo(index)"
              :checked="todo.completed === 1"
            />
            <div :class="{ 'line-through': todo.completed }" class="text-lg text-gray-800">
              {{ todo.description }}
            </div>
          </div>
          <button @click.prevent="removeTodo(index)" class="text-red-500 hover:text-red-700 font-semibold">X</button>
        </li>
      </ul>
    </div>
  </div>
</template>

// TodoList.vue
<script setup lang="ts">
import { ref } from 'vue';
import { usePowerSync, useQuery, useStatus } from '@powersync/vue';
import { TodoRecord } from '../library/AppSchema';
import { supabase } from '../plugins/supabase';
import { useRouter } from 'vue-router';

const powersync = usePowerSync();
const status = useStatus();
const router = useRouter();
if (!supabase.ready) {
  supabase.registerListener({
    initialized: () => {
      /**
       * Redirect if on the entry view
       */
      if (supabase.currentSession) {
        router.push('/');
      } else {
        router.push('/login');
      }
    }
  });
} else {
  router.push('/');
}

// Define a type for the Todo item
type Todo = TodoRecord;

const newTodo = ref<string>('');
const { data: todos } = useQuery<Todo>('SELECT * from todos');

const logout = async () => {
  await supabase.client.auth.signOut();
};
const addTodo = async () => {
  if (newTodo.value.trim()) {
    await powersync.value.execute(
      'INSERT INTO todos (id, created_at, description, completed) VALUES (uuid(), datetime(), ?, ?) RETURNING *',
      [newTodo.value, 0]
    );
    newTodo.value = '';
  }
};

const updateTodo = async (index: number) => {
  const todo = todos.value[index];
  await powersync.value.execute('UPDATE todos SET completed = ? WHERE id = ?', [!todo.completed, todo.id]);
};

const removeTodo = async (index: number) => {
  const todo = todos.value[index];
  await powersync.value.execute('DELETE FROM todos WHERE id = ?', [todo.id]);
};
</script>
