import { createRouter, createWebHistory } from 'vue-router';
import FormComponent from '../components/FormComponent.vue';
import UserInfo from '../components/UserInfo.vue';

const routes = [
  { path: '/', component: FormComponent },
  { path: '/user-info', component: UserInfo },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
