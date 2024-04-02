import './style.css'
import { createApp } from 'vue'
import App from '@/App.vue'
import { createPowerSync } from '@journeyapps/powersync-vue'
import { WASQLitePowerSyncDatabaseOpenFactory } from '@journeyapps/powersync-sdk-web';
import { vuetify } from '@/plugins/vuetify';
import { AppSchema } from './library/powersync/AppSchema';
import { createAppRouter } from '@/plugins/router';

export const db = new WASQLitePowerSyncDatabaseOpenFactory({
  dbFilename: 'example.db',
  schema: AppSchema
}).getInstance();

const app = createApp(App);
const router = createAppRouter();
const powerSyncPlugin = createPowerSync({ database: db });

app.use(powerSyncPlugin);
app.use(vuetify);
app.use(router);
app.mount('#app');