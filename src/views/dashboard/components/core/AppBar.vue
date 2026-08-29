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

    <v-btn
      class="ml-2 neptune-appbar-icon-btn"
      min-width="0"
      text
      color="primary"
      :to="{ name: 'Alerts' }"
      aria-label="Job result alerts"
    >
      <v-badge
        color="red"
        overlap
        bordered
        :content="unreadJobAlertCount"
        :value="unreadJobAlertCount > 0"
      >
        <v-icon color="primary">mdi-bell</v-icon>
      </v-badge>
    </v-btn>

    <!--
    <v-btn
      class="ml-2 exit-btn"
      color="error"
      small
      @click="logout"
    >
      <v-icon left small>mdi-exit-run</v-icon>
      EXIT
    </v-btn>
    -->

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
          Later, you can restore both from the sidebar using Import.
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
  // Utilities
  import { mapState, mapGetters, mapMutations } from 'vuex'

  import axios from 'axios'
  import guestStore from '@/lib/guestStore'
  import JSZip from 'jszip'
  import { exportFilenameStamp } from '../../../../utils'
  import {
    fillBackupZip,
    fetchJobsForBackup,
    fetchComponentTable,
    downloadZipBlob,
  } from '@/lib/workspaceBackupZip'
  import { fetchFullJobs } from '@/lib/jobResultSync'

  export default {
    name: 'DashboardCoreAppBar',

    data: () => ({
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
      jobAlertPollTimer: null,
    }),

    computed: {
      ...mapState(['drawer']),
      ...mapGetters(['unreadJobAlertCount']),
      isGuest () {
        return this.$store.getters.isGuest
      },
    },

    mounted () {
      this.startJobAlertPolling()
    },

    beforeDestroy () {
      this.stopJobAlertPolling()
    },

    methods: {
      ...mapMutations({
        setDrawer: 'SET_DRAWER',
      }),

      startJobAlertPolling () {
        this.stopJobAlertPolling()
        const tick = async () => {
          try {
            const jobs = await fetchFullJobs(axios)
            this.$store.commit('ingestJobSnapshots', jobs)
          } catch (_) {}
          const running = Object.values(this.$store.state.jobStatusById || {}).some((s) => s === 'processing')
          this.stopJobAlertPolling()
          this.jobAlertPollTimer = setTimeout(tick, running ? 2000 : 8000)
        }
        this.jobAlertPollTimer = setTimeout(tick, 400)
      },

      stopJobAlertPolling () {
        if (this.jobAlertPollTimer) {
          clearTimeout(this.jobAlertPollTimer)
          this.jobAlertPollTimer = null
        }
      },

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
        this.$store.commit('clearJobAlerts')
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
          const jobs = await fetchJobsForBackup(axios)
          const componentTable = await fetchComponentTable(axios)
          fillBackupZip(zip, {
            workspaces: data.workspaces,
            jobs,
            componentTable,
            indexExtra: {
              nextWorkspaceId: data.nextWorkspaceId,
              nextFileId: data.nextFileId,
            },
          })

          const blob = await zip.generateAsync({ type: 'blob' })
          downloadZipBlob(blob, `neptune_${exportFilenameStamp()}.zip`)

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
