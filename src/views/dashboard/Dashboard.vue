<template>
  <v-container
    id="dashboard"
    fluid
    tag="section"
  >
    <v-row>
      <!-- <v-col cols="12">
        <base-material-card
          icon="mdi-earth"
          title="Global Sales by Top Locations"
        >
          <v-row>
            <v-col
              cols="12"
              md="6"
              class="mt-10"
            >
              <v-simple-table
                class="ml-2"
              >
                <tbody>
                  <tr
                    v-for="(sale, i) in sales"
                    :key="i"
                  >
                    <td>
                      <v-img
                        :src="sale.flag"
                        width="18"
                      />
                    </td>
                    <td v-text="sale.country" />
                    <td v-text="sale.salesInM" />
                    <td v-text="((sale.salesInM / totalSales) * 100).toFixed(2) + '%'" />
                  </tr>
                </tbody>
              </v-simple-table>
            </v-col>

            <v-col
              cols="12"
              md="6"
            >
              <v-world-map
                :country-data="countryData"
                high-color="#838383"
                low-color="#BBBBBB"
              />
            </v-col>
          </v-row>
        </base-material-card>
      </v-col> -->
      

      <v-col cols="12">
        <div class="d-flex align-center flex-wrap">
          <div class="mt-1 workspace-section-title neptune-section-heading">
            Workspaces
          </div>
          <v-spacer />
          <v-tooltip v-if="isGuest" bottom>
            <template v-slot:activator="{ on, attrs }">
              <v-btn
                small
                color="success"
                depressed
                dark
                class="mt-1 dashboard-guest-export-btn"
                v-bind="attrs"
                v-on="on"
                @click="exportGuestWorkspace"
              >
                <v-icon left small color="white">mdi-download</v-icon>
                Export workspaces
              </v-btn>
            </template>
            <span>Export all workspaces and component library cache as a .zip backup.</span>
          </v-tooltip>
          <v-tooltip bottom>
            <template v-slot:activator="{ on, attrs }">
              <v-btn
                small
                depressed
                dark
                class="mt-1 ml-2 dashboard-guest-import-btn"
                v-bind="attrs"
                v-on="on"
                @click="triggerImportZip"
              >
                <v-icon left small color="white">mdi-upload</v-icon>
                Import workspaces
              </v-btn>
            </template>
            <span>Restore workspaces and component library cache from a previously exported .zip file.</span>
          </v-tooltip>
        </div>
        <div v-if="isGuest" class="guest-storage-hint mt-2">
          <span class="guest-storage-text text-no-wrap">
            Guest data is stored in this browser. Export to a cache file and later restore both workspaces and component library from that file.
          </span>
        </div>
        <input ref="importZipInput" type="file" accept=".zip,application/zip" style="display: none" @change="onImportZip">
      </v-col>

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
      <v-dialog v-model="namingDialog" max-width="520px" persistent>
        <v-card class="dashboard-naming-dialog">
          <v-card-title class="headline">Apply LFR naming convention?</v-card-title>
          <v-card-text>
            <p class="mb-3">
              The name you entered does not match the LFR naming convention
              (lowercase <code>snake_case</code>).
            </p>
            <div class="naming-diff">
              <div class="naming-diff-row">
                <span class="naming-diff-label">You entered</span>
                <code class="naming-diff-original">{{ namingDialogOriginal }}</code>
              </div>
              <div class="naming-diff-row">
                <span class="naming-diff-label">LFR form</span>
                <code class="naming-diff-normalized">{{ namingDialogNormalized }}</code>
              </div>
            </div>
            <p class="caption grey--text text--darken-1 mt-3 mb-0">
              Choose <strong>Use LFR name</strong> to import as
              <code>{{ namingDialogNormalized }}</code>, or <strong>Cancel</strong>
              to abort and re-enter the name yourself.
            </p>
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn text color="grey darken-1" @click="cancelNamingDialog">Cancel</v-btn>
            <v-btn color="primary" depressed @click="confirmNamingDialog">Use LFR name</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
      <v-col
        cols="12"
        lg="3"
        v-for="workspace in workspaces"
        :key="workspace._id"
      >
        <base-material-workspace-chart-card
          class="workspace-dashboard-chart-card"
          :id="workspace._id"
          color="info"
          type="Line"
          :name="workspace.name"
        >
          <div class="workspace-card-toolbar mx-1">
            <div class="workspace-card-actions-row d-flex justify-center align-center">
              <div class="workspace-card-actions d-flex flex-shrink-0 align-center">
                <v-tooltip bottom>
                  <template v-slot:activator="{ attrs, on }">
                    <v-btn
                      v-bind="attrs"
                      text
                      icon
                      color="success"
                      class="workspace-card-action-btn"
                      v-on="on"
                      @click="refreshworkspacedata"
                    >
                      <v-icon>mdi-refresh</v-icon>
                    </v-btn>
                  </template>
                  <span>Refresh dashboard and workspace list</span>
                </v-tooltip>

                <v-tooltip bottom>
                  <template v-slot:activator="{ attrs, on }">
                    <v-btn
                      v-bind="attrs"
                      text
                      icon
                      color="primary"
                      class="workspace-card-action-btn"
                      v-on="on"
                      @click="toggleWorkspaceFiles(workspace._id)"
                    >
                      <v-icon>{{ dashboardFilesWorkspaceId === workspace._id ? 'mdi-chevron-up' : 'mdi-view-split-vertical' }}</v-icon>
                    </v-btn>
                  </template>
                  <span>{{ dashboardFilesWorkspaceId === workspace._id ? 'Hide files for this workspace' : 'Show all files in this workspace' }}</span>
                </v-tooltip>

                <v-tooltip bottom>
                  <template v-slot:activator="{ attrs, on }">
                    <v-btn
                      v-bind="attrs"
                      text
                      icon
                      color="error"
                      class="workspace-card-action-btn"
                      v-on="on"
                      @click="deleteworkspace(workspace._id)"
                    >
                      <v-icon>mdi-delete</v-icon>
                    </v-btn>
                  </template>
                  <span>Delete this workspace and its files</span>
                </v-tooltip>
              </div>
            </div>
          </div>
          <template v-slot:actions>
            <v-icon
              class="mr-1"
              small
            >
              mdi-clock-outline
            </v-icon>
            <span class="caption grey--text font-weight-light workspace-card-last-update">Last Update: {{formattimestamp(workspace.updated_at)}}</span>
          </template>
        </base-material-workspace-chart-card>
      </v-col>

        <v-col
            cols="12"
            align="center"
            class="d-flex align-center justify-center py-6 px-4"
        >
            <p class="create-workspace-hint text-center ma-0">
                To create a new workspace, go to the
                <router-link to="/editor" class="editor-link">Editor</router-link>
                and save your file into a new workspace.
            </p>
        </v-col>

    </v-row>
            <v-row
                v-if="dashboardFilesWorkspaceId"
                class="files-section-row"
                >
                <v-col
                    cols="12"
                    class="d-flex align-center justify-space-between flex-wrap"
                >
                    <div class="mt-1 mr-4 neptune-section-heading">
                      Files
                    </div>
                    <v-btn-toggle
                      v-model="fileViewMode"
                      mandatory
                      dense
                      class="files-view-toggle mt-2 mt-sm-0"
                    >
                      <v-btn value="grid" small class="files-view-btn">
                        <v-icon left small class="files-view-btn-icon">mdi-view-grid</v-icon>
                        Grid view
                      </v-btn>
                      <v-btn value="list" small class="files-view-btn">
                        <v-icon left small class="files-view-btn-icon">mdi-format-list-bulleted</v-icon>
                        List view
                      </v-btn>
                    </v-btn-toggle>
                </v-col>

                <template v-if="fileViewMode === 'grid'">
                  <v-col
                      cols="12"
                      sm="6"
                      md="4"
                      lg="3"
                      xl="2"
                      v-for="(file, i) in files" :key="`grid-${i}`"
                  >
                      <base-material-workspace-stats-card
                          class="file-grid-card"
                          color="info"
                          icon="mdi-file"
                          title="File Type:"
                          :value="file.ext"
                          :name="getFileDisplayName(file)"
                          :ext="file.ext"
                          sub-icon="mdi-clockwise-outline"
                          :sub-text="'Last edited: ' + (file.updated_at ? formattimestamp(file.updated_at) : (file.created_at ? formattimestamp(file.created_at) : '—'))"
                          :id="file.id"
                          :workspaceid="selectedworkspace._id"
                          :content="file.content"
                          v-on:onFileDeleted="refreshFiles"
                          @view3duf="openJsonIn3DuF($event)"
                          @importComponentJson="importWorkspaceJsonToComponentLibrary($event)"
                      />
                  </v-col>

                  <v-col
                      cols="12"
                      sm="6"
                      md="4"
                      lg="3"
                      xl="2"
                  >
                    <v-card class="file-grid-create-tile d-flex flex-column align-center justify-center">
                      <v-btn
                        class="file-grid-create-btn"
                        color="success"
                        fab
                        dark
                        @click="newfiledialog = true"
                      >
                        <v-icon x-large>mdi-plus</v-icon>
                      </v-btn>
                      <div class="file-grid-create-label mt-4">Create a new file</div>
                    </v-card>
                  </v-col>
                </template>

                <template v-else>
                  <v-col cols="12">
                    <v-card class="file-list-table-card">
                      <v-simple-table dense class="file-list-table">
                        <thead>
                          <tr>
                            <th class="file-list-col-name">
                              <button type="button" class="file-list-sort-btn" @click="toggleFileListSort('name')">
                                <span>File Name</span>
                                <v-icon x-small class="ml-1">{{ getFileListSortIcon('name') }}</v-icon>
                              </button>
                            </th>
                            <th class="file-list-col-type">
                              <button type="button" class="file-list-sort-btn" @click="toggleFileListSort('ext')">
                                <span>File Type</span>
                                <v-icon x-small class="ml-1">{{ getFileListSortIcon('ext') }}</v-icon>
                              </button>
                            </th>
                            <th class="file-list-th-last-edited file-list-col-time">
                              <button type="button" class="file-list-sort-btn" @click="toggleFileListSort('updatedAt')">
                                <span>Last Edited</span>
                                <v-icon x-small class="ml-1">{{ getFileListSortIcon('updatedAt') }}</v-icon>
                              </button>
                            </th>
                            <th class="text-right file-list-col-actions">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr v-for="(file, i) in sortedFilesForList" :key="`list-${i}`">
                            <td class="file-list-name-cell file-list-col-name">
                              <div class="file-list-name-scroll">
                                <span class="file-list-name-text">{{ getFileDisplayName(file) }}</span>
                              </div>
                            </td>
                            <td class="file-list-col-type">
                              <code class="file-list-ext-pill" :class="getFileListExtClass(file.ext)">{{ file.ext || '—' }}</code>
                            </td>
                            <td class="file-list-time-cell file-list-col-time">
                              {{ file.updated_at ? formattimestamp(file.updated_at) : (file.created_at ? formattimestamp(file.created_at) : '—') }}
                            </td>
                            <td class="text-right file-list-col-actions">
                              <div class="d-inline-flex align-center file-list-actions">
                                <v-tooltip
                                  v-if="(file.ext || '').toLowerCase() === '.json'"
                                  bottom
                                >
                                  <template v-slot:activator="{ on, attrs }">
                                    <v-btn
                                      text
                                      icon
                                      small
                                      color="purple"
                                      v-bind="attrs"
                                      v-on="on"
                                      @click="viewFileIn3DuF(file)"
                                    >
                                      <img
                                        class="go-3duf-btn-logo go-3duf-btn-logo--sm"
                                        :src="logo3duf"
                                        alt="3DuF"
                                      >
                                    </v-btn>
                                  </template>
                                  <span>Open design JSON in 3DuF</span>
                                </v-tooltip>

                                <v-tooltip
                                  v-if="(file.ext || '').toLowerCase() === '.json'"
                                  bottom
                                >
                                  <template v-slot:activator="{ on, attrs }">
                                    <v-btn
                                      text
                                      icon
                                      small
                                      color="primary"
                                      v-bind="attrs"
                                      v-on="on"
                                      @click="importFileJson(file)"
                                    >
                                      <v-icon small>mdi-database-import-outline</v-icon>
                                    </v-btn>
                                  </template>
                                  <span>Import this JSON into Component Library</span>
                                </v-tooltip>

                                <v-tooltip
                                  v-if="canEditFile(file)"
                                  bottom
                                >
                                  <template v-slot:activator="{ on, attrs }">
                                    <v-btn
                                      text
                                      icon
                                      small
                                      color="blue"
                                      v-bind="attrs"
                                      v-on="on"
                                      @click="editFile(file)"
                                    >
                                      <v-icon small>mdi-pen</v-icon>
                                    </v-btn>
                                  </template>
                                  <span>Open this file in the Editor</span>
                                </v-tooltip>

                                <v-tooltip bottom>
                                  <template v-slot:activator="{ on, attrs }">
                                    <v-btn
                                      text
                                      icon
                                      small
                                      color="red"
                                      v-bind="attrs"
                                      v-on="on"
                                      @click="deleteFile(file)"
                                    >
                                      <v-icon small>mdi-delete</v-icon>
                                    </v-btn>
                                  </template>
                                  <span>Remove this file from the workspace</span>
                                </v-tooltip>
                              </div>
                            </td>
                          </tr>
                          <tr
                            class="file-list-create-row"
                            @click="newfiledialog = true"
                          >
                            <td colspan="4" class="file-list-create-cell">
                              <v-tooltip bottom>
                                <template v-slot:activator="{ on, attrs }">
                                  <span
                                    class="file-list-create-label"
                                    v-bind="attrs"
                                    v-on="on"
                                  >Create a new file</span>
                                </template>
                                <span>Create a new file in this workspace</span>
                              </v-tooltip>
                            </td>
                          </tr>
                        </tbody>
                      </v-simple-table>
                    </v-card>
                  </v-col>
                </template>

                <v-dialog
                  v-model="newfiledialog"
                  max-width="300px"
                >
                  <v-card>
                    <v-card-title>
                        Create New File
                    </v-card-title>
                    <v-card-text>
                        <v-text-field
                            v-model="newfilename"
                            label="File Name"
                            :rules="rules"
                            hide-details="auto"
                            ></v-text-field>
                        <v-select
                          v-model="extname"
                          :items="exts"
                          label="Extension Name"
                          :rules="rules"
                        />
                    </v-card-text>
                    <v-card-actions>
                        <v-spacer></v-spacer>
                        <v-btn
                            color="success"
                            text
                            @click="createfile()"
                            >
                            Create
                        </v-btn>

                        <v-btn
                            color="primary"
                            text
                            @click="newfiledialog = false"
                            >
                            Cancel
                        </v-btn>

                    </v-card-actions>
                  </v-card>
                </v-dialog>
            </v-row>
  </v-container>
