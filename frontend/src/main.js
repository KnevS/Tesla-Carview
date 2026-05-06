import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router/index.js';
import { tooltipDirective } from './directives/tooltip.js';
import './style.css';

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.directive('tooltip', tooltipDirective);
app.mount('#app');
