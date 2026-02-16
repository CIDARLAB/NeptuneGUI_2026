<template>
  <v-app-bar
    id="app-bar"
    absolute
    app
    color="transparent"
    flat
    height="75"
  >
    <v-btn
      class="mr-3 sidebar-toggle-btn"
      elevation="1"
      fab
      small
      color="primary"
      @click="$vuetify.breakpoint.smAndDown ? setDrawer(!drawer) : $emit('input', !value)"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" class="sidebar-toggle-icon" aria-hidden="true">
        <circle cx="5" cy="6" r="1.5" fill="currentColor" />
        <line x1="10" y1="6" x2="22" y2="6" />
        <circle cx="5" cy="12" r="1.5" fill="currentColor" />
        <line x1="10" y1="12" x2="22" y2="12" />
        <circle cx="5" cy="18" r="1.5" fill="currentColor" />
        <line x1="10" y1="18" x2="22" y2="18" />
      </svg>
    </v-btn>

    <v-toolbar-title
      class="hidden-sm-and-down font-weight-light dashboard-appbar-title"
      v-text="$route.name"
    />

    <v-spacer />

    <!-- <v-text-field
      :label="$t('search')"
      color="secondary"
      hide-details
      style="max-width: 165px;"
    >
      <template
        v-if="$vuetify.breakpoint.mdAndUp"
        v-slot:append-outer
      >
        <v-btn
          class="mt-n2"
          elevation="1"
          fab
          small
        >
          <v-icon>mdi-magnify</v-icon>
        </v-btn>
      </template>
    </v-text-field> -->

    <div class="mx-3" />

    <v-menu
      bottom
      left
      offset-y
      origin="top right"
      transition="scale-transition"
    >
      <template v-slot:activator="{ attrs, on }">
        <v-btn
          class="ml-2"
          min-width="0"
          text
          v-bind="attrs"
          v-on="on"
        >
          <v-badge
            color="red"
            :content="totalNotifications"
            :value="totalNotifications"
            overlap
            bordered
          >
            <v-icon color="primary">mdi-bell</v-icon>
          </v-badge>
        </v-btn>
      </template>

      <v-list
        :tile="false"
        nav
      >
        <div>
          <app-bar-item :key="'alerts-page'" to="/alerts">
            <v-list-item-title v-text="'Alerts'" />
          </app-bar-item>
          <v-divider class="mb-2 mt-2" :key="'nd'" />
          <app-bar-item
            v-for="(n, i) in notifications"
            :key="`item-${i}`"
          >
            <v-list-item-title v-text="n.text" />
          </app-bar-item>
          <v-divider
            v-if="notifications.length"
            class="mb-2 mt-2"
          />
          <app-bar-item :key="'clear'" @click.native="clearNotifications">
            <v-list-item-title v-text="'Clear Notifications'" />
          </app-bar-item>
        </div>
      </v-list>
    </v-menu>

    <v-menu
      bottom
      left
      min-width="200"
      offset-y
      origin="top right"
      transition="scale-transition"
    >
      <template v-slot:activator="{ attrs, on }">
        <v-btn
          class="ml-2"
          min-width="0"
          text
          v-bind="attrs"
          v-on="on"
        >
          <v-icon color="primary">mdi-account</v-icon>
        </v-btn>
      </template>

      <v-list
        :tile="false"
        flat
        nav
      >
          <!-- Logged-in user: Profile, Settings, Logout -->
          <template v-if="!isGuest">
            <app-bar-item :key="1">
              <v-list-item-title v-text="'Profile'" />
            </app-bar-item>
            <app-bar-item :key="2">
              <v-list-item-title v-text="'Settings'" />
            </app-bar-item>
            <v-divider class="mb-2 mt-2" :key="'d1'" />
            <app-bar-item :key="3" @click.native="logout">
              <v-list-item-title v-text="'Logout'" />
            </app-bar-item>
          </template>
          <!-- Guest: Login / Register, go to login or register page -->
          <template v-else>
            <app-bar-item :key="'guest-login'" to="/login">
              <v-list-item-title v-text="'Login'" />
            </app-bar-item>
            <app-bar-item :key="'guest-register'" to="/register">
              <v-list-item-title v-text="'Register'" />
            </app-bar-item>
          </template>

        <!-- <template v-for="(p, i) in profile">
          <v-divider
            v-if="p.divider"
            :key="`divider-${i}`"
            class="mb-2 mt-2"
          />

          <app-bar-item
            v-else
            :key="`item-${i}`"
          >
            <v-list-item-title
            v-text="p.title" 
            v-on:click="itemClick"            
            />
          </app-bar-item>
        </template> -->
      </v-list>
    </v-menu>
  </v-app-bar>
</template>

<script>
  // Components
  import { VHover, VListItem } from 'vuetify/lib'

  // Utilities
  import { mapState, mapMutations } from 'vuex'

  import axios from 'axios'
  import router from '../../../../router'

  let self = this
  export default {
    name: 'DashboardCoreAppBar',

    components: {
      AppBarItem: {
        render (h) {
          return h(VHover, {
            scopedSlots: {
              default: ({ hover }) => {
                return h(VListItem, {
                  attrs: this.$attrs,
                  class: {
                    'black--text': !hover,
                    'white--text secondary elevation-12': hover,
                  },
                  props: {
                    activeClass: '',
                    dark: hover,
                    link: true,
                    ...this.$attrs,
                  },
                }, this.$slots.default)
              },
            },
          })
        },
      },
    },

    props: {
      value: {
        type: Boolean,
        default: false,
      },
    },

    data: () => ({
      notifications: [
        // {
        //   text: "This is a test notification",
        //   jobid: 0,
        // },
      ],
      profile: [
        { title: 'Profile' },
        { title: 'Settings' },
        { divider: true },
        { title: 'Log out',
          action: 'logout' 
        },
      ],
    }),

    computed: {
      ...mapState(['drawer']),
      isGuest () {
        return this.$store.getters.isGuest
      },
      totalNotifications: function() {
        return this.notifications.length
      }
    },

    methods: {
      ...mapMutations({
        setDrawer: 'SET_DRAWER',
      }),

      logout (event, context) {
        if (this.$store.getters.isGuest) {
          this.$store.commit('clearGuest')
          router.push('/')
          return
        }
        const config = {
          withCredentials: true,
          crossorigin: true,
          headers: { 'Content-Type': 'application/json' },
        }
        axios.get('/api/v2/logout', config)
          .then(() => { router.push('/login') })
          .catch((error) => { console.log(error) })
      },

      clearNotifications: function(event){
        console.log("test", this)
        this.notifications = []
      }
    },
  }
</script>
<style scoped>
/* Left sidebar toggle: dot + line per row, white */
#app-bar .sidebar-toggle-btn .sidebar-toggle-icon {
  color: #ffffff;
}
#app-bar .sidebar-toggle-btn .sidebar-toggle-icon line {
  stroke: currentColor;
}
#app-bar .sidebar-toggle-btn .sidebar-toggle-icon circle {
  fill: currentColor;
}
#app-bar .v-btn.fab .v-icon {
  color: #ffffff !important;
  opacity: 1;
}
/* Right-side buttons (bell, account): use theme primary blue */
#app-bar .v-btn:not(.fab) .v-icon {
  color: #006994 !important;
  opacity: 1;
}
/* Dashboard / Editor page title: larger font */
.dashboard-appbar-title {
  font-size: 2.5rem;
}
</style>
