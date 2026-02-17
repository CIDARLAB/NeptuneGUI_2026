<template>
  <v-container
    id="grid"
    fluid
    tag="section"
    class="editor-page"
  >
    <v-row>
      <v-col cols="12" class="pt-0 d-flex align-center flex-wrap editor-toolbar">
        <v-btn class="editor-toolbar-btn editor-toolbar-btn-1" small @click="saveFile">Save file</v-btn>
        <v-btn class="editor-toolbar-btn editor-toolbar-btn-2" small @click="saveFileAndCompile">Save file and compile</v-btn>
        <v-btn class="editor-toolbar-btn editor-toolbar-btn-3" small @click="saveToNewWorkspace">Save file to a new workspace</v-btn>
        <v-btn class="editor-toolbar-btn editor-toolbar-btn-4" small @click="openExistingWorkspaceDialog">Save file to an existing workspace</v-btn>
        <v-btn class="editor-toolbar-btn editor-toolbar-btn-5" small @click="downloadfile">Download</v-btn>
        <v-btn class="editor-toolbar-btn editor-toolbar-btn-6" small @click="triggerUpload">Upload</v-btn>
        <v-btn class="editor-toolbar-btn editor-toolbar-btn-delete" small color="error" @click="deletefile">Delete</v-btn>
        <input ref="fileUploadInput" type="file" accept=".mint,.lfr,.uf,.v,.json,.ini,text/*" style="display: none" @change="uploadfile">
      </v-col>
    </v-row>

    <!-- Script language selection (MINT / LFR) above workspace -->
    <v-row>
      <v-col cols="12" sm="8" class="pt-0 pb-1">
        <div class="script-language-wrapper">
          <v-select
            v-model="selectedScriptLanguage"
            :items="scriptLanguageItems"
            label="Script language"
            outlined
            hide-details
            class="script-language-select"
            color="primary"
            style="max-width: 260px;"
          >
            <template v-slot:append-inner>
              <span class="script-language-arrow" aria-hidden="true">▼</span>
            </template>
          </v-select>
          <span class="script-language-hint">Switch to another language</span>
        </div>
      </v-col>
    </v-row>

    <v-row align="stretch">
      <v-col cols="12" sm="8" class="pt-0 d-flex">
        <v-card class="mt-0 editor-script-card flex d-flex flex-column" style="width: 100%;">
          <v-progress-linear
            :indeterminate="isloading"
            :hidden="!isloading"
            color="blue darken-2"
          />
          <v-list-item three-line v-if="fileobject.name">
            <v-list-item-content>
              <div class="d-flex align-center flex-wrap">
                <v-text-field
                  v-model="editableFileBaseName"
                  label="File name"
                  placeholder="Script name"
                  outlined
                  dense
                  hide-details
                  class="editor-page-filename-input flex-grow-1 mr-2"
                  style="max-width: 280px;"
                />
                <span class="editor-page-filename-ext">.{{ selectedScriptLanguage }}</span>
              </div>
              <v-list-item-subtitle class="mt-1">Current workspace: <span v-text="currentWorkspaceLabel"></span></v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>
          <v-list-item three-line v-else class="new-script-filename-row">
            <v-list-item-content>
              <div class="d-flex align-center flex-wrap">
                <v-text-field
                  v-model="newScriptBaseName"
                  label="File name"
                  placeholder="New Script"
                  outlined
                  dense
                  hide-details
                  class="new-script-filename-input flex-grow-1 mr-2"
                  style="max-width: 280px;"
                />
                <span class="editor-page-filename-ext">.{{ selectedScriptLanguage }}</span>
              </div>
              <v-list-item-subtitle class="mt-1" v-text="newScriptWorkspaceSubtitle"></v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>
          <v-card-text class="red--text text--darken-4 editor-card-text">
            <MonacoEditor
              ref="monaco"
              class="editor"
              v-model="code"
              :language="editorLanguage"
              :options="editorOptions"
              @editorWillMount="editorWillMount"
            />
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="4" class="pt-0 d-flex">
        <v-card class="mt-0 neptune-console-card flex d-flex flex-column" style="width: 100%;">
          <v-card-text class="neptune-console-content">
            <div class="neptune-console-title">Neptune Console</div>
            <p class="neptune-console-desc">Linked to Neptune_2026. Compile output and CLI output appear below. The terminal is output-only; use the command bar above to send input.</p>
            <div class="d-flex align-center neptune-console-run-row">
              <v-text-field
                v-model="cliCommand"
                label="Run command"
                placeholder="e.g. compile, run script..."
                outlined
                dense
                hide-details
                class="mr-2 flex-grow-1"
                @keydown.enter.prevent="sendCliCommand"
              />
              <v-btn color="primary" small @click="sendCliCommand">Run</v-btn>
            </div>
            <div id="terminal" class="neptune-console-terminal"></div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

  <v-dialog v-model="compiledialog" max-width="500px">
    <v-card>
      <v-card-title>Compile</v-card-title>
      <v-card-text>
        <v-select
          :items="configfiles"
          label="Select Config File"
          item-value="id"
          item-text="name"
          v-model="selectedconfig"
          :return-object="true"
        />
      </v-card-text>
      <v-card-actions>
        <v-btn color="primary" text @click="compiledialog = false; $router.push('/dashboard')">Close</v-btn>
        <v-btn color="info" text @click="compilefile">Compile</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Save to new workspace -->
  <v-dialog v-model="saveDialog" max-width="480px" persistent>
    <v-card>
      <v-card-title>New workspace</v-card-title>
      <v-card-text>
        <v-text-field
          v-model="newWorkspaceName"
          label="Workspace name"
          outlined
          dense
          hide-details="auto"
          class="mb-3"
        />
        <v-textarea
          v-model="newWorkspaceNotes"
          label="Notes (optional)"
          outlined
          dense
          rows="2"
          hide-details="auto"
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn color="primary" text @click="saveDialog = false">Cancel</v-btn>
        <v-btn color="success" text @click="confirmSaveNewWorkspace">Create workspace</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Save to existing workspace -->
  <v-dialog v-model="existingWorkspaceDialog" max-width="480px" persistent>
    <v-card>
      <v-card-title>Save file to an existing workspace</v-card-title>
      <v-card-text>
        <v-select
          v-model="selectedExistingWorkspaceId"
          :items="existingWorkspacesList"
          item-text="name"
          item-value="_id"
          label="Workspace"
          outlined
          dense
          hide-details="auto"
        />
        <p class="caption mt-2">Current content will be saved as a new file in the selected workspace.</p>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn color="primary" text @click="existingWorkspaceDialog = false">Cancel</v-btn>
        <v-btn color="success" text @click="confirmSaveToExistingWorkspace">Save</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  </v-container>

