import { createRouter, createWebHistory } from 'vue-router';
import DashboardView from '../views/DashboardView.vue';
import AgentDetailView from '../views/AgentDetailView.vue';
import CallDetailView from '../views/CallDetailView.vue';

const routes = [
  { path: '/', name: 'dashboard', component: DashboardView },
  { path: '/agents/:id', name: 'agent', component: AgentDetailView },
  { path: '/calls/:id', name: 'call', component: CallDetailView },
];

export default createRouter({
  history: createWebHistory(),
  routes,
});
