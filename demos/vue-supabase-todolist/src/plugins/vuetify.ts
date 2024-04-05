// Styles
import '@mdi/font/css/materialdesignicons.css';
import 'vuetify/styles';

// Composables
import { createVuetify } from 'vuetify';
import { VFab } from 'vuetify/labs/VFab';
import { VEmptyState } from 'vuetify/labs/VEmptyState';

export const vuetify = createVuetify({
  components: { VFab, VEmptyState },
  theme: {
    defaultTheme: 'dark',
    themes: {
      dark: {
        dark: true,
        colors: {
          primary: '#c44eff'
        }
      }
    }
  }
});
