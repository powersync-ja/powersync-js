// main.ts
import { createApp } from "vue";
import { createAppRouter } from "./plugins/router";
import App from "./App.vue";
import "./style.css";
import { powerSyncPlugin } from "./plugins/powerSync";

const app = createApp(App);
const router = createAppRouter();

app.use(router);
app.use(powerSyncPlugin);
app.mount("#app");
