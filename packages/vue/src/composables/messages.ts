export const setupTopLevelWarningMessage = `[PowerSync err]: Incorrect use of usePowerSync detected. The usePowersync, usePowerSyncQuery, and usePowerSyncWatchedQuery composables are meant to be invoked in the top-level setup block of a component.

Below are examples illustrating the right and wrong ways to use it, annotated with inline comments clarity.

Incorrect Usage Example:
Using powerSync composables in a nested function of a component.

\`\`\`typescript
<script setup lang="ts">
import { usePowerSync } from '@powersync/vue';

const exampleFunction = async () => {
  // ❌ Incorrect: 'usePowerSync()' called inside a nested function
  const result = await usePowerSync().value.getAll("select * from test");
  console.log(result);
}
</script>
\`\`\`

Correct Usage Example:
It's important to initialize usePowerSync at the top level of your setup function and then use the assigned constant.

\`\`\`typescript
<script setup lang="ts">
import { usePowerSync } from '@powersync/vue';

// ✅ Correct: usePowerSync initialized at the top level of setup function and used as a variable.
const powerSync = usePowerSync();

const exampleFunction = async () => {
  const result = await powerSync.value.getAll("select * from test");
  console.log(result);
}
</script>
\`\`\`
`;
