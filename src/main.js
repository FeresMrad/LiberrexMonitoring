// main.js
import { createApp } from "vue";
import App from "./App.vue";
import { createRouter, createWebHistory } from "vue-router";
import MetricsView from "./views/MetricsView.vue";
import Antd from 'ant-design-vue';
import 'ant-design-vue/dist/reset.css';
import DashboardView from "./views/DashboardView.vue";
import EntitiesView from "./views/EntitiesView.vue";
import TestView from "./views/TestView.vue";
import SshDetailsView from "./views/SshDetailsView.vue";

const routes = [
  { path: "/test", component: TestView},
  { path: "/entities/:host", component: MetricsView },
  { path: "/dashboard", component: DashboardView },
  { path: "/entities", component: EntitiesView },
  { path: "/entities/:host/sshdetails", component: SshDetailsView},
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

const app = createApp(App);
app.use(router);
app.use(Antd).mount("#app");