</template>

<script>
  import axios from 'axios'
  import { log } from 'util'
  import * as Utils from '../../utils'
  import guestStore, { fileContentForZipExport } from '@/lib/guestStore'
  import { openAndLoadDeviceIn3DuF } from '@/lib/open3DuFPostMessage'
  import { validateAndNormalizeLfrName } from '@/lib/lfrNaming'
  import JSZip from 'jszip'

  export default {
    name: 'DashboardDashboard',

    mounted: async function() {
        this.refreshworkspacedata()
    },
    activated () {
      this.refreshworkspacedata()
    },
    data: () => ({
      logo3duf: require('@/assets/3duf_icon.png'),
      // set rules for the file extension
      rules: [
        value => !!value || 'Required',
      ],
        newworkspacename: '',
        newworkspacedialog: false,
        newfilename: '',
        extname: '',
        newfiledialog: false,
        selectedworkspace: {
            name: '',
            id: '',
        },          
        files: [],
        fileViewMode: 'list',
        fileListSortBy: 'name',
        fileListSortDesc: false,
        workspaces:[],
        workspacesobjects: {},
        actions: [
            {
            color: 'info',
            icon: 'mdi-account',
            },
            {
            color: 'success',
            icon: 'mdi-pencil',
            },
            {
            color: 'error',
            icon: 'mdi-close',
            },
        ],
        exts: ['.mint', '.lfr']
        ,
        importConflictDialog: false,
        importConflicts: [],
        importOverwriteConfirmed: false,
        _pendingImportZipFile: null,
        /** When set, the Files section shows this workspace's files; null = collapsed (default on load / after leaving Dashboard). */
        dashboardFilesWorkspaceId: null,
        namingDialog: false,
        namingDialogOriginal: '',
        namingDialogNormalized: '',
        namingDialogResolver: null,
    }),
    computed: {
      totalSales () {
        return this.sales.reduce((acc, val) => acc + val.salesInM, 0)
      },
      sortedFilesForList () {
        const list = Array.isArray(this.files) ? [...this.files] : []
        const key = this.fileListSortBy
        const desc = !!this.fileListSortDesc
        const toMillis = (f) => {
          const value = (f && (f.updated_at || f.created_at)) || null
          if (!value) return 0
          const time = new Date(value).getTime()
          return Number.isFinite(time) ? time : 0
        }
        const normalize = v => String(v == null ? '' : v).toLowerCase()

        list.sort((a, b) => {
          if (key === 'updatedAt') {
            return toMillis(a) - toMillis(b)
          }
          if (key === 'ext') {
            return normalize(a && a.ext).localeCompare(normalize(b && b.ext))
          }
          return normalize(this.getFileDisplayName(a)).localeCompare(normalize(this.getFileDisplayName(b)))
        })

        return desc ? list.reverse() : list
      },
      isGuest () {
        return this.$store.getters.isGuest
      },
    },

    methods: {
      getFileDisplayName (file) {
        if (!file || typeof file !== 'object') return ''
        const raw = file.name || file.file_name || file.filename || ''
        return String(raw).trim()
      },
      toggleFileListSort (key) {
        if (this.fileListSortBy === key) {
          this.fileListSortDesc = !this.fileListSortDesc
          return
        }
        this.fileListSortBy = key
        this.fileListSortDesc = false
      },
      getFileListSortIcon (key) {
        if (this.fileListSortBy !== key) return 'mdi-unfold-more-horizontal'
        return this.fileListSortDesc ? 'mdi-arrow-down' : 'mdi-arrow-up'
      },
      getFileListExtClass (ext) {
        const lowerExt = String(ext || '').toLowerCase()
        if (lowerExt === '.json') return 'file-list-ext-pill--json'
        if (lowerExt === '.lfr') return 'file-list-ext-pill--lfr'
        if (lowerExt === '.mint') return 'file-list-ext-pill--mint'
        return ''
      },
      canEditFile (file) {
        const lowerExt = String((file && file.ext) || '').toLowerCase()
        return lowerExt !== '.log' && lowerExt !== '.json'
      },
      editFile (file) {
        if (!file || !file.id || !this.canEditFile(file)) return
        this.$store.commit('SET_CURRENT_FILE', file.id)
        this.$router.push('/editor')
      },
      deleteFile (file) {
        if (!file || !file.id) return
        const wid =
          (this.selectedworkspace && this.selectedworkspace._id) ||
          (this.$store.getters.currentWorkspace && this.$store.getters.currentWorkspace._id) ||
          null
        if (!wid) return

        if (this.$store.getters.isGuest) {
          guestStore.deleteFile(wid, file.id)
          this.refreshFiles(wid)
          return
        }

        const config = {
          data: {
            fileid: file.id,
            workspaceid: wid,
          },
          withCredentials: true,
          crossorigin: true,
          headers: { 'Content-Type': 'application/json' },
        }

        axios.delete('/api/v1/file', config)
          .then(() => { this.refreshFiles(wid) })
          .catch((error) => { console.log(error) })
      },
      viewFileIn3DuF (file) {
        if (!file || !file.id) return
        this.openJsonIn3DuF({
          id: file.id,
          name: this.getFileDisplayName(file),
          ext: file.ext,
          workspaceid: (this.selectedworkspace && this.selectedworkspace._id) || undefined,
        })
      },
      importFileJson (file) {
        if (!file || !file.id) return
        this.importWorkspaceJsonToComponentLibrary({
          id: file.id,
          name: this.getFileDisplayName(file),
          workspaceid: (this.selectedworkspace && this.selectedworkspace._id) || undefined,
        })
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
        this.refreshworkspacedata()
      },
      async onImportZip (e) {
        const file = e.target.files && e.target.files[0]
        if (!file) return
        // allow picking same file again later
        try { e.target.value = '' } catch (_) {}

        if (this.isGuest) {
          // Reuse local guest import implementation
          return this.onImportGuestFile({ target: { files: [file] } })
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

          // dryRun with no conflicts, now apply (unless we already overwrote)
          if (!overwrite) {
            await axios.post('/api/v1/importWorkspacesZip', buf, {
              withCredentials: true,
              headers: { 'Content-Type': 'application/zip' },
            })
            this.refreshworkspacedata()
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
      async exportGuestWorkspace () {
        const data = guestStore.exportData()
        const zip = new JSZip()

        // Global index for IDs etc.
        zip.file('index.json', JSON.stringify({
          nextWorkspaceId: data.nextWorkspaceId,
          nextFileId: data.nextFileId,
        }, null, 2))

        // Workspaces: each workspace in its own folder
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
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        const date = new Date()
        const stamp = [
          date.getFullYear(),
          String(date.getMonth() + 1).padStart(2, '0'),
          String(date.getDate()).padStart(2, '0'),
          '-',
          String(date.getHours()).padStart(2, '0'),
          String(date.getMinutes()).padStart(2, '0'),
        ].join('')
        a.download = `neptune_guest_workspace_${stamp}.zip`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(a.href)
      },
      triggerImportGuestFile () {
        this.$refs.guestImportInput && this.$refs.guestImportInput.click()
      },
      async onImportGuestFile (e) {
        const file = e.target.files && e.target.files[0]
        if (!file) return
        try {
          const zip = await JSZip.loadAsync(file)
          const workspaces = []
          let nextWorkspaceId = 1
          let nextFileId = 1

          // Read global index if present
          if (zip.files['index.json']) {
            try {
              const indexStr = await zip.files['index.json'].async('string')
              const index = JSON.parse(indexStr)
              if (index.nextWorkspaceId) nextWorkspaceId = index.nextWorkspaceId
              if (index.nextFileId) nextFileId = index.nextFileId
            } catch (_) {}
          }

          let componentTable = null
          if (zip.files['component_table.json']) {
            try {
              const tableStr = await zip.files['component_table.json'].async('string')
              componentTable = JSON.parse(tableStr)
            } catch (_) {
              componentTable = null
            }
          }

          const folderNames = Object.keys(zip.files)
            .filter(name => name.endsWith('/'))
            .filter(name => name.startsWith('workspace_'))

          for (const folderName of folderNames) {
            const metaFile = zip.file(`${folderName}metadata.json`)
            if (!metaFile) continue
            let meta
            try {
              const metaStr = await metaFile.async('string')
              meta = JSON.parse(metaStr)
            } catch (err) {
              // eslint-disable-next-line no-console
              console.error('Failed to parse workspace metadata', err)
              continue
            }

            const files = []
            Object.keys(zip.files)
              .filter(name => name.startsWith(folderName) && name !== `${folderName}metadata.json` && !name.endsWith('/'))
              .forEach((name, idx) => {
                const entry = zip.files[name]
                const short = name.substring(folderName.length)
                const dot = short.lastIndexOf('.')
                const fileBase = dot > 0 ? short.substring(0, dot) : short
                const ext = dot > 0 ? short.substring(dot) : ''
                files.push({
                  id: String(nextFileId++),
                  name: fileBase,
                  ext,
                  content: null,
                  _entry: entry,
                })
              })

            // Load file contents
            for (const f of files) {
              try {
                // All workspace files are text-based
                // eslint-disable-next-line no-await-in-loop
                f.content = await f._entry.async('string')
              } catch (err) {
                f.content = ''
              }
              delete f._entry
            }

            workspaces.push({
              _id: meta._id != null ? meta._id : String(nextWorkspaceId++),
              name: meta.name || 'Guest Workspace',
              notes: meta.notes || '',
              files,
              updated_at: meta.updated_at || new Date().toISOString(),
              created_at: meta.created_at || undefined,
            })
          }

          const payload = {
            workspaces,
            nextWorkspaceId,
            nextFileId,
          }

          if (guestStore.importData(payload)) {
            this.refreshworkspacedata()
            this.$store.commit('SET_WORKSPACE', null)
          }

          // Restore custom component-library rows from cache zip.
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
        } catch (err) {
          console.error('Import failed', err)
        } finally {
          e.target.value = ''
        }
      },
      askToNormalizeLfrName (originalName, normalizedName) {
        return new Promise((resolve) => {
          this.namingDialogOriginal = originalName
          this.namingDialogNormalized = normalizedName
          this.namingDialogResolver = resolve
          this.namingDialog = true
        })
      },
      confirmNamingDialog () {
        const resolver = this.namingDialogResolver
        this.closeNamingDialog()
        if (resolver) resolver(true)
      },
      cancelNamingDialog () {
        const resolver = this.namingDialogResolver
        this.closeNamingDialog()
        if (resolver) resolver(false)
      },
      closeNamingDialog () {
        this.namingDialog = false
        this.namingDialogOriginal = ''
        this.namingDialogNormalized = ''
        this.namingDialogResolver = null
      },
      async importWorkspaceJsonToComponentLibrary (file) {
        if (!file || !file.id) return
        const fallbackName = String(file.name || 'component').replace(/\.json$/i, '')
        const customName = window.prompt(
          'Component name for the library (LFR naming convention: lowercase snake_case, e.g. droplet_generator):',
          fallbackName
        )
        if (!customName || !String(customName).trim()) return

        const check = validateAndNormalizeLfrName(customName)
        if (!check.valid) {
          alert(`Invalid component name: ${check.reason}`)
          return
        }

        let name = check.normalized
        if (check.needsNormalization) {
          const accepted = await this.askToNormalizeLfrName(String(customName).trim(), check.normalized)
          if (!accepted) {
            alert('Import canceled. Re-enter the name in LFR form (lowercase snake_case) to import.')
            return
          }
          name = check.normalized
        }

        try {
          if (this.$store.getters.isGuest) {
            const workspaceId = file.workspaceid || (this.selectedworkspace && this.selectedworkspace._id)
            if (!workspaceId) return
            const local = guestStore.getFile(workspaceId, file.id)
            const jsonText = local && local.content ? String(local.content) : ''
            JSON.parse(jsonText)
            await axios.post('/api/v1/componentFiles/upload', { name, jsonText }, {
              withCredentials: true,
              headers: { 'Content-Type': 'application/json' },
            })
            alert(`Imported JSON into Component Library as "${name}".`)
            return
          }

          await axios.post('/api/v1/componentFiles/importWorkspaceJson', {
            fileid: file.id,
            name,
          }, {
            withCredentials: true,
            headers: { 'Content-Type': 'application/json' },
          })
          alert(`Imported JSON into Component Library as "${name}".`)
        } catch (err) {
          const msg = (err.response && err.response.data && (err.response.data.error || err.response.data.message)) || err.message
          alert('Import to component library failed: ' + (msg || 'please try again.'))
        }
      },
      openJsonIn3DuF (file) {
        return this.openJsonIn3DuFInternal(file)
      },

      /** Fix literal "[object Object]" (e.g. object sent through text/plain) — same idea as Component Library raw JSON. */
      async normalizeJsonPayloadFor3DuF (rawJsonPayload, file, workspaceId) {
        const isBadObjectString = (v) =>
          typeof v === 'string' && v.trim() === '[object Object]'
        if (typeof rawJsonPayload === 'object' && rawJsonPayload !== null) {
          return rawJsonPayload
        }
        if (!isBadObjectString(rawJsonPayload)) {
          return rawJsonPayload
        }
        if (this.$store.getters.isGuest && workspaceId && file && file.id) {
          const g = guestStore.getFile(workspaceId, file.id)
          if (g && g.content != null) {
            if (typeof g.content === 'object') return g.content
            if (typeof g.content === 'string' && g.content.trim() !== '[object Object]') return g.content
          }
        }
        if (!this.$store.getters.isGuest && file && file.id) {
          try {
            const fsRes = await axios.get('/api/v1/fs', {
              params: { id: file.id },
              withCredentials: true,
              crossorigin: true,
              headers: { 'Content-Type': 'application/json' },
              responseType: 'text',
            })
            const rawText = fsRes && fsRes.data != null ? String(fsRes.data) : ''
            if (rawText.trim() && rawText.trim() !== '[object Object]') {
              return rawText
            }
          } catch (_) {}
        }
        return rawJsonPayload
      },

      async tryRawFsPayloadFor3DuF (file) {
        if (this.$store.getters.isGuest || !file || !file.id) return null
        try {
          const fsRes = await axios.get('/api/v1/fs', {
            params: { id: file.id },
            withCredentials: true,
            crossorigin: true,
            headers: { 'Content-Type': 'application/json' },
            responseType: 'text',
          })
          const rawText = fsRes && fsRes.data != null ? String(fsRes.data) : ''
          return rawText.trim() ? rawText : null
        } catch (_) {
          return null
        }
      },

    parseJsonFor3DuF (rawInput) {
      if (rawInput && typeof rawInput === 'object') {
        try {
          return { jsonObject: rawInput, jsonText: JSON.stringify(rawInput) }
        } catch (_) {
          return { error: 'invalid_json' }
        }
      }

      const nl = String.fromCharCode(10)
      let base = String(rawInput == null ? '' : rawInput)
      if (base.charCodeAt(0) === 65279) base = base.slice(1)
      base = base.trim()

      if (!base) return { error: 'empty' }
      const lower = base.toLowerCase()
      if (lower.startsWith('<!doctype html') || lower.startsWith('<html')) {
        return { error: 'html_response' }
      }

      const candidates = []
      const pushCandidate = (text) => {
        if (typeof text !== 'string') return
        const t = text.trim()
        if (!t) return
        if (!candidates.includes(t)) candidates.push(t)
      }

      const stripBlockComments = (input) => {
        let out = input
        while (true) {
          const start = out.indexOf('/*')
          if (start === -1) break
          const end = out.indexOf('*/', start + 2)
          if (end === -1) {
            out = out.slice(0, start)
            break
          }
          out = out.slice(0, start) + out.slice(end + 2)
        }
        return out
      }

      const extractBalanced = (text, openChar, closeChar) => {
        const parts = []
        let inString = false
        let escape = false
        let depth = 0
        let start = -1

        for (let i = 0; i < text.length; i++) {
          const ch = text[i]
          if (inString) {
            if (escape) {
              escape = false
            } else if (ch.charCodeAt(0) === 92) {
              escape = true
            } else if (ch === '"') {
              inString = false
            }
            continue
          }

          if (ch === '"') {
            inString = true
            continue
          }

          if (ch === openChar) {
            if (depth === 0) start = i
            depth++
          } else if (ch === closeChar && depth > 0) {
            depth--
            if (depth === 0 && start !== -1) {
              parts.push(text.slice(start, i + 1))
              start = -1
            }
          }
        }
        return parts
      }

      pushCandidate(base)

      let unwrappedFence = base
      if (unwrappedFence.startsWith('```')) {
        const firstBreak = unwrappedFence.indexOf(nl)
        if (firstBreak !== -1) {
          unwrappedFence = unwrappedFence.slice(firstBreak + 1)
        }
        if (unwrappedFence.endsWith('```')) {
          unwrappedFence = unwrappedFence.slice(0, -3)
        }
      }
      unwrappedFence = unwrappedFence.trim()
      pushCandidate(unwrappedFence)

      const noLineComments = unwrappedFence
        .split(nl)
        .filter(line => !line.trim().startsWith('//'))
        .join(nl)
        .trim()
      pushCandidate(noLineComments)

      const noBlockComments = stripBlockComments(noLineComments).trim()
      pushCandidate(noBlockComments)

      extractBalanced(noBlockComments, '{', '}').forEach(pushCandidate)
      extractBalanced(noBlockComments, '[', ']').forEach(pushCandidate)

      for (const text of candidates) {
        try {
          let jsonObject = JSON.parse(text)
          if (typeof jsonObject === 'string') {
            try { jsonObject = JSON.parse(jsonObject) } catch (_) {}
          }
          if (jsonObject && typeof jsonObject === 'object') {
            return { jsonObject, jsonText: JSON.stringify(jsonObject) }
          }
        } catch (_) {}
      }

      return { error: 'invalid_json' }
    },

    async openJsonIn3DuFInternal (file) {
        if (!file || !file.id) return

        const workspaceId =
          file.workspaceid ||
          (this.selectedworkspace && this.selectedworkspace._id) ||
          null

        const row = this.files.find(f => String(f.id) === String(file.id))
        const extLower = String((file.ext || (row && row.ext) || '')).toLowerCase()
        const nameLower = String((file.name || (row && row.name) || '')).toLowerCase()
        const isWorkspaceJson =
          extLower === '.json' || (!extLower && nameLower.endsWith('.json'))

        const httpFileParams = {
          params: { id: file.id },
          withCredentials: true,
          crossorigin: true,
          headers: { 'Content-Type': 'application/json' },
        }

        let rawJsonPayload = ''

        try {
          if (isWorkspaceJson) {
            // Workspace JSON: always load like Component Library (raw text / store), not card/list copies.
            if (this.$store.getters.isGuest) {
              if (!workspaceId) {
                // eslint-disable-next-line no-console
                console.error('openJsonIn3DuF: missing guest workspaceId')
                alert('Cannot locate workspace for this JSON file.')
                return
              }
              const f = guestStore.getFile(workspaceId, file.id)
              rawJsonPayload = (f && f.content != null) ? f.content : ''
            } else {
              const fsRes = await axios.get('/api/v1/fs', {
                ...httpFileParams,
                responseType: 'text',
              })
              rawJsonPayload = fsRes && fsRes.data != null ? String(fsRes.data) : ''
              const fsEmpty = typeof rawJsonPayload !== 'string' || !rawJsonPayload.trim()
              if (fsEmpty) {
                const res = await axios.get('/api/v1/file', httpFileParams)
                const data = res && res.data
                rawJsonPayload = data && Object.prototype.hasOwnProperty.call(data, 'content')
                  ? data.content
                  : (data != null ? data : '')
              }
            }
          } else {
            const fromCard = file && Object.prototype.hasOwnProperty.call(file, 'content') ? file.content : undefined
            let r = fromCard !== undefined ? fromCard : (row ? row.content : '')
            const isPreloadedString = (typeof r === 'string' && r.trim().length > 0)
            const hasPreloadedObject = r && typeof r === 'object'
            if (!isPreloadedString && !hasPreloadedObject) {
              if (this.$store.getters.isGuest) {
                if (!workspaceId) {
                  alert('Cannot locate workspace for this JSON file.')
                  return
                }
                const f = guestStore.getFile(workspaceId, file.id)
                r = (f && f.content != null) ? f.content : ''
              } else {
                const res = await axios.get('/api/v1/file', httpFileParams)
                const data = res && res.data
                r = data && Object.prototype.hasOwnProperty.call(data, 'content')
                  ? data.content
                  : (data != null ? data : '')
              }
            }
            rawJsonPayload = r
          }
        } catch (err) {
          const msg = (err.response && err.response.data && (err.response.data.error || err.response.data.message)) || err.message || 'Unknown error'
          alert('Failed to load JSON for 3DuF: ' + msg)
          return
        }

        rawJsonPayload = await this.normalizeJsonPayloadFor3DuF(rawJsonPayload, file, workspaceId)

        const isEmptyString = (typeof rawJsonPayload === 'string' && !rawJsonPayload.trim())
        if (rawJsonPayload == null || isEmptyString) {
          alert('Cannot load JSON content for 3DuF.')
          return
        }

        let parsed = this.parseJsonFor3DuF(rawJsonPayload)
        if (parsed.error && parsed.error !== 'html_response' && !this.$store.getters.isGuest) {
          const rawAlt = await this.tryRawFsPayloadFor3DuF(file)
          if (rawAlt) {
            const trimmedAlt = rawAlt.trim()
            const trimmedCur = typeof rawJsonPayload === 'string' ? rawJsonPayload.trim() : ''
            if (!trimmedCur || trimmedAlt !== trimmedCur) {
              const p2 = this.parseJsonFor3DuF(rawAlt)
              if (!p2.error) {
                parsed = p2
                rawJsonPayload = rawAlt
              }
            }
          }
        }

        if (parsed.error) {
          if (parsed.error === 'html_response') {
            alert('Received HTML instead of JSON. Please refresh Neptune/login again, then retry opening 3DuF.')
          } else {
            const previewRaw = (typeof rawJsonPayload === 'string') ? rawJsonPayload : JSON.stringify(rawJsonPayload || {})
            const preview = String(previewRaw || '').slice(0, 140).split('\n').join(' ')
            if (preview.trim() === '[object Object]') {
              alert('This JSON file appears to be saved as "[object Object]" (corrupted text). Please re-save/re-import the JSON file, then try opening 3DuF again.')
            } else {
              alert('This file is not valid JSON and cannot be opened in 3DuF. Preview: ' + preview)
            }
          }
          return
        }

        const result = openAndLoadDeviceIn3DuF(parsed.jsonObject)
        if (!result.ok) {
          if (result.reason === 'popup_blocked') {
            alert('Popup blocked. Please allow popups to open 3DuF.')
          } else {
            alert('This file is not valid JSON and cannot be opened in 3DuF.')
          }
        }
      },
      formattimestamp(datestring){
        return Utils.getprettytimestamp(datestring)
      },
        refreshworkspacedata () {
          this.workspaces = []
          this.workspacesobjects = {}
          this.files = []
          this.dashboardFilesWorkspaceId = null

          if (this.$store.getters.isGuest) {
            guestStore.ensureExampleWorkspace()
            guestStore.pruneEmptyWorkspaces()
            const list = guestStore.getWorkspacesSortedForDashboard()
            list.forEach(w => {
              this.workspaces.push(w)
              this.workspacesobjects[w._id] = w
            })
            const target = this.$route && this.$route.query && this.$route.query.workspace
            if (target && this.workspacesobjects[target]) {
              this.expandWorkspaceFiles(target)
            } else if (!list.length) {
              this.$store.commit('SET_WORKSPACE', null)
              this.$store.commit('SET_CURRENT_FILE', null)
              this.selectedworkspace = { name: '', id: '' }
              this.files = []
            }
            return
          }

          const config = {
            withCredentials: true,
            crossorigin: true,
            headers: { 'Content-Type': 'application/json' },
          }

          axios.get('/api/v2/user', config)
          .then((response) => {
            console.log('User info:', response.data)
            this.$store.commit('SET_CURRENT_USER', response.data)
          })
          .catch((error) => {
            console.error(error)
          })

          axios.get('/api/v1/workspaces', config)
            .then(async (response) => {
              const widList = response.data || []
              const loaded = []
              for (const wid of widList) {
                try {
                  const filesRes = await axios.get('/api/v1/files', { params: { id: wid }, ...config })
                  const fileIds = filesRes.data || []
                  if (fileIds.length === 0) continue
                  const res = await axios.get('/api/v1/workspace', { params: { workspace_id: wid }, ...config })
                  if (res.data) loaded.push(res.data)
                } catch (error) {
                  console.log(error)
                }
              }
              loaded.forEach((w) => {
                this.workspaces.push(w)
                this.workspacesobjects[w._id] = w
              })
              const target = this.$route && this.$route.query && this.$route.query.workspace
              if (target && this.workspacesobjects[target]) {
                this.expandWorkspaceFiles(target)
              } else if (!loaded.length) {
                this.$store.commit('SET_WORKSPACE', null)
                this.$store.commit('SET_CURRENT_FILE', null)
                this.selectedworkspace = { name: '', id: '' }
                this.files = []
              }
            })
            .catch((error) => { console.log(error) })
        },
        deleteworkspace (wid) {
          if (this.$store.getters.isGuest) {
            guestStore.deleteWorkspace(wid)
            this.refreshworkspacedata()
            return
          }
          const config = {
            data: { id: wid },
            withCredentials: true,
            crossorigin: true,
            headers: { 'Content-Type': 'application/json' },
          }
          axios.delete('/api/v1/workspace', config)
            .then(() => { this.refreshworkspacedata() })
            .catch((error) => { console.log(error) })
        },

        createworkspace () {
          if (this.$store.getters.isGuest) {
            guestStore.createWorkspace(this.newworkspacename)
            this.refreshworkspacedata()
            this.newworkspacedialog = false
            return
          }
          const config = {
            withCredentials: true,
            crossorigin: true,
            headers: { 'Content-Type': 'application/json' },
            name: this.newworkspacename,
          }
          axios.post('/api/v1/workspace', config)
            .then(() => { this.refreshworkspacedata() })
            .catch((errors) => { console.log('Could not create workspace:', errors) })
          this.newworkspacedialog = false
        },
        createfile () {
          const ext = this.extname.match(/\.[0-9a-z]+$/i) ? this.extname.match(/\.[0-9a-z]+$/i)[0] : this.extname
          if (this.$store.getters.isGuest) {
            const ws = this.$store.getters.currentWorkspace
            if (ws && ws._id) {
              guestStore.createFile(ws._id, this.newfilename + this.extname, ext)
              this.refreshFiles(ws._id)
            }
            this.newfiledialog = false
            return
          }
          const config = {
            withCredentials: true,
            crossorigin: true,
            headers: { 'Content-Type': 'application/json' },
            file_name: this.newfilename + this.extname,
            ext,
            workspaceid: this.$store.getters.currentWorkspace,
          }
          axios.post('/api/v1/file', config)
            .then(() => { this.refreshworkspacedata() })
            .catch((errors) => { console.log('Could not create file:', errors) })
          this.newfiledialog = false
        },
        complete (index) {
            this.list[index] = !this.list[index]
        },

        refreshFiles (id) {
          if (this.dashboardFilesWorkspaceId !== id) return
          this.loadWorkspaceFiles(id)
        },
        toggleWorkspaceFiles (workspace_id) {
          if (this.dashboardFilesWorkspaceId === workspace_id) {
            this.collapseWorkspaceFilesPanel()
            return
          }
          this.expandWorkspaceFiles(workspace_id)
        },
        collapseWorkspaceFilesPanel () {
          this.dashboardFilesWorkspaceId = null
          this.files = []
          this.selectedworkspace = { name: '', id: '' }
        },
        expandWorkspaceFiles (workspace_id) {
          this.dashboardFilesWorkspaceId = workspace_id
          this.loadWorkspaceFiles(workspace_id)
        },
        loadWorkspaceFiles (workspace_id) {
          const obj = this.workspacesobjects[workspace_id]
          this.selectedworkspace = obj
          if (obj) this.$store.commit('SET_WORKSPACE', obj)

          if (this.$store.getters.isGuest) {
            this.files = guestStore.getFiles(workspace_id) || []
            return
          }

          const self = this
          axios.get('/api/v1/files', { params: { id: workspace_id } })
            .then((response) => {
              self.files = []
              const ids = response.data || []
              ids.forEach(fid => {
                axios.get('/api/v1/file', { params: { id: fid } })
                  .then((res) => { self.files.push(res.data) })
                  .catch((error) => { console.log(error) })
              })
            })
            .catch((error) => { console.log(error) })
        },
    },
  }
</script>
<style>
    #dashboard {
        font-size: var(--neptune-fs-body, 14pt);
    }
    /* Workspace card action buttons: ensure icons are visible */
    /* Match v-btn small (~13px) and keep both guest toolbar buttons visually identical */
    #dashboard .dashboard-guest-export-btn,
    #dashboard .dashboard-guest-import-btn {
        font-weight: 600 !important;
        text-transform: none !important;
        letter-spacing: normal !important;
        font-size: var(--neptune-fs-body, 14pt) !important;
    }

    #dashboard .dashboard-guest-import-btn {
        background-color: #006994 !important;
        border-color: #006994 !important;
        color: #ffffff !important;
    }

    .theme--dark #dashboard .dashboard-guest-import-btn {
        background-color: #00838f !important;
        border-color: #00838f !important;
    }

    /* "Workspaces" section heading: match Solutions "Jobs" card title size */
    #dashboard .workspace-section-title.neptune-section-heading {
        font-size: var(--neptune-fs-below-page-title) !important;
    }

    /* Workspace cards: light border + shallow shadow (step 3 density) */
    #dashboard .workspace-dashboard-chart-card.v-card.v-card--material {
        padding: 10px 10px 8px !important;
        border: 1px solid rgba(0, 51, 73, 0.12) !important;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06) !important;
    }
    /* Same size as Solutions “Jobs”; not bold */
    #dashboard .workspace-dashboard-chart-card .workspace-chart-heading-name {
        font-size: var(--neptune-fs-below-page-title) !important;
        font-weight: 400 !important;
        min-height: 0 !important;
        padding: 10px 12px !important;
        line-height: 1.3 !important;
        letter-spacing: -0.015em;
    }
    #dashboard .workspace-card-toolbar {
        width: 100%;
        margin-top: 2px;
    }
    #dashboard .workspace-card-actions-row {
        width: 100%;
        margin-top: 2px;
    }
    #dashboard .workspace-card-actions {
        gap: 8px;
    }
    #dashboard .workspace-card-action-btn {
        margin: 0 !important;
        opacity: 0.92;
    }
    #dashboard .workspace-card-action-btn:hover {
        opacity: 1;
    }

    /* Create workspace hint — same body size as LLM prompts */
    .create-workspace-hint {
        font-size: var(--neptune-fs-body, 14pt);
        line-height: 1.6;
        color: rgba(0, 0, 0, 0.87);
    }
    .theme--dark .create-workspace-hint {
        color: rgba(255, 255, 255, 0.87);
    }
    .create-workspace-hint .editor-link {
        color: #006994;
        font-weight: 600;
        text-decoration: underline;
    }
