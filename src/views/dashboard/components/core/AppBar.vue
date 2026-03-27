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

    <v-btn
      class="ml-2 exit-btn"
      color="error"
      small
      @click="logout"
    >
      <v-icon left small>mdi-exit-run</v-icon>
      Exit
    </v-btn>

    <!-- Exit dialog: ask to export workspace snapshot before leaving -->
    <v-dialog
      v-model="guestLogoutDialog"
      max-width="480"
      content-class="guest-logout-dialog"
    >
      <v-card>
        <v-card-title class="headline">
          Leave Neptune?
        </v-card-title>
        <v-card-text>
          If you leave now, your current workspaces may not be saved.
          <br><br>
          Please export your current workspaces to a local zip file before exiting.
          Later, you can restore them from Dashboard using “Import zip”.
          <br><br>
          <v-checkbox
            v-model="dontShowLogoutPromptWeek"
            label="Do not show this message again for 1 week"
            hide-details
          />
        </v-card-text>
        <v-card-actions class="guest-logout-actions">
          <v-spacer />
          <v-btn x-small text @click="cancelLogoutDialog">
            Cancel
          </v-btn>
          <v-btn x-small text color="error" @click="confirmGuestExitWithoutSave">
            Exit without saving
          </v-btn>
          <v-btn
            x-small
            text
            color="primary"
            :loading="guestExporting"
            @click="confirmGuestExportAndExit"
          >
            Export and exit
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-app-bar>
</template>

<script>
  // Components
  import { VHover, VListItem } from 'vuetify/lib'

  // Utilities
  import { mapState, mapMutations } from 'vuex'

  import axios from 'axios'
  import router from '../../../../router'
  import guestStore from '@/lib/guestStore'
  import JSZip from 'jszip'

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
      guestLogoutDialog: false,
      guestExporting: false,
      dontShowLogoutPromptWeek: false,
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
        const isGuest = this.$store.getters.isGuest

        // Check if user asked not to see the logout prompt for a week
        let skipPrompt = false
        try {
          const raw = localStorage.getItem('neptune_logout_prompt_snooze_until')
          if (raw) {
            const ts = Number(raw)
            if (!isNaN(ts) && ts > Date.now()) skipPrompt = true
          }
        } catch (e) {}

        if (skipPrompt) {
          // Directly perform logout according to user type
          if (isGuest) {
            this.$store.commit('clearGuest')
            router.push('/')
          } else {
            const config = {
              withCredentials: true,
              crossorigin: true,
              headers: { 'Content-Type': 'application/json' },
            }
            axios.get('/api/v2/logout', config)
              .then(() => { router.push('/') })
              .catch((error) => { console.log(error) })
          }
          return
        }

        // Show common prompt for both guest and registered users
        this.dontShowLogoutPromptWeek = false
        this.guestLogoutDialog = true
      },

      clearNotifications: function (event) {
        console.log("test", this)
        this.notifications = []
      },

      applyLogoutPromptSnoozeIfNeeded () {
        if (!this.dontShowLogoutPromptWeek) return
        try {
          const weekMs = 7 * 24 * 60 * 60 * 1000
          const until = Date.now() + weekMs
          localStorage.setItem('neptune_logout_prompt_snooze_until', String(until))
        } catch (e) {}
      },

      cancelLogoutDialog () {
        this.applyLogoutPromptSnoozeIfNeeded()
        this.guestLogoutDialog = false
      },

      confirmGuestExitWithoutSave () {
        const isGuest = this.$store.getters.isGuest
        this.applyLogoutPromptSnoozeIfNeeded()
        this.guestLogoutDialog = false
        if (isGuest) {
          this.$store.commit('clearGuest')
          router.push('/')
        } else {
          const config = {
            withCredentials: true,
            crossorigin: true,
            headers: { 'Content-Type': 'application/json' },
          }
          axios.get('/api/v2/logout', config)
            .then(() => { router.push('/') })
            .catch((error) => { console.log(error) })
        }
      },

      async confirmGuestExportAndExit () {
        const isGuest = this.$store.getters.isGuest
        this.guestExporting = true
        try {
          const data = guestStore.exportData()
          const zip = new JSZip()

          zip.file('index.json', JSON.stringify({
            nextWorkspaceId: data.nextWorkspaceId,
            nextFileId: data.nextFileId,
          }, null, 2))

          data.workspaces.forEach((w, idx) => {
            const safeName = (w.name || `workspace_${w._id || idx + 1}`).replace(/[^a-zA-Z0-9_-]/g, '_')
            const folderName = `workspace_${w._id || (idx + 1)}_${safeName}`
            const folder = zip.folder(folderName)
            if (!folder) return

            const meta = {
              _id: w._id,
              name: w.name,
              notes: w.notes,
              updated_at: w.updated_at,
              created_at: w.created_at,
            }
            folder.file('metadata.json', JSON.stringify(meta, null, 2))

            ;(w.files || []).forEach((f, fi) => {
              const base = (f.name || `file_${fi + 1}`).replace(/[^a-zA-Z0-9_-]/g, '_')
              const ext = f.ext && f.ext.startsWith('.') ? f.ext : (f.ext ? `.${f.ext}` : '')
              const filename = `${base}${ext || '.txt'}`
              folder.file(filename, f.content || '')
            })
          })

          const blob = await zip.generateAsync({ type: 'blob' })
          const date = new Date()
          const stamp = [
            date.getFullYear(),
            String(date.getMonth() + 1).padStart(2, '0'),
            String(date.getDate()).padStart(2, '0'),
            '-',
            String(date.getHours()).padStart(2, '0'),
            String(date.getMinutes()).padStart(2, '0'),
          ].join('')
          const filename = `neptune_guest_workspace_${stamp}.zip`
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = filename
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)

          this.applyLogoutPromptSnoozeIfNeeded()
          this.guestLogoutDialog = false

          if (isGuest) {
            this.$store.commit('clearGuest')
            router.push('/')
          } else {
            const config = {
              withCredentials: true,
              crossorigin: true,
              headers: { 'Content-Type': 'application/json' },
            }
            axios.get('/api/v2/logout', config)
              .then(() => { router.push('/') })
              .catch((error) => { console.log(error) })
          }
        } catch (e) {
          // If export fails, still close dialog but keep session so user can try again
          // eslint-disable-next-line no-console
          console.error('Failed to export guest workspace', e)
          this.guestLogoutDialog = false
        } finally {
          this.guestExporting = false
        }
      },
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
.exit-btn {
  font-weight: 700;
}
</style>

<style>
/* Guest logout dialog (global styles because dialog is teleported outside scoped root) */
.guest-logout-dialog .v-card__text {
  font-size: 14px;
}
.guest-logout-dialog .guest-logout-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px;
}
.guest-logout-dialog .guest-logout-actions .v-btn {
  min-width: auto;
  font-size: 12px;
}
</style>
