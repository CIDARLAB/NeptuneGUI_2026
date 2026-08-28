<template>
  <v-navigation-drawer
    id="core-navigation-drawer"
    v-model="drawer"
    dark
    :right="$vuetify.rtl"
    :src="barImage || undefined"
    mobile-break-point="960"
    app
    mini-variant-width="56"
    width="260"
    v-bind="$attrs"
  >
    <template v-slot:img="props">
      <v-img
        :gradient="`to bottom, ${barColor}`"
        v-bind="props"
      />
    </template>

    <v-list-item two-line class="drawer-logo-item">
      <v-list-item-content>
        <v-list-item-title class="d-flex align-center">
          <img
            :src="logo"
            class="drawer-logo-img"
            contain
          />
        </v-list-item-title>
      </v-list-item-content>
    </v-list-item>

    <v-divider class="mb-1" />

    <!-- <v-list dense nav>
      <base-item-group :item="profile" />
    </v-list>
    <v-divider class="mb-2" /> -->

    <v-list
      expand
      nav
    >
      <!-- Style cascading bug  -->
      <!-- https://github.com/vuetifyjs/vuetify/pull/8574 -->
      <div />

      <template v-for="(item, i) in computedItems">
        <base-item-group
          v-if="item.children"
          :key="`group-${i}`"
          :item="item"
        >
          <!--  -->
        </base-item-group>

        <base-item
          v-else
          :key="`item-${i}`"
          :item="item"
        />
      </template>

      <!-- Style cascading bug  -->
      <!-- https://github.com/vuetifyjs/vuetify/pull/8574 -->
      <div />
    </v-list>

    <v-divider class="mt-2" />
    <div class="drawer-export-hint pa-4">
      <div class="drawer-export-control d-flex flex-column align-center">
        <v-tooltip right>
          <template v-slot:activator="{ on, attrs }">
            <v-btn
              color="success"
              depressed
              small
              block
              class="drawer-export-rect-btn"
              aria-label="Export workspaces as zip"
              v-bind="attrs"
              v-on="on"
              @click="exportWorkspacesZip"
            >
              <v-icon
                left
                small
                color="white"
              >
                mdi-download
              </v-icon>
              <span>Export</span>
            </v-btn>
          </template>
          <span>Export all workspaces and component library cache as a .zip backup.</span>
        </v-tooltip>
        <div class="drawer-export-text text-center mt-3">
          Tip: export regularly to back up both workspaces and component library cache.
        </div>
        <v-tooltip right>
          <template v-slot:activator="{ on, attrs }">
            <v-btn
              depressed
              small
              block
              class="drawer-export-rect-btn drawer-import-rect-btn mt-4"
              aria-label="Import workspaces from zip"
              v-bind="attrs"
              v-on="on"
              @click="triggerImportZip"
            >
              <v-icon
                left
                small
                color="white"
              >
                mdi-upload
              </v-icon>
              <span>Import</span>
            </v-btn>
          </template>
          <span>Restore workspaces and component library cache from a previously exported .zip backup.</span>
        </v-tooltip>
        <div class="drawer-export-text text-center mt-3">
          Tip: import a previous .zip backup to restore workspaces and component library cache.
        </div>
      </div>
    </div>
    <input
      ref="importZipInput"
      type="file"
      accept=".zip,application/zip"
      style="display: none"
      @change="onImportZip"
    >
    <v-dialog v-model="importConflictDialog" max-width="560px">
      <v-card>
        <v-card-title>Workspace conflicts detected</v-card-title>
        <v-card-text>
          The imported zip contains workspaces that already exist in your online account. Choose whether to overwrite them with the imported content.
          <v-list dense class="mt-3">
            <v-list-item v-for="(c, idx) in importConflicts" :key="idx">
              <v-list-item-content>
                <v-list-item-title>{{ c.name }}</v-list-item-title>
              </v-list-item-content>
            </v-list-item>
          </v-list>
          <v-checkbox v-model="importOverwriteConfirmed" label="Overwrite these workspaces using the imported zip" class="mt-2" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text color="primary" @click="closeImportConflictDialog">Cancel</v-btn>
          <v-btn :disabled="!importOverwriteConfirmed" color="primary" @click="confirmImportOverwrite">Import and overwrite</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-navigation-drawer>
</template>