.create-workspace-hint .editor-link:hover {
    color: #00838F;
}
.guest-storage-hint {
    font-size: var(--neptune-fs-body, 14pt);
}
.guest-storage-text {
    display: inline-block;
    max-width: 640px;
}
    #dashboard .files-view-toggle .v-btn {
        text-transform: none !important;
        font-weight: 600 !important;
    }
    #dashboard .files-view-toggle .files-view-btn-icon {
        color: #006994 !important;
    }
    #dashboard .files-view-toggle .v-btn.v-btn--active {
        background-color: #006994 !important;
        color: #ffffff !important;
    }
    #dashboard .files-view-toggle .v-btn.v-btn--active .files-view-btn-icon {
        color: #ffffff !important;
    }
    #dashboard .file-grid-card .v-card--material-stats {
        min-height: 210px;
    }
    #dashboard .file-grid-card .display-2 {
        font-size: 1.8rem !important;
    }
    #dashboard .file-grid-create-tile {
        min-height: 210px;
        border: 1px dashed rgba(80, 200, 120, 0.45);
        background: rgba(80, 200, 120, 0.08);
    }
    #dashboard .file-grid-create-btn {
        width: 90px;
        height: 90px;
    }
    #dashboard .file-grid-create-label {
        font-size: var(--neptune-fs-body, 14pt);
        font-weight: 600;
    }
    /* File grid: “Last edited …” — same meta size as workspace Last Update */
    #dashboard .file-grid-card .caption {
        font-size: var(--neptune-fs-timestamp) !important;
    }
    #dashboard .workspace-card-last-update {
        font-size: var(--neptune-fs-timestamp) !important;
        font-weight: 400 !important;
    }
    #dashboard .file-list-table-card {
        border: 1px solid rgba(0, 0, 0, 0.08);
    }
    #dashboard .file-list-table table {
        width: 100%;
        table-layout: fixed;
    }
    #dashboard .file-list-table .file-list-col-name {
        width: 33.3333%;
    }
    #dashboard .file-list-table .file-list-col-type,
    #dashboard .file-list-table .file-list-col-time,
    #dashboard .file-list-table .file-list-col-actions {
        width: 22.2222%;
    }
    #dashboard .file-list-table th {
        font-weight: 700;
        font-size: var(--neptune-fs-label, 13.25pt);
        white-space: nowrap;
    }
    #dashboard .file-list-table th.file-list-th-last-edited {
        font-size: var(--neptune-fs-label, 13.25pt) !important;
    }
    #dashboard .file-list-table td {
        vertical-align: middle;
    }
    #dashboard .file-list-sort-btn {
        border: 0;
        background: transparent;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        font: inherit;
        font-weight: 700;
        color: inherit;
        padding: 0;
    }
    #dashboard .file-list-time-cell {
        white-space: nowrap;
        min-width: 0;
        font-size: var(--neptune-fs-timestamp) !important;
    }
    #dashboard .file-list-name-cell {
        word-break: normal;
        overflow-wrap: normal;
    }
    #dashboard .file-list-name-scroll {
        max-width: 100%;
        overflow-x: auto;
        overflow-y: hidden;
        white-space: nowrap;
        padding-bottom: 2px;
    }
    #dashboard .file-list-name-text {
        display: inline-block;
        min-width: max-content;
    }
    #dashboard .file-list-ext-pill {
        font-family: monospace;
        background: rgba(0, 105, 148, 0.08);
        color: #006994;
        padding: 3px 8px;
        border-radius: 4px;
    }
    #dashboard .file-list-ext-pill--json {
        background: rgba(245, 124, 0, 0.12);
        color: #ef6c00;
    }
    #dashboard .file-list-ext-pill--lfr {
        background: rgba(0, 105, 148, 0.12);
        color: #006994;
    }
    #dashboard .file-list-ext-pill--mint {
        background: rgba(46, 125, 50, 0.12);
        color: #2e7d32;
    }
    #dashboard .file-list-actions {
        gap: 4px;
    }
    #dashboard .go-3duf-btn-logo {
        object-fit: contain;
        display: block;
    }
    #dashboard .go-3duf-btn-logo--sm {
        width: 20px;
        height: 20px;
    }
    #dashboard .file-list-create-row {
        cursor: pointer;
    }
    #dashboard .file-list-create-row:hover .file-list-create-label {
        text-decoration: underline;
    }
    #dashboard .file-list-create-cell {
        text-align: left !important;
        padding-top: 12px !important;
        padding-bottom: 12px !important;
    }
    #dashboard .file-list-create-label {
        color: #2e7d32 !important;
        font-weight: 600;
        font-size: 0.95rem;
    }

    .dashboard-naming-dialog .headline {
        font-size: 1.1875rem !important;
        font-weight: 600 !important;
        letter-spacing: -0.015em;
        line-height: 1.35;
    }
    .dashboard-naming-dialog code {
        font-family: var(--neptune-font-code), monospace;
        background: rgba(0, 105, 148, 0.08);
        color: #006994;
        padding: 1px 6px;
        border-radius: 3px;
        font-size: 0.95em;
    }
    .theme--dark .dashboard-naming-dialog code {
        background: rgba(255, 255, 255, 0.08);
        color: #80deea;
    }
    .dashboard-naming-dialog .naming-diff {
        border: 1px solid rgba(0, 51, 73, 0.12);
        border-radius: 6px;
        padding: 10px 14px;
        background: rgba(0, 105, 148, 0.03);
    }
    .theme--dark .dashboard-naming-dialog .naming-diff {
        border-color: rgba(255, 255, 255, 0.12);
        background: rgba(255, 255, 255, 0.03);
    }
    .dashboard-naming-dialog .naming-diff-row {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 4px 0;
    }
    .dashboard-naming-dialog .naming-diff-label {
        flex: 0 0 110px;
        color: rgba(0, 0, 0, 0.6);
        font-size: 0.9rem;
    }
    .theme--dark .dashboard-naming-dialog .naming-diff-label {
        color: rgba(255, 255, 255, 0.7);
    }
    .dashboard-naming-dialog .naming-diff-original {
        color: #c62828;
        background: rgba(198, 40, 40, 0.08);
    }
    .theme--dark .dashboard-naming-dialog .naming-diff-original {
        color: #ef9a9a;
        background: rgba(239, 154, 154, 0.12);
    }
    .dashboard-naming-dialog .naming-diff-normalized {
        color: #2e7d32;
        background: rgba(46, 125, 50, 0.08);
    }
    .theme--dark .dashboard-naming-dialog .naming-diff-normalized {
        color: #a5d6a7;
        background: rgba(165, 214, 167, 0.12);
    }
    .dashboard-naming-dialog .v-btn {
        text-transform: none !important;
        letter-spacing: normal !important;
    }

</style>