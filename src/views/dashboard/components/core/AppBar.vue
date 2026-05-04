<template>
  <v-app-bar
    id="app-bar"
    class="neptune-app-bar"
    absolute
    app
    color="white"
    flat
    height="64"
  >
    <v-btn
      class="mr-2 neptune-sidebar-toggle"
      icon
      outlined
      small
      color="primary"
      aria-label="Toggle navigation menu"
      @click="setDrawer(!drawer)"
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
      class="hidden-sm-and-down dashboard-appbar-title"
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
          class="ml-2 neptune-appbar-icon-btn"
          min-width="0"
          text
          color="primary"
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
      EXIT
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
          If you leave now, your current workspaces and component library cache may not be saved.
          <br><br>
          Please export your current workspaces and component library cache to a local zip file before exiting.
          Later, you can restore both from Dashboard using “Import zip”.
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
  import guestStore, { fileContentForZipExport } from '@/lib/guestStore'
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

      /** Leave Neptune in this tab (close if allowed, else blank page—not Landing). */
      leaveApplication () {
        try {
          window.close()
        } catch (_) {}
        try {
          window.location.replace('about:blank')
        } catch (_) {}
      },

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
            this.leaveApplication()
          } else {
            const config = {
              withCredentials: true,
              crossorigin: true,
              headers: { 'Content-Type': 'application/json' },
            }
            axios.get('/api/v2/logout', config)
              .then(() => { this.leaveApplication() })
              .catch((error) => { console.log(error); this.leaveApplication() })
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
          this.leaveApplication()
        } else {
          const config = {
            withCredentials: true,
            crossorigin: true,
            headers: { 'Content-Type': 'application/json' },
          }
          axios.get('/api/v2/logout', config)
            .then(() => { this.leaveApplication() })
            .catch((error) => { console.log(error); this.leaveApplication() })
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
              folder.file(filename, fileContentForZipExport(f.content))
            })
          })

          try {
            const compRes = await axios.get('/api/v1/componentFiles', {
              withCredentials: true,
              headers: { 'Content-Type': 'application/json' },
            })
            zip.file('component_table.json', JSON.stringify(compRes.data || { components: [] }, null, 2))
          } catch (_) {}

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
            this.leaveApplication()
          } else {
            const config = {
              withCredentials: true,
              crossorigin: true,
              headers: { 'Content-Type': 'application/json' },
            }
            axios.get('/api/v2/logout', config)
              .then(() => { this.leaveApplication() })
              .catch((error) => { console.log(error); this.leaveApplication() })
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
/* Sidebar toggle: outlined control so it reads as a button */
#app-bar .neptune-sidebar-toggle {
  border-width: 1px !important;
  box-shadow: 0 1px 2px rgba(0, 51, 73, 0.12);
}
#app-bar .neptune-sidebar-toggle .sidebar-toggle-icon {
  color: currentColor;
}
#app-bar .neptune-sidebar-toggle .sidebar-toggle-icon line {
  stroke: currentColor;
}
#app-bar .neptune-sidebar-toggle .sidebar-toggle-icon circle {
  fill: currentColor;
}
/* Exit: red button, white icon and label; ALL CAPS; +2pt to match Editor toolbar */
#app-bar .exit-btn,
#app-bar .exit-btn .v-btn__content {
  color: #ffffff !important;
  font-size: calc(15px + 2pt) !important;
  text-transform: uppercase !important;
  letter-spacing: 0.04em !important;
}
#app-bar .exit-btn .v-icon {
  color: #ffffff !important;
  opacity: 1;
}
/* Route title: size from src/sass/_neptune-typography.sass */
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