</template>      

<script>
import MonacoEditor from 'vue-monaco'
import VueTerminal from 'vue-terminal-ui'
import axios from 'axios'
import { Terminal } from 'xterm'
import router from '../../router'
import guestStore from '@/lib/guestStore'

const term = new Terminal();

export default {
  name: "Editor",
  components: {
    MonacoEditor,
    VueTerminal,
  },
  mounted: function () {
    const self = this
    const terminalEl = document.getElementById('terminal')
    if (terminalEl) {
      term.open(terminalEl)
      term.setOption('fontSize', 12)
      term.write('Neptune> ')
    }

    const currentfile = this.$store.getters.currentFile
    this.currentworkspace = this.$store.getters.currentWorkspace || { name: '' }
    if (currentfile == null || currentfile === '') {
      this.code = ''
      return
    }

    self.isloading = true

    if (this.$store.getters.isGuest && !this.$store.getters.isGuestViaServer) {
      const wid = this.currentworkspace && this.currentworkspace._id
      if (!wid) { self.isloading = false; return }
      const file = guestStore.getFile(wid, currentfile)
      if (file) {
        this.fileobject = { id: file.id, name: file.name, ext: file.ext }
        this.code = file.content || ''
        if ((file.ext || '').toLowerCase() === '.mint') this.selectedScriptLanguage = 'mint'
        if ((file.ext || '').toLowerCase() === '.lfr') this.selectedScriptLanguage = 'lfr'
      }
      self.isloading = false
      this.downloadconfigfiles()
      return
    }

    axios.get('/api/v1/file', { params: { id: currentfile } })
      .then((response) => {
        this.fileobject = response.data
        const ext = (response.data.ext || '').toLowerCase()
        if (ext === '.mint') this.selectedScriptLanguage = 'mint'
        if (ext === '.lfr') this.selectedScriptLanguage = 'lfr'
      })
      .catch((error) => { console.log(error) })

    axios.get('/api/v1/fs', { params: { id: currentfile } })
      .then((response) => {
        self.isloading = false
        if (typeof response.data !== 'string') {
          alert('Cannot open file in default editor')
        } else {
          this.code = response.data
        }
      })
      .catch((error) => { console.log(error) })

    this.downloadconfigfiles()
    // axios.get('/api/v1/fs', config)
    //   .then((response) => {
    //     console.log(response)
    //     this.code = JSON.stringify(response.data)
    //   })
    //   .error((error) => {
    //     console.log(error)
    //   })
  },
  data () {
    return {
      isloading: false,
      selectedconfig: '',
      compiledialog: false,
      currentworkspace: { name: '' },
      code: '',
      fileobject: { name: '', id: '' },
      configfiles: [],
      dialog: false,
      dialog2: false,
      dialog3: false,
      notifications: false,
      sound: true,
      widgets: false,
      select: ['State 1', 'State 2', 'State 3', 'State 4', 'State 5', 'State 6', 'State 7'],
      scriptLanguageItems: [
        { text: 'MINT', value: 'mint' },
        { text: 'LFR', value: 'lfr' },
      ],
      selectedScriptLanguage: 'mint',
      newScriptBaseName: 'New Script',
      editorOptions: {
        lineNumbers: 'on',
        lineNumbersMinChars: 1,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        overviewRulerLanes: 0,
        hideCursorInOverviewRuler: true,
        glyphMargin: false,
        scrollbar: {
          vertical: 'auto',
          horizontal: 'auto',
          useShadows: false,
          verticalScrollbarSize: 10,
          horizontalScrollbarSize: 10,
        },
      },
      saveDialog: false,
      newWorkspaceName: '',
      newWorkspaceNotes: '',
      cliCommand: '',
      existingWorkspaceDialog: false,
      selectedExistingWorkspaceId: null,
      existingWorkspacesList: [],
      editableFileBaseName: '',
    }
  },
  watch: {
    fileobject: {
      handler (n) {
        if (n && n.name) this.editableFileBaseName = n.name.replace(/\.[^.]+$/, '') || n.name
        else this.editableFileBaseName = ''
      },
      immediate: true,
    },
  },
  computed: {
    currentWorkspaceLabel () {
      if (!this.currentworkspace || !this.currentworkspace.name) return 'None'
      return this.currentworkspace.name
    },
    newScriptWorkspaceSubtitle () {
      if (!this.currentworkspace || !this.currentworkspace.name) {
        return 'Current workspace: None. Workspace name and notes can be set when you Save.'
      }
      return 'Current workspace: ' + this.currentworkspace.name
    },
    editorLanguage () {
      if (this.selectedScriptLanguage === 'mint' || this.selectedScriptLanguage === 'lfr') return this.selectedScriptLanguage
      const name = (this.fileobject && this.fileobject.name) || ''
      const ext = (name.match(/\.[0-9a-z]+$/i) && name.match(/\.[0-9a-z]+$/i)[0]) || ''
      if (['.lfr', '.v'].includes(ext.toLowerCase())) return 'lfr'
      if (['.mint', '.uf'].includes(ext.toLowerCase())) return 'mint'
      if (ext === '.json') return 'json'
      if (ext === '.ini') return 'ini'
      return this.selectedScriptLanguage || 'plaintext'
    },
  },
  sockets: {
    // Neptune_2026 backend linkage:
    // - Client emits 'stdin' (string): user keystrokes from terminal; backend can forward to CLI/pty.
    // - Client emits 'cli' (payload: { command: string }): one-shot command; backend can run and stream stdout.
    // - Client emits 'monitor' (jobid): subscribe to compile job output (existing).
    // - Backend sends 'stdout' (string): terminal/CLI output to display (existing).
    // - Backend sends 'EOP': end of process (existing).
    // //This signals the end of the output
    // socket.on('EOP', function(data){
    //     //TODO: Figure out how to close the monitoring
    //     editorViewModel.updateJobs();
    //     setTimeout(function() {
    //         //self.jobs()[0]
    //         editorViewModel.setAsCurrentJob(editorViewModel.currentJob());
    //     },1000);
    // });
    stdout: function(data){
      //console.log(data)
      term.write(data.replace(/\n/g, '\n\r'))

    },
  
    EOP: function(data){
      console.log(data)
      this.isloading = false
    }

  },
  methods: {
    editorWillMount (monaco) {
      // Register MINT and LFR for syntax highlighting (keywords can be aligned with Neptune_2026 definitions)
      const mintKeywords = ['channel', 'device', 'mix', 'split', 'valve', 'inlet', 'outlet', 'layer', 'port', 'flow', 'width', 'height', 'length', 'define', 'include']
      const lfrKeywords = ['layer', 'valve', 'port', 'channel', 'inlet', 'outlet', 'mix', 'split', 'define', 'module', 'input', 'output', 'wire']
      const keywordToken = 'keyword'
      const registerLang = (id, keywords) => {
        monaco.languages.register({ id })
        monaco.languages.setMonarchTokensProvider(id, {
          tokenizer: {
            root: [
              [new RegExp('\\b(' + keywords.join('|') + ')\\b', 'i'), keywordToken],
              [/\b\d+\.?\d*\b/, 'number'],
              [/\/\/.*$/, 'comment'],
              [/\/\*/, 'comment', '@comment'],
              [/"[^"]*"/, 'string'],
              [/'(?:[^'\\]|\\.)*'/, 'string'],
            ],
            comment: [
              [/\*\//, 'comment', '@pop'],
              [/./, 'comment'],
            ],
          },
        })
        monaco.editor.defineTheme(id + 'Theme', {
          base: 'vs',
          inherit: true,
          rules: [
            { token: keywordToken, foreground: '006994', fontStyle: 'bold' },
            { token: 'number', foreground: '098658' },
            { token: 'comment', foreground: '6a737d' },
            { token: 'string', foreground: '032f62' },
          ],
        })
      }
      registerLang('mint', mintKeywords)
      registerLang('lfr', lfrKeywords)
    },
    downloadconfigfiles (event) {
      this.configfiles = []
      const ws = this.$store.getters.currentWorkspace
      if (!ws || !ws._id) return
      if (this.$store.getters.isGuest && !this.$store.getters.isGuestViaServer) {
        const files = guestStore.getFiles(ws._id) || []
        files.forEach(f => {
          const ext = (f.ext || '').toLowerCase()
          if (ext === '.ini' || ext === '.json') this.configfiles.push(f)
        })
        return
      }
      const config = {
        withCredentials: true,
        crossorigin: true,
        headers: { 'Content-Type': 'application/json' },
        params: { id: ws._id },
      }
      let self = this
      axios.get('/api/v1/files', config)
        .then((response) => {
          (response.data || []).forEach((fid) => {
            axios.get('/api/v1/file', { params: { id: fid }, withCredentials: true, headers: { 'Content-Type': 'application/json' } })
              .then((res) => {
                const ext = (res.data.ext || '').toLowerCase()
                if (ext === '.ini' || ext === '.json') self.configfiles.push(res.data)
              })
              .catch((error) => { console.log(error) })
          })
        })
        .catch((error) => { console.error(error) })
    },
    createfile: function(event) {
      console.log("TEST");
    },
    saveFile () {
      if (this.fileobject.id && this.currentworkspace && this.currentworkspace._id) {
        const ext = '.' + this.selectedScriptLanguage
        const base = (this.editableFileBaseName || this.fileobject.name || 'script').trim().replace(/\.(mint|lfr)$/i, '') || 'script'
        const newName = base + ext
        const config = { withCredentials: true, headers: { 'Content-Type': 'application/json' } }
        if (this.$store.getters.isGuest && !this.$store.getters.isGuestViaServer) {
          guestStore.updateFile(this.currentworkspace._id, this.fileobject.id, this.code, newName)
          this.fileobject.name = newName
          this.$router.push('/dashboard')
          return
        }
        const payload = { fileid: this.fileobject.id, text: this.code }
        if (newName !== (this.fileobject.name || '')) payload.name = newName
        axios.put('/api/v1/file', payload, config)
          .then(() => {
            this.fileobject.name = newName
            this.$router.push('/dashboard')
          })
          .catch((err) => {
            const msg = (err.response && err.response.data && (err.response.data.error || err.response.data.message)) || err.message
            alert('Could not save file. ' + (msg ? String(msg) : 'Please try again.'))
          })
      } else {
        this.newWorkspaceName = ''
        this.newWorkspaceNotes = ''
        this.saveDialog = true
      }
    },
    saveFileAndCompile () {
      if (!this.fileobject.id) {
        alert('Save the file first (e.g. Save file to a new workspace), then use Save file and compile.')
        return
      }
      const ext = '.' + this.selectedScriptLanguage
      const base = (this.editableFileBaseName || this.fileobject.name || 'script').trim().replace(/\.(mint|lfr)$/i, '') || 'script'
      const newName = base + ext
      const config = { withCredentials: true, headers: { 'Content-Type': 'application/json' } }
      if (this.$store.getters.isGuest && !this.$store.getters.isGuestViaServer) {
        guestStore.updateFile(this.currentworkspace._id, this.fileobject.id, this.code, newName)
        this.fileobject.name = newName
        this.compiledialog = true
        return
      }
      const payload = { fileid: this.fileobject.id, text: this.code }
      if (newName !== (this.fileobject.name || '')) payload.name = newName
      axios.put('/api/v1/file', payload, config)
        .then(() => {
          this.fileobject.name = newName
          this.compiledialog = true
        })
        .catch((err) => {
          const msg = (err.response && err.response.data && (err.response.data.error || err.response.data.message)) || err.message
          alert('Could not save file. ' + (msg ? String(msg) : 'Please try again.'))
        })
    },
    saveToNewWorkspace () {
      this.newWorkspaceName = ''
      this.newWorkspaceNotes = ''
      this.saveDialog = true
    },
    openExistingWorkspaceDialog () {
      if (this.$store.getters.isGuest && !this.$store.getters.isGuestViaServer) {
        this.existingWorkspacesList = guestStore.getWorkspaces()
        const curId = this.currentworkspace && this.currentworkspace._id
        const inList = this.existingWorkspacesList.some(w => String(w._id) === String(curId))
        this.selectedExistingWorkspaceId = inList ? curId : (this.existingWorkspacesList[0] && this.existingWorkspacesList[0]._id) || null
        this.existingWorkspaceDialog = true
        return
      }
      const config = { withCredentials: true, headers: { 'Content-Type': 'application/json' } }
      axios.get('/api/v1/workspaces', config)
        .then((res) => {
          const ids = res.data || []
          return Promise.all(ids.map((wid) =>
            axios.get('/api/v1/workspace', { params: { workspace_id: wid }, ...config }).then((w) => w.data)
          ))
        })
        .then((list) => {
          this.existingWorkspacesList = list.filter(Boolean)
          const curId = this.currentworkspace && this.currentworkspace._id
          const inList = this.existingWorkspacesList.some(w => String(w._id) === String(curId))
          this.selectedExistingWorkspaceId = inList ? curId : (this.existingWorkspacesList[0] && this.existingWorkspacesList[0]._id) || null
          this.existingWorkspaceDialog = true
        })
        .catch(() => {})
    },
    confirmSaveToExistingWorkspace () {
      const wsId = this.selectedExistingWorkspaceId
      if (!wsId) return
      const ext = '.' + this.selectedScriptLanguage
      const base = (this.editableFileBaseName || this.fileobject.name || this.newScriptBaseName || 'script').trim().replace(/\.(mint|lfr)$/i, '') || 'script'
      const fileName = base + ext
      const config = { withCredentials: true, headers: { 'Content-Type': 'application/json' } }
      if (this.$store.getters.isGuest && !this.$store.getters.isGuestViaServer) {
        const file = guestStore.createFile(wsId, fileName, ext)
        if (file) guestStore.updateFile(wsId, file.id, this.code)
        this.existingWorkspaceDialog = false
        this.$router.push('/dashboard')
        return
      }
      axios.post('/api/v1/file', { workspaceid: wsId, file_name: fileName, ext }, config)
        .then((res) => {
          const fileId = res.data.id
          if (fileId && this.code) {
            return axios.put('/api/v1/file', { fileid: fileId, text: this.code }, config)
          }
        })
        .then(() => {
          this.existingWorkspaceDialog = false
          this.$router.push('/dashboard')
        })
        .catch((err) => {
          const msg = (err.response && err.response.data && (err.response.data.error || err.response.data.message)) || err.message
          alert('Could not save. ' + (msg ? String(msg) : 'Please try again.'))
        })
    },
    triggerUpload () {
      this.$refs.fileUploadInput && this.$refs.fileUploadInput.click()
    },
    confirmSaveNewWorkspace () {
      const name = (this.newWorkspaceName || '').trim() || 'New Workspace'
      const notes = (this.newWorkspaceNotes || '').trim()
      const ext = '.' + this.selectedScriptLanguage
      let base = (this.newScriptBaseName || 'script').trim().replace(/\.(mint|lfr)$/i, '') || 'script'
      const fileName = base + ext

      if (this.$store.getters.isGuest && !this.$store.getters.isGuestViaServer) {
        const ws = guestStore.createWorkspace(name, notes)
        const file = guestStore.createFile(ws._id, fileName, ext)
        if (file) guestStore.updateFile(ws._id, file.id, this.code)
        this.$store.commit('SET_WORKSPACE', ws)
        this.saveDialog = false
        this.$router.push('/dashboard')
        return
      }

      const config = {
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' },
      }
      axios.post('/api/v1/workspace', { name, notes }, config)
        .then((res) => {
          const workspace = res.data
          const workspaceId = workspace._id || workspace.id
          return axios.post('/api/v1/file', {
            workspaceid: workspaceId,
            file_name: fileName,
            ext,
          }, config).then((fileRes) => ({ workspaceId, fileId: fileRes.data.id }))
        })
        .then(({ workspaceId, fileId }) => {
          if (fileId && this.code) {
            return axios.put('/api/v1/file', { fileid: fileId, text: this.code }, config).then(() => workspaceId)
          }
          return workspaceId
        })
        .then((workspaceId) => {
          this.$store.commit('SET_WORKSPACE', { _id: workspaceId, name })
          this.saveDialog = false
          this.$router.push('/dashboard')
        })
        .catch((err) => {
          console.error(err)
          const msg = (err.response && err.response.data && (err.response.data.error || err.response.data.message)) || err.message
          alert('Could not create workspace. ' + (msg ? String(msg) : 'Please try again.'))
        })
    },
    compilefile (event) {
      if (this.$store.getters.isGuest) {
        alert('Compiling requires a registered account. Please log in to run the compiler.')
        return
      }
      let self = this
      self.isloading = true
      this.compiledialog = false
      const config = {
        withCredentials: true,
        crossorigin: true,
        headers: { 'Content-Type': 'application/json' },
      }
      const data = {
        sourcefileid: this.fileobject.id,
        sourcefilename: this.fileobject.name,
        configfileid: this.selectedconfig.id,
        configfilename: this.selectedconfig.name,
        workspace: this.$store.getters.currentWorkspace._id,
        user: this.$store.getters.currentUser.email,
      }
      const ext = this.fileobject.name.match(/\.[0-9a-z]+$/i) ? this.fileobject.name.match(/\.[0-9a-z]+$/i)[0] : ''
      let endpoint = ''
      if (ext === '.uf' || ext === '.mint') endpoint = '/api/v1/fluigi'
      else if (ext === '.lfr' || ext === '.v') endpoint = '/api/v1/mushroommapper'
      else { alert('Unknown File Type !'); return }
      axios.post(endpoint, data, config)
        .then((response) => {
          const jobid = response.data
          self.$socket.emit('monitor', jobid)
        })
        .catch((error) => { console.error(error) })
    },
    deletefile (event) {
      const fid = this.fileobject.id
      const wid = this.$store.getters.currentWorkspace && this.$store.getters.currentWorkspace._id
      if (this.$store.getters.isGuest && !this.$store.getters.isGuestViaServer) {
        if (wid) guestStore.deleteFile(wid, fid)
        router.push('/dashboard')
        return
      }
      const config = {
        data: { fileid: fid, workspaceid: wid },
        withCredentials: true,
        crossorigin: true,
        headers: { 'Content-Type': 'application/json' },
      }
      axios.delete('/api/v1/file', config)
        .then(() => { router.push('/dashboard') })
        .catch((error) => { console.log(error) })
    },
    downloadfile: function(event) {
      console.log("download the file");
      var fileurl = new URL("/api/v1/downloadFile?id=" + this.fileobject.id, document.baseURI);
      console.log('currentfile: ',this.fileobject.id);
      // window.open(fileurl, '_blank');
      let self = this
      axios({
        method: 'get',
        url: fileurl,
        responseType: 'arraybuffer'
      })
        .then(function(response) {
          //response.data.pipe(fs.createWriteStream('ada_lovelace.jpg'))
          const url = window.URL.createObjectURL(new Blob([response.data]))
          const link = document.createElement('a')
          link.href = url
          link.setAttribute('download', self.fileobject.name) //or any other extension
          document.body.appendChild(link)
          link.click()
      })
    },
    uploadfile (event) {
      const input = event.target
      const file = input.files && input.files[0]
      if (!file) return
      const reader = new FileReader()
      const self = this
      reader.onload = () => {
        const content = reader.result
        const name = file.name
        const ext = (name.match(/\.[0-9a-z]+$/i) && name.match(/\.[0-9a-z]+$/i)[0]) || ''
        const ws = self.currentworkspace && self.currentworkspace._id
        if (!ws) {
          alert('Select or create a workspace first (e.g. Save file to a new workspace).')
          input.value = ''
          return
        }
        if (self.$store.getters.isGuest && !self.$store.getters.isGuestViaServer) {
          const f = guestStore.createFile(ws, name, ext)
          if (f) guestStore.updateFile(ws, f.id, content)
          self.fileobject = { id: f.id, name: f.name, ext: f.ext }
          self.code = content
          self.$store.commit('SET_WORKSPACE', self.currentworkspace)
        } else {
          const config = { withCredentials: true, headers: { 'Content-Type': 'application/json' } }
          axios.post('/api/v1/file', { workspaceid: ws, file_name: name, ext }, config)
            .then((res) => {
              const fileId = res.data.id
              return axios.put('/api/v1/file', { fileid: fileId, text: content }, config).then(() => res.data)
            })
            .then((f) => {
              self.fileobject = { id: f.id, name: f.name, ext: f.ext }
              self.code = content
            })
            .catch((err) => {
              const msg = (err.response && err.response.data && (err.response.data.error || err.response.data.message)) || err.message
              alert('Upload failed. ' + (msg ? String(msg) : 'Please try again.'))
            })
        }
        input.value = ''
      }
      reader.readAsText(file, 'UTF-8')
    },
    sendCliCommand () {
      const cmd = (this.cliCommand || '').trim()
      if (!cmd) return
      if (this.$socket && this.$socket.connected) {
        this.$socket.emit('cli', { command: cmd })
      }
      term.write('\r\nNeptune> ' + cmd + '\r\n')
      this.cliCommand = ''
    },
  }
}
</script>

