import { onScopeDispose, ref } from 'vue';

// One shared clock for every component that shows a relative time, so they all tick together.
const now = ref(Date.now());
let timer: ReturnType<typeof setInterval> | null = null;
let subscribers = 0;

/** The current time as a ref that updates every second while any component uses it. */
export function useNow() {
  subscribers++;
  if (!timer) {
    now.value = Date.now();
    timer = setInterval(() => (now.value = Date.now()), 1000);
  }
  onScopeDispose(() => {
    subscribers--;
    if (subscribers === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  });
  return now;
}
