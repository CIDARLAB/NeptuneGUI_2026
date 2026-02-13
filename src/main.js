// =========================================================
// * Vuetify Material Dashboard PRO - v2.1.0
// =========================================================
//
// * Product Page: https://www.creative-tim.com/product/vuetify-material-dashboard-pro
// * Copyright 2019 Creative Tim (https://www.creative-tim.com)
//
// * Coded by Creative Tim
//
// =========================================================
//
// * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

import Vue from "vue";
import axios from "axios";
import App from "./App.vue";
import router from "./router";
import store from "./store";
import "./plugins/base";

// For production: set VUE_APP_API_BASEURL in .env.production to Neptune_2026 backend URL when not same-origin
if (process.env.VUE_APP_API_BASEURL) {
  axios.defaults.baseURL = process.env.VUE_APP_API_BASEURL;
}
import "./plugins/chartist";
import "./plugins/vee-validate";
import "./plugins/vue-world-map";
import vuetify from "./plugins/vuetify";
import i18n from "./i18n";
import VueSocketIO from "vue-socket.io";

import * as Sentry from "@sentry/vue";
import { Integrations } from "@sentry/tracing";

Sentry.init({
  Vue,
  dsn:
    "https://f3be65f5f52c4d10848f481cc1230e99@o522267.ingest.sentry.io/5633457",
  integrations: [new Integrations.BrowserTracing()],
  logErrors: true,
  // We recommend adjusting this value in production, or using tracesSampler
  // for finer control
  tracesSampleRate: 1.0
});

Vue.config.productionTip = false;

// For production: set VUE_APP_SOCKET_URL; otherwise defaults to current hostname:3000 (Neptune_2026 Socket.IO)
const socketUrl = process.env.VUE_APP_SOCKET_URL || "http://" + window.location.hostname + ":3000";
Vue.use(
  new VueSocketIO({
    debug: true,
    connection: socketUrl
    // vuex: {
    //     store,
    //     actionPrefix: 'SOCKET_',
    //     mutationPrefix: 'SOCKET_'
    // },
    // options: { path: "/my-app/" } //Optional options
  })
);

router.beforeEach((to, from, next) => {
  const authRequired = to.matched.some(route => route.meta.requiresAuth);
  const canAccess = store.getters.canAccessApp; // logged-in user or guest

  if (canAccess && (to.path === '' || to.path === '/')) {
    next('/dashboard');
    return;
  }
  if (authRequired && !canAccess) {
    next('/login');
    return;
  }
  next();
});

new Vue({
  router,
  store,
  vuetify,
  i18n,
  render: h => h(App)
}).$mount("#app");