<style>
/* Editor height: 1.3 × original (385px → 500px) */
.editor {
  height: 500px;
  width: 100%;
}

/* Script and Console cards: same height (row stretch), console fills column */
.editor-page .editor-script-card,
.editor-page .neptune-console-card {
  min-height: 100%;
}
.neptune-console-card .neptune-console-content {
  padding: 16px;
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.neptune-console-card .neptune-console-title,
.neptune-console-card .neptune-console-desc,
.neptune-console-card .neptune-console-run-row {
  flex-shrink: 0;
}
.neptune-console-card .neptune-console-terminal {
  flex: 1;
  min-height: 300px;
}
.neptune-console-title {
  font-size: calc(1.1rem + 2pt);
  font-weight: 600;
  color: #006994;
  margin-bottom: 6px;
}
.neptune-console-desc {
  font-size: calc(0.85rem + 2pt);
  color: rgba(0, 0, 0, 0.7);
  margin-bottom: 12px;
  line-height: 1.4;
}
.theme--dark .neptune-console-desc {
  color: rgba(255, 255, 255, 0.8);
}
.neptune-console-run-row {
  margin-bottom: 12px;
}
/* Run command: +4pt larger */
.neptune-console-run-row .v-input label,
.neptune-console-run-row .v-input .v-input__slot input,
.neptune-console-run-row .v-btn {
  font-size: calc(1rem + 4pt) !important;
}
.neptune-console-run-row .v-input label {
  font-weight: 600;
}
.neptune-console-terminal,
.terminal,
#terminal {
  width: 100%;
  min-height: 280px;
  height: 500px;
}
/* When console card is stretched to match editor card, terminal fills remaining space */
.editor-page .neptune-console-card .neptune-console-content .neptune-console-terminal {
  flex: 1;
  min-height: 300px;
  height: 100% !important;
}
/* Hide xterm's internal helper textarea/measure elements (keep off-screen so input still works) */
#terminal .xterm-helpers,
.neptune-console-terminal .xterm-helpers {
  position: absolute !important;
  left: -9999px !important;
  width: 1px !important;
  height: 1px !important;
  overflow: hidden !important;
  opacity: 0 !important;
  pointer-events: none !important;
}

