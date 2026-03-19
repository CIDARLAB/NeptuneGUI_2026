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
          <div class="font-weight-light mt-1" style="font-size: 25px">
            Workspaces
          </div>
          <v-spacer />
          <v-btn
            v-if="isGuestLocal"
            small
            color="primary"
            class="mt-1"
            @click="exportGuestWorkspace"
          >
            Export cache
          </v-btn>
          <v-btn
            small
            outlined
            color="primary"
            class="mt-1 ml-2"
            @click="triggerImportZip"
          >
            <v-icon left small>mdi-upload</v-icon>
            Import zip
          </v-btn>
        </div>
        <div v-if="isGuestLocal" class="guest-storage-hint mt-2">
          <span class="guest-storage-text">
            Guest data is stored in this browser. Export to a cache file (you choose the path) and later update from that file to restore your previous workspaces.
          </span>
          <v-btn small outlined color="primary" class="ml-2 mt-1" @click="exportGuestWorkspace">Export cache to file</v-btn>
          <v-btn small outlined color="primary" class="ml-2 mt-1" @click="triggerImportGuestFile">Update cache from file</v-btn>
          <input ref="guestImportInput" type="file" accept=".zip,application/zip" style="display: none" @change="onImportGuestFile">
        </div>
        <input ref="importZipInput" type="file" accept=".zip,application/zip" style="display: none" @change="onImportZip">
      </v-col>

      <v-dialog v-model="importConflictDialog" max-width="560px">
        <v-card>
          <v-card-title>Workspace conflicts detected</v-card-title>
          <v-card-text>
            The uploaded zip contains workspaces that already exist in your online account. Choose whether to overwrite them with the uploaded content.
            <v-list dense class="mt-3">
              <v-list-item v-for="(c, idx) in importConflicts" :key="idx">
                <v-list-item-content>
                  <v-list-item-title>{{ c.name }}</v-list-item-title>
                </v-list-item-content>
              </v-list-item>
            </v-list>
            <v-checkbox v-model="importOverwriteConfirmed" label="Overwrite these workspaces using the uploaded zip" class="mt-2" />
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn text color="primary" @click="closeImportConflictDialog">Cancel</v-btn>
            <v-btn :disabled="!importOverwriteConfirmed" color="primary" @click="confirmImportOverwrite">Import and overwrite</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
      <v-col
        cols="12"
        lg="3"
        v-for="(workspace, key, i) in workspaces" 
        :key="i"
      >
        <base-material-workspace-chart-card
          :id="workspace._id"
          hover-reveal
          color="info"
          type="Line"
          :active-jobs="jobActiveCount"
          :completed-jobs="jobCompletedCount"
        >
          <template v-slot:reveal-actions>
            <v-tooltip bottom>
              <template v-slot:activator="{ attrs, on }">
                <v-btn
                  v-bind="attrs"
                  color="info"
                  icon
                  v-on="on"
                >
                  <v-icon
                    color="info"
                  >
                    mdi-refresh
                  </v-icon>
                </v-btn>
              </template>

              <span>Refresh</span>
            </v-tooltip>

            <v-tooltip bottom>
              <template v-slot:activator="{ attrs, on }">
                <v-btn
                  v-bind="attrs"
                  light
                  icon
                  v-on="on"
                  v-on:click="selectworkspace(workspace._id)"
                >
                  <v-icon color="primary">mdi-view-split-vertical</v-icon>
                </v-btn>
              </template>

              <span>View Files</span>
            </v-tooltip>

            <v-tooltip bottom>
              <template v-slot:activator="{ attrs, on }">
                <v-btn
                  v-bind="attrs"
                  light
                  icon
                  v-on="on"
                  v-on:click="deleteworkspace(workspace._id)"
                >
                  <v-icon color="error">mdi-delete</v-icon>
                </v-btn>
              </template>

              <span>Delete Workspace</span>
            </v-tooltip>
          </template>

          <h3 class="card-title font-weight-light mt-2 ml-2">
            {{workspace.name}}
          </h3>
          <template v-slot:actions>
            <v-icon
              class="mr-1"
              small
            >
              mdi-clock-outline
            </v-icon>
            <span class="caption grey--text font-weight-light">Last Update: {{formattimestamp(workspace.updated_at)}}</span>
          </template>
        </base-material-workspace-chart-card>
      </v-col>

        <v-col
            cols="12"
            align="center"
            class="d-flex align-center justify-center py-6 px-4"
        >
            <p class="create-workspace-hint text-center ma-0">
                To create a new workspace, go to
                <router-link to="/editor" class="editor-link">Editor</router-link>
                and save; that will create a new workspace.
            </p>
        </v-col>

    </v-row>
            <v-row
                v-if="files.length > 0"
                >
                <v-col
                    cols="12"
                    
                >
                    <div
                    class="font-weight-light mt-1"
                    style="font-size: 25px"
                    >
                    Files
                    </div>
                </v-col>
                <v-col
                    cols="12"
                    sm="3"
                    lg="3"
                    v-for="(file, i) in files" :key="i"
                >
                    <base-material-workspace-stats-card
                        color="info"
                        icon="mdi-file"
                        title="File Type:"
                        :value="file.ext"
                        :name="file.name"
                        :ext="file.ext"
                        sub-icon="mdi-clockwise-outline"
                        :sub-text="'Last edited: ' + (file.updated_at ? formattimestamp(file.updated_at) : (file.created_at ? formattimestamp(file.created_at) : '—'))"
                        :id="file.id"
                        :workspaceid="selectedworkspace._id"
                        v-on:onFileDeleted="refreshFiles"
                        @download="downloadWorkspaceFile(file)"
                        @view3duf="openJsonIn3DuF($event)"
                    />
                </v-col>
                <v-col
                    cols="12"
                    sm="3"
                    lg="3"
                    v-if="files.length > 0"
                    align="center"
                >
                    <div class="my-2">
                    <v-tooltip top>
                        <template v-slot:activator="{ on }">
                        <v-btn 
                            v-on="on" 
                            class="newbutton" 
                            color="success" 
                            fab 
                            x-large 
                            dark
                            @click="newfiledialog = true"
                            >
                            <v-icon>mdi-plus</v-icon>
                        </v-btn>
                        </template>
                        <span>Create New File</span>
                    </v-tooltip>
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

            </div>
        </v-col>
    </v-row>
  </v-container>
