/**
 * - 创建 Vue 应用实例
 * - 挂载到 #app 元素
 */

import { createApp } from 'vue';
import App from './App.vue';
import './style.css';
import './styles/global.css';

const app = createApp(App);

app.mount('#app');