.fab-container {
  position: fixed;
  bottom: 0;
  right: 0;
}

/* Editor toolbar: font +1pt, order Save file → … → Delete (red), colors dark blue → light blue */
.editor-page .editor-toolbar {
  gap: 6px;
}
.editor-page .editor-toolbar .v-btn {
  font-size: 15px;
  color: #fff;
  min-width: 0;
  padding-left: 12px;
  padding-right: 12px;
}
.editor-page .editor-toolbar .v-btn .v-btn__content {
  justify-content: center;
}
.editor-page .editor-toolbar .v-btn .v-icon {
  color: inherit;
}
/* Theme blue gradient: dark #006994 → light #00CAE3 */
.editor-page .editor-toolbar .editor-toolbar-btn-1 { background-color: #006994 !important; border-color: #006994 !important; }
.editor-page .editor-toolbar .editor-toolbar-btn-2 { background-color: #007a9e !important; border-color: #007a9e !important; }
.editor-page .editor-toolbar .editor-toolbar-btn-3 { background-color: #00838F !important; border-color: #00838F !important; }
.editor-page .editor-toolbar .editor-toolbar-btn-4 { background-color: #0097a3 !important; border-color: #0097a3 !important; }
.editor-page .editor-toolbar .editor-toolbar-btn-5 { background-color: #00ACC1 !important; border-color: #00ACC1 !important; }
.editor-page .editor-toolbar .editor-toolbar-btn-6 { background-color: #00CAE3 !important; border-color: #00CAE3 !important; }
.editor-page .editor-toolbar .editor-toolbar-btn-delete { color: #fff !important; }
.editor-page .v-card .v-list-item__title,
.editor-page .v-card .v-list-item__subtitle {
  font-size: 16px;
}
.editor-page .v-card-title,
.editor-page .v-card-text.subtitle-1 {
  font-size: 16px;
}

/* Script language select: bigger label + selection text */
.editor-page .script-language-select .v-input__slot,
.editor-page .script-language-select .v-select__selection {
  font-size: 20px !important;
  font-weight: 600;
  color: #006994;
}
.editor-page .script-language-select label {
  font-size: 18px !important;
  font-weight: 600;
}
/* Script language: arrow inside select + text hint on the right */
.script-language-wrapper {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}
.script-language-wrapper .script-language-arrow {
  font-size: 20px;
  font-weight: bold;
  color: #006994;
  line-height: 1;
}
.theme--dark .script-language-wrapper .script-language-arrow {
  color: #00ACC1;
}
.script-language-hint {
  font-size: calc(15px + 1pt);
  font-weight: 500;
  color: #006994;
}
.theme--dark .script-language-hint {
  color: #00ACC1;
}

/* Programming area: double padding from border */
.editor-card-text {
  padding: 32px !important;
}
.editor-card-text .editor {
  border-radius: 4px;
}

/* File name: bigger label and input text */
.editor-page .new-script-filename-input label {
  font-size: 18px !important;
  font-weight: 600;
}
.editor-page .new-script-filename-input .v-input__slot input,
.editor-page .new-script-filename-input .v-input__slot {
  font-size: 18px !important;
}
.editor-page-filename-ext {
  font-size: 20px;
  font-weight: 600;
  color: #006994;
}

/* Hide Monaco overview ruler (decorationsOverviewRuler) - not needed without minimap */
.editor .decorationsOverviewRuler {
  display: none !important;
  width: 0 !important;
  min-width: 0 !important;
}

/* Line number gutter: reduce to ~1/3 of default width */
.editor .margin-view-overlays,
.editor .margin {
  width: 24px !important;
  min-width: 24px !important;
}
.editor .line-numbers {
  width: 24px !important;
  min-width: 24px !important;
  left: 0 !important;
}
.editor .line-numbers.lh-odd { width: 24px !important; }
</style>
