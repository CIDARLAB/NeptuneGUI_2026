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
      <!-- <v-col 
        cols="12"
        v-if="selectedworkspace == null"
        >
        <v-card
        >
          
            <!-- <v-list-item three-line>
              <v-list-item-content>
                <v-list-item-title class="headline mb-1">Getting Started</v-list-item-title>
              </v-list-item-content>

              <v-list-item-avatar
                tile
                size="64"
              >
              <img
                src="/images/NeptuneLogo.png"
                alt="John"
              >
              </v-list-item-avatar>
            </v-list-item>
            -->
        <!-- <v-card-title>
            <span class="headline mb-1">Getting Started</span>
        </v-card-title>
          <v-card-text>
            <v-row>
            <v-col
              cols="12"
              md="6"
              class="mt-10"
            >
              <iframe width="100%" height="300px" src="https://www.youtube.com/embed/WO4xAA6XlrY" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>


            </v-col>

            <v-col
              cols="12"
              md="6"
            >
              <img src="/images/neptunedark.png" width="100%" />
              <br />
              <br />
              <br />
              <p>
                Neptune is really cool its a tool that lets you synthesize microfluidic designs from a high level specification system.
              </p>
            </v-col>
          </v-row>

          </v-card-text>
        </v-card>
      </v-col> -->


      <v-col
        cols="12"
      >
        <div
          class="font-weight-light mt-1"
          style="font-size: 25px"
        >
          Workspaces
        </div>
      </v-col>
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
                        sub-icon="mdi-clockwise-outline"
                        :sub-text="'Modified: ' + (file.updated_at ? formattimestamp(file.updated_at) : '—')"
                        :id="file.id"
                        :workspaceid="selectedworkspace._id"
                        v-on:onFileDeleted="refreshFiles"
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

  export default {
    name: 'DashboardDashboard',

    mounted: async function() {
        // console.log('Selected Workspace:', this.selectedworkspace, currentworkspace)
        // console.log(this.$store.getters.userID)
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
    }),
    computed: {
      totalSales () {
        return this.sales.reduce((acc, val) => acc + val.salesInM, 0)
      },
    },

    methods: {
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
            if (this.$store.getters.currentWorkspace) {
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

    /* Create workspace hint: more space, larger and prominent text */
    .create-workspace-hint {
        font-size: calc(1.1rem + 2pt);
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
</style>