<script>
  // Utilities
  import {
    mapState,
  } from 'vuex'

  import JSZip from 'jszip'
  import guestStore from '@/lib/guestStore'
  import axios from 'axios'
  import { exportFilenameStamp } from '../../../../utils'
  import {
    fillBackupZip,
    readWorkspacesFromZip,
    readJsonFromZip,
    fetchJobsForBackup,
    fetchComponentTable,
    downloadZipBlob,
    applyGeneratedFilesToGuestStore,
  } from '@/lib/workspaceBackupZip'

  export default {
    name: 'DashboardCoreDrawer',

    data: () => ({
      logo: require('@/assets/Neptune2026_logo_white_text.png'),
      importConflictDialog: false,
      importConflicts: [],
      importOverwriteConfirmed: false,
      _pendingImportZipFile: null,
      items: [
        {
          icon: 'mdi-view-dashboard',
          title: 'Dashboard',
          to: '/dashboard',
        },
        {
          icon: 'mdi-code-tags',
          title: 'Editor',
          to: '/editor',
        },
        {
          icon: 'mdi-file-multiple-outline',
          title: 'Jobs',
          to: '/jobs',
        },
        {
          icon: 'mdi-database',
          title: 'Component Library',
          to: '/library',
        },
        {
          icon: 'mdi-book-open-page-variant',
          title: 'References',
          to: '/references',
        },
        // {
        //   group: '',
        //   icon: 'mdi-image',
        //   title: 'pages',
        //   children: [
        //     {
        //       title: 'pricing',
        //       to: 'pricing',
        //     },
        //     // {
        //     //   title: 'rtl',
        //     //   to: 'rtl',
        //     // },
        //     // {
        //     //   title: 'timeline',
        //     //   to: 'timeline',
        //     // },
        //     {
        //       title: 'login',
        //       to: 'login',
        //     },
        //     {
        //       title: 'register',
        //       to: 'pricing',
        //     },
        //     {
        //       title: 'lock',
        //       to: 'lock',
        //     },
        //     {
        //       title: 'user',
        //       to: 'user',
        //     },
        //     {
        //       title: 'error',
        //       to: '404',
        //     },
        //   ],
        // },
        // {
        //   group: '/components',
        //   icon: 'mdi-view-comfy',
        //   title: 'components',
        //   children: [
        //     {
        //       title: 'multi',
        //       group: '',
        //       children: [
        //         {
        //           title: 'example',
        //           href: '#',
        //         },
        //       ],
        //     },
        //     {
        //       title: 'buttons',
        //       to: 'buttons',
        //     },
        //     {
        //       title: 'grid',
        //       to: 'grid-system',
        //     },
        //     {
        //       title: 'tabs',
        //       to: 'tabs',
        //     },
        //     {
        //       title: 'notifications',
        //       to: 'notifications',
        //     },
        //     {
        //       title: 'icons',
        //       to: 'icons',
        //     },
        //     {
        //       title: 'typography',
        //       to: 'typography',
        //     },
        //   ],
        // },
        // {
        //   group: '/forms',
        //   icon: 'mdi-clipboard-outline',
        //   title: 'forms',
        //   children: [
        //     {
        //       title: 'rforms',
        //       to: 'regular',
        //     },
        //     {
        //       title: 'eforms',
        //       to: 'extended',
        //     },
        //     {
        //       title: 'vforms',
        //       to: 'validation',
        //     },
        //     {
        //       title: 'wizard',
        //       to: 'wizard',
        //     },
        //   ],
        // },
        // {
        //   group: '/tables',
        //   icon: 'mdi-grid',
        //   title: 'tables',
        //   children: [
        //     {
        //       title: 'rtables',
        //       to: 'regular-tables',
        //     },
        //     {
        //       title: 'etables',
        //       to: 'extended-tables',
        //     },
        //     {
        //       title: 'dtables',
        //       to: 'data-tables',
        //     },
        //   ],
        // },
        // {
        //   group: '/maps',
        //   icon: 'mdi-map-marker',
        //   title: 'maps',
        //   children: [
        //     {
        //       title: 'google',
        //       to: 'google-maps',
        //     },
        //     {
        //       title: 'fullscreen',
        //       to: 'full-screen-map',
        //     },
        //   ],
        // },
        // {
        //   icon: 'mdi-widgets',
        //   title: 'widgets',
        //   to: '/widgets',
        // },
        // {
        //   icon: 'mdi-chart-timeline-variant',
        //   title: 'charts',
        //   to: '/charts',
        // },
        // {
        //   icon: 'mdi-calendar-range',
        //   title: 'calendar',
        //   to: '/calendar',
        // },
      ],
    }),

    computed: {
      ...mapState(['barColor', 'barImage']),
      drawer: {
        get () {
          return this.$store.state.drawer
        },
        set (val) {
          this.$store.commit('SET_DRAWER', val)
        },
      },
      computedItems () {
        return this.items.map(this.mapItem)
      },
      isGuest () {
        return this.$store.getters.isGuest
      },
      profile () {
        return {
          avatar: true,
          group: '',
          title: this.$t('avatar'),
          children: [
            {
              to: '/user',
              title: this.$t('my-profile'),
            },
            {
              to: '/profile',
              title: this.$t('edit-profile'),
            },
            {
              to: '/settings',
              title: this.$t('settings'),
            },
          ],
        }
      },
    },

    methods: {
      notifyBackupImported () {
        this.$root.$emit('neptune-backup-imported')
      },
      async exportWorkspacesZip () {
        if (!this.isGuest) {
          try {
            const res = await axios.get('/api/v1/exportWorkspacesZip', {
              withCredentials: true,
              responseType: 'blob',
            })
            const blob = new Blob([res.data], { type: 'application/zip' })
            downloadZipBlob(blob, `neptune_${exportFilenameStamp()}.zip`)
          } catch (_) {
            alert('Failed to export zip')
          }
          return
        }

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
      },
      triggerImportZip () {
        const el = this.$refs.importZipInput
        if (el) el.click()
      },
      closeImportConflictDialog () {
        this.importConflictDialog = false
        this.importOverwriteConfirmed = false
        this.importConflicts = []
        this._pendingImportZipFile = null
      },
      async confirmImportOverwrite () {
        if (!this._pendingImportZipFile) return
        await this.importZipToServer(this._pendingImportZipFile, { overwrite: true })
        this.closeImportConflictDialog()
        this.notifyBackupImported()
      },
      async onImportZip (e) {
        const file = e.target.files && e.target.files[0]
        if (!file) return
        try { e.target.value = '' } catch (_) {}

        if (this.isGuest) {
          await this.importGuestZip(file)
          return
        }

        await this.importZipToServer(file, { overwrite: false })
      },
      async importZipToServer (file, { overwrite }) {
        try {
          const buf = await file.arrayBuffer()
          const url = `/api/v1/importWorkspacesZip${overwrite ? '?overwrite=1' : '?dryRun=1'}`
          await axios.post(url, buf, {
            withCredentials: true,
            headers: { 'Content-Type': 'application/zip' },
          })

          if (!overwrite) {
            await axios.post('/api/v1/importWorkspacesZip', buf, {
              withCredentials: true,
              headers: { 'Content-Type': 'application/zip' },
            })
            this.notifyBackupImported()
          }
        } catch (err) {
          const status = err && err.response && err.response.status
          const data = err && err.response && err.response.data
          if (status === 409 && data && data.conflicts) {
            this.importConflicts = data.conflicts
            this.importOverwriteConfirmed = false
            this._pendingImportZipFile = file
            this.importConflictDialog = true
            return
          }
          alert('Failed to import zip')
        }
      },
      async importGuestZip (file) {
        try {
          const zip = await JSZip.loadAsync(file)
          const parsed = await readWorkspacesFromZip(zip)
          const componentTable = await readJsonFromZip(zip, 'component_table.json', null)
          const jobs = await readJsonFromZip(zip, 'jobs.json', [])

          const payload = {
            workspaces: parsed.workspaces,
            nextWorkspaceId: parsed.nextWorkspaceId,
            nextFileId: parsed.nextFileId,
          }

          if (guestStore.importData(payload)) {
            this.$store.commit('SET_WORKSPACE', null)
          }

          applyGeneratedFilesToGuestStore(guestStore, Array.isArray(jobs) ? jobs : [])

          if (Array.isArray(jobs) && jobs.length) {
            try {
              await axios.post('/api/v1/restoreSessionJobs', { jobs }, {
                withCredentials: true,
                headers: { 'Content-Type': 'application/json' },
              })
            } catch (_) {}
          }

          if (componentTable && Array.isArray(componentTable.components)) {
            const customRows = componentTable.components.filter(c => c && c.showLfrMint === false && c.jsonScript)
            for (const row of customRows) {
              try {
                // eslint-disable-next-line no-await-in-loop
                await axios.post('/api/v1/componentFiles/upload', {
                  name: row.name || row.syntax || 'component',
                  jsonText: row.jsonScript,
                  syntax: row.syntax || undefined,
                }, {
                  withCredentials: true,
                  headers: { 'Content-Type': 'application/json' },
                })
              } catch (_) {}
            }
          }

          this.notifyBackupImported()
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error('Import failed', err)
          alert('Failed to import zip')
        }
      },
      mapItem (item) {
        return {
          ...item,
          children: item.children ? item.children.map(this.mapItem) : undefined,
          title: this.$t(item.title),
        }
      },
    },
  }