</template>

<script>
  import axios from 'axios'
  import { log } from 'util'
  import * as Utils from '../../utils'
  import guestStore from '@/lib/guestStore'
  import JSZip from 'jszip'

  export default {
    name: 'DashboardDashboard',

    mounted: async function() {
        this.refreshworkspacedata()
    },
    data: () => ({
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
        workspaces:[],
        workspacesobjects: {},
        jobActiveCount: 0,
        jobCompletedCount: 0,
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
        _pendingImportZipFile: null
    }),
    computed: {
      totalSales () {
        return this.sales.reduce((acc, val) => acc + val.salesInM, 0)
      },
      isGuestLocal () {
        return this.$store.getters.isGuest && !this.$store.getters.isGuestViaServer
      },
    },

    methods: {
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

        if (this.isGuestLocal) {
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
            folder.file(filename, f.content || '')
          })
        })

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
            if (this.workspaces.length) this.selectworkspace(this.workspaces[0]._id)
          }
        } catch (err) {
          console.error('Import failed', err)
        } finally {
          e.target.value = ''
        }
      },
      downloadWorkspaceFile (file) {
        if (!file || !file.id) return
        this.downloadfile(file)
      },
      openJsonIn3DuF (file) {
        return this.openJsonIn3DuFInternal(file)
      },

      async openJsonIn3DuFInternal (file) {
        if (!file || !file.id) return

        const workspaceId =
          file.workspaceid ||
          (this.selectedworkspace && this.selectedworkspace._id) ||
          null

        // 3DuF expects the design JSON; we send as a string so 3DuF can JSON.parse it.
        let jsonText = ''

        if (this.$store.getters.isGuest && !this.$store.getters.isGuestViaServer) {
          if (!workspaceId) {
            // eslint-disable-next-line no-console
            console.error('openJsonIn3DuF: missing guest workspaceId')
            return
          }
          const f = guestStore.getFile(workspaceId, file.id)
          jsonText = (f && f.content) ? String(f.content) : ''
        } else {
          const res = await axios.get('/api/v1/fs', {
            params: { id: file.id },
            withCredentials: true,
            crossorigin: true,
            headers: { 'Content-Type': 'application/json' },
            responseType: 'text',
          })
          jsonText = res && res.data != null ? String(res.data) : ''
        }

        if (!jsonText) {
          alert('Cannot load JSON content for 3DuF.')
          return
        }

        const win = window.open('http://localhost:8082', '_blank')
        if (!win) {
            alert('Popup blocked. Please allow popups to open 3DuF.')
          return
        }

        const payload = { type: 'loadDeviceFromJSON', json: jsonText }
        // Retry briefly until 3DuF finishes initializing.
        const start = Date.now()
        const interval = setInterval(() => {
          try {
            win.postMessage(payload, '*')
            clearInterval(interval)
          } catch (e) {
            if (Date.now() - start > 6000) clearInterval(interval)
          }
        }, 300)
        setTimeout(() => clearInterval(interval), 6500)
      },
      formattimestamp(datestring){
        return Utils.getprettytimestamp(datestring)
      },
        refreshworkspacedata () {
          this.workspaces = []
          this.workspacesobjects = {}
          this.files = []
          this.jobActiveCount = 0
          this.jobCompletedCount = 0

          if (this.$store.getters.isGuest && !this.$store.getters.isGuestViaServer) {
            const list = guestStore.getWorkspaces()
            list.forEach(w => {
              this.workspaces.push(w)
              this.workspacesobjects[w._id] = w
            })
            const target = this.$route && this.$route.query && this.$route.query.workspace
            if (target && this.workspacesobjects[target]) {
              this.selectworkspace(target)
            } else if (this.$store.getters.currentWorkspace) {
              this.selectworkspace(this.$store.getters.currentWorkspace._id)
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
            .then((response) => {
                for (let wid of response.data || []) {
                    axios.get('/api/v1/workspace', { params: { workspace_id: wid }, ...config })
                    .then((res) => {
                        this.workspaces.push(res.data)
                        this.workspacesobjects[res.data._id] = res.data
                        if (this.$store.getters.currentWorkspace != null && this.$store.getters.currentWorkspace !== undefined) {
                            this.selectworkspace(this.$store.getters.currentWorkspace._id)
                        }
                    })
                    .catch((error) => { console.log(error) })
                }
                this.fetchJobCounts(config)
            })
            .catch((error) => { console.log(error) })
        },
        fetchJobCounts (config) {
          axios.get('/api/v1/jobs', config)
            .then((response) => {
              const ids = response.data || []
              if (ids.length === 0) return
              let active = 0
              let completed = 0
              const check = (i) => {
                if (i >= ids.length) {
                  this.jobActiveCount = active
                  this.jobCompletedCount = completed
                  return
                }
                axios.get('/api/v1/job', { params: { job_id: ids[i] }, ...config })
                  .then((res) => {
                    const status = (res.data && res.data.status && String(res.data.status).toLowerCase()) || ''
                    if (['done', 'completed', 'success', 'failed', 'error'].includes(status)) completed++
                    else active++
                    check(i + 1)
                  })
                  .catch(() => { check(i + 1) })
              }
              check(0)
            })
            .catch(() => {})
        },
        deleteworkspace (wid) {
          if (this.$store.getters.isGuest && !this.$store.getters.isGuestViaServer) {
            guestStore.deleteWorkspace(wid)
            this.refreshworkspacedata()
            if (this.workspaces.length) this.selectworkspace(this.workspaces[0]._id)
            return
          }
          const config = {
            data: { id: wid },
            withCredentials: true,
            crossorigin: true,
            headers: { 'Content-Type': 'application/json' },
          }
          axios.delete('/api/v1/workspace', config)
            .then(() => { this.refreshworkspacedata(); if (this.workspaces.length) this.selectworkspace(this.workspaces[0]._id); })
            .catch((error) => { console.log(error) })
        },

        createworkspace () {
          if (this.$store.getters.isGuest && !this.$store.getters.isGuestViaServer) {
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
          if (this.$store.getters.isGuest && !this.$store.getters.isGuestViaServer) {
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

        refreshFiles(id){
          console.log("Refreshing Files", this.selectedworkspace.id)
          this.selectworkspace(id)
        },
        selectworkspace (workspace_id) {
          const obj = this.workspacesobjects[workspace_id]
          this.selectedworkspace = obj
          if (obj) this.$store.commit('SET_WORKSPACE', obj)

          if (this.$store.getters.isGuest && !this.$store.getters.isGuestViaServer) {
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
    /* Workspace card action buttons: ensure icons are visible */
    #dashboard .v-btn.info .v-icon { color: #00CAE3 !important; }
    #dashboard .v-btn.primary .v-icon { color: #006994 !important; }
    #dashboard .v-btn.error .v-icon { color: #f44336 !important; }

    /* Create workspace hint: Editor explanation line */
    .create-workspace-hint {
        font-size: 14pt;
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
    font-size: 14pt;
}
.guest-storage-text {
    display: inline-block;
    max-width: 640px;
}
</style>