</script>

<style lang="sass">

  @import '~vuetify/src/styles/tools/_rtl.sass'

  #core-navigation-drawer
    /* Slower width ease + fade nav labels (logo / export block are outside nav.v-list) */
    &.v-navigation-drawer
      transition-duration: 0.45s !important
      transition-timing-function: cubic-bezier(0.22, 1, 0.36, 1) !important

    .v-navigation-drawer__content
      transition: opacity 0.4s cubic-bezier(0.22, 1, 0.36, 1)

    nav.v-list .v-list-item__content
      transition: opacity 0.34s cubic-bezier(0.22, 1, 0.36, 1)

    &.v-navigation-drawer--mini-variant:not(.v-navigation-drawer--is-mouseover) nav.v-list .v-list-item__content
      opacity: 0

    &:not(.v-navigation-drawer--mini-variant) nav.v-list .v-list-item__content,
    &.v-navigation-drawer--is-mouseover nav.v-list .v-list-item__content
      opacity: 1

    .v-list-item,
    .v-list-item__title
      font-size: 14pt !important
    .v-list-group__header.v-list-item--active:before
      opacity: .24

    .v-list-item
      &__icon--text,
      &__icon:first-child
        justify-content: center
        text-align: center
        width: 20px

        +ltr()
          margin-right: 24px
          margin-left: 12px !important

        +rtl()
          margin-left: 24px
          margin-right: 12px !important

    .v-list--dense
      .v-list-item
        &__icon--text,
        &__icon:first-child
          margin-top: 10px

    .drawer-export-hint
      display: flex
      flex-direction: column
      align-items: center
      width: 100%

      .drawer-export-control
        width: 100%
        max-width: 220px

      .drawer-export-rect-btn
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.18) !important
        font-size: 14pt !important
        font-weight: 400 !important
        text-transform: none !important
        letter-spacing: normal !important

      .drawer-import-rect-btn
        background-color: #006994 !important
        border-color: #006994 !important
        color: #ffffff !important

      .drawer-export-text
        font-size: 14pt !important
        font-weight: 400
        line-height: 1.35
        color: rgba(255, 255, 255, 0.9)
        max-width: 220px

    .v-list-group--sub-group
      .v-list-item
        +ltr()
          padding-left: 8px

        +rtl()
          padding-right: 8px

      .v-list-group__header
        +ltr()
          padding-right: 0

        +rtl()
          padding-right: 0

        .v-list-item__icon--text
          margin-top: 19px
          order: 0

        .v-list-group__header__prepend-icon
          order: 2

          +ltr()
            margin-right: 8px

          +rtl()
            margin-left: 8px
</style>
<style scoped>
  .logo-img {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 34px;
    width: 34px;
    border-radius: 50%;
    text-align: center;
    overflow: hidden;
  }
  .drawer-logo-item .v-list-item__content {
    padding-left: 12px;
    justify-content: flex-start;
  }
  .v-navigation-drawer--mini-variant .drawer-logo-item .v-list-item__content {
    padding-left: 12px;
    justify-content: flex-start;
  }
  .drawer-logo-img {
    max-height: 40px;
    width: auto;
    object-fit: contain;
    display: block;
  }
  .v-navigation-drawer--mini-variant .drawer-logo-img {
    max-height: 32px;
  }
</style>
