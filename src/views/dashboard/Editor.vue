<template>
  <v-container
    id="grid"
    fluid
    tag="section"
    class="editor-page"
  >
    <v-row class="editor-toolbar-row">
      <v-col cols="12" class="pt-0 d-flex align-center flex-wrap editor-toolbar">
        <v-menu offset-y left close-on-content-click>
          <template v-slot:activator="{ on, attrs }">
            <v-btn class="editor-toolbar-btn editor-toolbar-btn-1" small v-bind="attrs" v-on="on">
              Save file
              <v-icon right small>mdi-menu-down</v-icon>
            </v-btn>
          </template>
          <v-list dense>
            <v-list-item @click="saveFile">
              <v-list-item-title>Save file</v-list-item-title>
            </v-list-item>
            <v-list-item @click="saveFileAndCompile">
              <v-list-item-title>Save file and compile</v-list-item-title>
            </v-list-item>
            <v-list-item @click="saveToNewWorkspace">
              <v-list-item-title>Save file to a new workspace</v-list-item-title>
            </v-list-item>
            <v-list-item @click="openExistingWorkspaceDialog(false)">
              <v-list-item-title>Save file to an existing workspace</v-list-item-title>
            </v-list-item>
            <v-list-item @click="moveToNewWorkspace">
              <v-list-item-title>Move file to a new workspace</v-list-item-title>
            </v-list-item>
            <v-list-item @click="openExistingWorkspaceDialog(true)">
              <v-list-item-title>Move file to an existing workspace</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
        <v-btn class="editor-toolbar-btn editor-toolbar-btn-2" small @click="openCompile">Compile</v-btn>
        <v-btn class="editor-toolbar-btn editor-toolbar-btn-4" small @click="triggerImport">Import</v-btn>
        <v-btn class="editor-toolbar-btn editor-toolbar-btn-3" small @click="downloadfile">Export</v-btn>
        <v-btn class="editor-toolbar-btn editor-toolbar-btn-delete" small color="error" @click="deletefile">Delete</v-btn>
        <input ref="fileImportInput" type="file" accept=".lfr,.mint,.v,.uf" style="display: none" @change="importFile">
      </v-col>
    </v-row>

    <!-- Script language selection (MINT / LFR) above workspace -->
    <v-row class="editor-script-language-row">
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
            :menu-props="{ contentClass: 'script-language-select-menu' }"
          >
            <template v-slot:append-inner>
              <span class="script-language-arrow" aria-hidden="true">▼</span>
            </template>
          </v-select>
          <v-btn
            small
            outlined
            color="primary"
            class="script-language-switch-btn"
            @click="toggleScriptLanguage"
          >
            Switch to another language
          </v-btn>
        </div>
      </v-col>
    </v-row>

    <v-row align="stretch">
      <v-col cols="12" class="pt-0 d-flex">
        <v-card class="mt-0 editor-script-card editor-main-surface flex d-flex flex-column" style="width: 100%;">
          <v-progress-linear
            :indeterminate="isloading"
            :hidden="!isloading"
            color="primary"
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
              <v-list-item-subtitle class="mt-1 editor-workspace-subtitle">Current workspace: <span v-text="currentWorkspaceLabel"></span></v-list-item-subtitle>
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
              <v-list-item-subtitle class="mt-1 editor-workspace-subtitle" v-text="newScriptWorkspaceSubtitle"></v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>
          <v-card-text class="editor-card-text">
            <MonacoEditor
              ref="monaco"
              class="editor"
              v-model="code"
              :language="editorLanguage"
              :options="editorOptionsWithTheme"
              @editorWillMount="editorWillMount"
              @editorDidMount="onEditorDidMount"
            />
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

  <!-- Save / move to a new workspace -->
  <v-dialog v-model="saveDialog" max-width="480px" persistent content-class="editor-dialog-surface">
    <v-card class="editor-dialog-card">
      <v-card-title class="editor-dialog-title">{{ newWorkspaceDialogTitle }}</v-card-title>
      <v-card-text>
        <v-text-field
          v-model="newWorkspaceName"
          label="Workspace name"
          outlined
          dense
          hide-details="auto"
          color="primary"
          class="mb-3"
        />
        <v-textarea
          v-model="newWorkspaceNotes"
          label="Notes (optional)"
          outlined
          dense
          rows="2"
          hide-details="auto"
          color="primary"
          class="mb-3"
        />
        <div class="d-flex align-center">
          <v-text-field
            v-model="saveAsFileBaseName"
            label="File name"
            outlined
            dense
            hide-details="auto"
            color="primary"
            class="flex-grow-1"
          />
          <span class="editor-page-filename-ext ml-2">.{{ selectedScriptLanguage }}</span>
        </div>
        <p class="caption mt-2 mb-0">{{ workspaceCopyOrMoveHint }}</p>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn color="primary" text @click="saveDialog = false">Cancel</v-btn>
        <v-btn color="success" text @click="confirmSaveNewWorkspace">{{ workspaceActionConfirmLabel }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Save / move to an existing workspace -->
  <v-dialog v-model="existingWorkspaceDialog" max-width="480px" persistent content-class="editor-dialog-surface">
    <v-card class="editor-dialog-card">
      <v-card-title class="editor-dialog-title">{{ existingWorkspaceDialogTitle }}</v-card-title>
      <v-card-text>
        <v-select
          v-model="selectedExistingWorkspaceId"
          :items="existingWorkspaceSelectItems"
          item-text="name"
          item-value="_id"
          item-disabled="disabled"
          label="Workspace"
          :no-data-text="existingWorkspaceEmptyMessage"
          outlined
          dense
          hide-details="auto"
          color="primary"
          class="mb-3"
        />
        <div class="d-flex align-center">
          <v-text-field
            v-model="saveAsFileBaseName"
            label="File name"
            outlined
            dense
            hide-details="auto"
            color="primary"
            class="flex-grow-1"
          />
          <span class="editor-page-filename-ext ml-2">.{{ selectedScriptLanguage }}</span>
        </div>
        <p class="caption mt-2 mb-0">{{ workspaceCopyOrMoveHint }}</p>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn color="primary" text @click="existingWorkspaceDialog = false">Cancel</v-btn>
        <v-btn
          color="success"
          text
          :disabled="!canConfirmExistingWorkspace"
          @click="confirmSaveToExistingWorkspace"
        >{{ workspaceActionConfirmLabel }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-snackbar v-model="snackbar" :color="snackbarColor" :timeout="5000" bottom>
    {{ snackbarText }}
  </v-snackbar>

  </v-container>

</template>      

<script>
import MonacoEditor from 'vue-monaco'
import VueTerminal from 'vue-terminal-ui'
import axios from 'axios'
import { Terminal } from 'xterm'
import router from '../../router'
import guestStore, { EXAMPLE_WORKSPACE_NAME, ensureServerGuestSession } from '@/lib/guestStore'
import { EXAMPLE_LFR_SCRIPT, EXAMPLE_MINT_SCRIPT } from '@/lib/exampleScripts'
import {
  buildWorkspaceLfrIndex,
  collectImportLfr,
  formatImportResolveError,
} from '@/lib/lfrImportResolve'
import { persistGuestJobOutputs, pollCompileJobUntilSettled } from '@/lib/jobResultSync'

const term = new Terminal()
let initialPromptWritten = false

export default {
  name: "Editor",
  components: {
    MonacoEditor,
    VueTerminal,
  },
  mounted: function () {
    const self = this
    this.fetchComponentLibraryAndUpdateLfrHighlighting()

    const terminalEl = document.getElementById('terminal')
    if (terminalEl) {
      term.open(terminalEl)
      term.setOption('fontSize', 15)
      if (!initialPromptWritten) {
        term.write('Neptune> ')
        initialPromptWritten = true
      }
      // Real terminal: type in the terminal; on Enter send command to Neptune_2026 (same as local terminal in project folder)
      let lineBuffer = ''
      term.onData((data) => {
        const code = data.charCodeAt(0)
        if (code === 13 || code === 10) {
          // Enter: send line as CLI command
          const cmd = lineBuffer.trim()
          lineBuffer = ''
          if (self.$socket && self.$socket.connected && cmd) {
            self.$socket.emit('cli', { command: cmd })
          }
          term.write('\r\n')
          term.write('Neptune> ')
          return
        }
        if (code === 127 || code === 8) {
          // Backspace
          if (lineBuffer.length > 0) {
            lineBuffer = lineBuffer.slice(0, -1)
            term.write('\b \b')
          }
          return
        }
        lineBuffer += data
        term.write(data)
      })
    }

    const currentfile = this.$store.getters.currentFile
    this.currentworkspace = this.$store.getters.currentWorkspace || { name: '' }
    if (currentfile == null || currentfile === '') {
      if (this.$store.getters.isGuest) {
        guestStore.ensureExampleWorkspace()
        const ws = guestStore.getWorkspacesSortedForDashboard().find(w => String(w.name || '').trim() === EXAMPLE_WORKSPACE_NAME)
        if (ws && ws.files && ws.files.length) {
          const f = ws.files.find(x => x.name === 'flow_and_control_demo.lfr')
            || ws.files.find(x => x.name === 'flow_only_demo.lfr')
            || ws.files.find(x => /\.lfr$/i.test(x.name))
            || ws.files[0]
          const fullWs = guestStore.getWorkspace(ws._id) || ws
          this.applyEditorWorkspace(fullWs)
          this.$store.commit('SET_CURRENT_FILE', f.id)
          this.fileobject = { id: f.id, name: f.name, ext: f.ext }
          this.code = f.content || ''
          if ((f.ext || '').toLowerCase() === '.mint') this.selectedScriptLanguage = 'mint'
          else this.selectedScriptLanguage = 'lfr'
          self.isloading = false
          return
        }
      }
      this.selectedScriptLanguage = 'lfr'
      this.loadExampleScript()
      return
    }

    self.isloading = true

    if (this.$store.getters.isGuest) {
      let wid = this.currentworkspace && this.currentworkspace._id
      if (!wid) {
        const hit = guestStore.findWorkspaceContainingFile(currentfile)
        if (hit) {
          this.applyEditorWorkspace(hit)
          wid = hit._id
        }
      }
      if (!wid) { self.isloading = false; return }
      const file = guestStore.getFile(wid, currentfile)
      if (file) {
        this.fileobject = { id: file.id, name: file.name, ext: file.ext }
        this.code = file.content || ''
        if ((file.ext || '').toLowerCase() === '.mint') this.selectedScriptLanguage = 'mint'
        if ((file.ext || '').toLowerCase() === '.lfr') this.selectedScriptLanguage = 'lfr'
      }
      self.isloading = false
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
      currentworkspace: { name: '' },
      code: '',
      fileobject: { name: '', id: '' },
      dialog: false,
      dialog2: false,
      dialog3: false,
      notifications: false,
      sound: true,
      widgets: false,
      select: ['State 1', 'State 2', 'State 3', 'State 4', 'State 5', 'State 6', 'State 7'],
      scriptLanguageItems: [
        { text: 'LFR', value: 'lfr' },
        { text: 'MINT', value: 'mint' },
      ],
      selectedScriptLanguage: 'mint',
      lastCompileType: '',
      newScriptBaseName: 'New Script',
      editorOptions: {
        lineNumbers: 'on',
        lineNumbersMinChars: 1,
        fontSize: 18,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        overviewRulerLanes: 0,
        overviewRulerBorder: false,
        hideCursorInOverviewRuler: true,
        glyphMargin: false,
        rulers: [],
        renderIndentGuides: false,
        guides: {
          indentation: false,
          bracketPairs: false,
          bracketPairsHorizontal: false,
        },
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
      saveAsFileBaseName: '',
      workspaceActionIsMove: false,
      cliCommand: '',
      existingWorkspaceDialog: false,
      selectedExistingWorkspaceId: null,
      existingWorkspacesList: [],
      editableFileBaseName: '',
      snackbar: false,
      snackbarText: '',
      snackbarColor: 'success',
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
    selectedScriptLanguage (newVal, oldVal) {
      if (oldVal == null || newVal === oldVal) return
      this.handleScriptLanguageChange(newVal)
    },
    editorLanguage () {
      this.$nextTick(() => this.updateLfrFlowVarDecorations())
    },
  },
  computed: {
    currentWorkspaceLabel () {
      const ws = this.resolvedEditorWorkspace()
      if (!ws || !ws.name) return 'None'
      return ws.name
    },
    newScriptWorkspaceSubtitle () {
      const ws = this.resolvedEditorWorkspace()
      if (!ws || !ws.name) {
        return 'Current workspace: None. Workspace name and notes can be set when you Save.'
      }
      return 'Current workspace: ' + ws.name
    },
    editorOptionsWithTheme () {
      const theme = this.editorLanguage === 'lfr' ? 'lfrTheme' : this.editorLanguage === 'mint' ? 'mintTheme' : 'vs'
      return { ...this.editorOptions, theme }
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
    newWorkspaceDialogTitle () {
      return this.workspaceActionIsMove ? 'Move file to a new workspace' : 'Save file to a new workspace'
    },
    existingWorkspaceDialogTitle () {
      return this.workspaceActionIsMove ? 'Move file to an existing workspace' : 'Save file to an existing workspace'
    },
    workspaceActionConfirmLabel () {
      return this.workspaceActionIsMove ? 'Move' : 'Save'
    },
    workspaceCopyOrMoveHint () {
      if (this.workspaceActionIsMove) {
        return 'The original file will be removed from the current workspace after it is saved in the destination.'
      }
      return 'The original file stays in the current workspace. Edited content is saved as a new file.'
    },
    existingWorkspaceEmptyMessage () {
      return 'No existing workspace can be selected'
    },
    existingWorkspaceSelectItems () {
      if (this.existingWorkspacesList.length) return this.existingWorkspacesList
      return [{ _id: '__none__', name: this.existingWorkspaceEmptyMessage, disabled: true }]
    },
    canConfirmExistingWorkspace () {
      const id = this.selectedExistingWorkspaceId
      if (id == null || id === '' || id === '__none__') return false
      if (!this.existingWorkspacesList.length) return false
      const curId = this.currentworkspace && this.currentworkspace._id
      if (curId != null && String(id) === String(curId)) return false
      return true
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
      const compileKind = (this.lastCompileType || this.selectedScriptLanguage || 'script').toUpperCase()
      const raw = data == null ? '' : (typeof data === 'string' ? data : JSON.stringify(data))
      const lower = raw.toLowerCase()
      const failed = (data && data.success === false) ||
        (data && typeof data.code === 'number' && data.code !== 0) ||
        lower.includes('error') ||
        lower.includes('failed') ||
        lower.includes('exception')
      if (failed) {
        this.showSnack(compileKind + ' compile failed. Check Alerts or the Jobs log.', 'error')
      } else {
        this.showSnack(compileKind + ' compile finished. Open Alerts or Jobs for results.', 'success')
      }
    }

  },
  methods: {
    applyEditorWorkspace (ws) {
      const full = (ws && ws._id && this.$store.getters.isGuest)
        ? (guestStore.getWorkspace(ws._id) || ws)
        : ws
      this.currentworkspace = full && full.name ? full : (full || { name: '' })
      if (full && full._id) this.$store.commit('SET_WORKSPACE', full)
    },
    resolvedEditorWorkspace () {
      if (this.currentworkspace && this.currentworkspace.name) return this.currentworkspace
      const fromStore = this.$store.getters.currentWorkspace
      if (fromStore && fromStore.name) return fromStore
      if (this.$store.getters.isGuest && this.fileobject && this.fileobject.id) {
        return guestStore.findWorkspaceContainingFile(this.fileobject.id)
      }
      return this.currentworkspace || fromStore || null
    },
    showSnack (text, color = 'info') {
      this.snackbarText = text
      this.snackbarColor = color
      this.snackbar = true
    },
    // Build the starter editor content shown when the user switches language
    // but the workspace has no same-named file in the target language. We
    // surface the situation inline (top comment) AND as a snackbar, then
    // drop in the full language example so the user has something runnable.
    buildLanguageStarterTemplate (lang, baseName) {
      const prettyLang = lang === 'mint' ? 'MINT' : 'LFR'
      const safeBase = (baseName && baseName.trim()) || 'your script'
      const example = lang === 'mint' ? EXAMPLE_MINT_SCRIPT : EXAMPLE_LFR_SCRIPT
      const header = [
        `// No matching .${lang} file was found in this workspace for "${safeBase}".`,
        `// Write your ${prettyLang} definition below — the example that follows`,
        '// is a starting point you can modify or delete.',
        '',
        '',
      ].join('\n')
      return header + example
    },
    toggleScriptLanguage () {
      this.selectedScriptLanguage = this.selectedScriptLanguage === 'mint' ? 'lfr' : 'mint'
    },
    handleScriptLanguageChange (newLang) {
      const targetExt = '.' + String(newLang || '').toLowerCase()
      const currentName = String((this.fileobject && this.fileobject.name) || '')

      // No file open / no workspace: fall back to the bundled example. This
      // is "new script from scratch", not a missing-sibling situation, so we
      // don't show the snack here.
      if (!this.fileobject || !this.fileobject.id) {
        this.loadExampleScript()
        return
      }

      const ws = this.currentworkspace
      const wid = ws && ws._id
      if (!wid) {
        this.loadExampleScript()
        return
      }

      const pickSibling = (files) => {
        const matches = (files || []).filter((f) => {
          if (!f) return false
          const ext = String(f.ext || '').toLowerCase()
          const nameExt = (String(f.name || '').match(/\.[0-9a-z]+$/i) || [''])[0].toLowerCase()
          return ext === targetExt || nameExt === targetExt
        })
        if (matches.length === 0) return null
        const baseName = currentName.replace(/\.[^.]+$/, '')
        return matches.find((f) => String(f.name || '').replace(/\.[^.]+$/, '') === baseName) || matches[0]
      }

      const showMissingSiblingNotice = () => {
        const baseName = currentName.replace(/\.[^.]+$/, '') || currentName
        const prettyLang = newLang === 'mint' ? 'MINT' : 'LFR'
        this.showSnack(
          `No same-named .${newLang} file found for "${baseName}" in this workspace — showing a ${prettyLang} starter you can edit.`,
          'warning',
        )
        this.code = this.buildLanguageStarterTemplate(newLang, baseName)
      }

      if (this.$store.getters.isGuest) {
        const files = guestStore.getFiles(wid) || []
        const sibling = pickSibling(files)
        if (sibling) {
          this.$store.commit('SET_CURRENT_FILE', sibling.id)
          this.fileobject = { id: sibling.id, name: sibling.name, ext: sibling.ext }
          this.editableFileBaseName = String(sibling.name || '').replace(/\.[^.]+$/, '') || sibling.name
          this.code = sibling.content || ''
          return
        }
        showMissingSiblingNotice()
        return
      }

      const config = { withCredentials: true, headers: { 'Content-Type': 'application/json' } }
      const self = this
      axios.get('/api/v1/files', { params: { id: wid }, ...config })
        .then((res) => {
          const ids = res.data || []
          return Promise.all(ids.map((fid) =>
            axios.get('/api/v1/file', { params: { id: fid }, ...config }).then((r) => r.data)
          ))
        })
        .then((files) => {
          const sibling = pickSibling(files)
          if (!sibling) {
            showMissingSiblingNotice()
            return null
          }
          self.fileobject = sibling
          self.editableFileBaseName = String(sibling.name || '').replace(/\.[^.]+$/, '') || sibling.name
          self.$store.commit('SET_CURRENT_FILE', sibling.id)
          return axios.get('/api/v1/fs', { params: { id: sibling.id }, ...config })
        })
        .then((r) => {
          if (r && typeof r.data === 'string') self.code = r.data
        })
        .catch(() => { showMissingSiblingNotice() })
    },
    loadExampleScript () {
      const lang = (this.selectedScriptLanguage || 'lfr').toLowerCase()
      if (this.$store.getters.isGuest) {
        this.code = lang === 'mint' ? EXAMPLE_MINT_SCRIPT : EXAMPLE_LFR_SCRIPT
        return
      }
      axios.get('/api/v1/exampleScript', {
        params: { lang },
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' },
      })
        .then((res) => {
          if (res.data && typeof res.data.code === 'string') {
            this.code = res.data.code
            if (res.data.lang) this.selectedScriptLanguage = res.data.lang
          }
        })
        .catch(() => {
          this.code = ''
        })
    },
    fetchComponentLibraryAndUpdateLfrHighlighting () {
      const config = { withCredentials: true, headers: { 'Content-Type': 'application/json' } }
      axios.get('/api/v1/componentLibrary', config)
        .then((res) => {
          const components = res.data && Array.isArray(res.data.components) ? res.data.components : []
          const syntaxList = components.map(c => (c.syntax || '').trim()).filter(Boolean)
          this._componentLibrarySyntaxList = syntaxList.length ? syntaxList : ['mixer', 'port', 'valve', 'channel']
          const lfrKeywords = this._baseLfrKeywords || []
          if (this._monaco && this._buildLfrTokenProvider) {
            this._monaco.languages.setMonarchTokensProvider('lfr', this._buildLfrTokenProvider(lfrKeywords))
          } else {
            this._lfrKeywordsFromLibrary = lfrKeywords
          }
          this.updateLfrFlowVarDecorations()
        })
        .catch(() => {
          this._componentLibrarySyntaxList = this._componentLibrarySyntaxList || ['mixer', 'port', 'valve', 'channel']
        })
    },
    applyPendingLfrKeywords () {
      if (this._lfrKeywordsFromLibrary && this._monaco && this._buildLfrTokenProvider) {
        this._monaco.languages.setMonarchTokensProvider('lfr', this._buildLfrTokenProvider(this._lfrKeywordsFromLibrary))
        this._lfrKeywordsFromLibrary = null
      }
    },
    onEditorDidMount (editor) {
      this._monacoEditor = editor
      this._lfrFlowVarDecorationIds = []
      const model = editor.getModel()
      if (!model) return
      const updateDecorations = () => this.updateLfrFlowVarDecorations()
      model.onDidChangeContent(updateDecorations)
      this.$nextTick(updateDecorations)
    },
    updateLfrFlowVarDecorations () {
      const editor = this._monacoEditor
      const monaco = this._monaco
      if (!editor || !monaco) return
      if (this.editorLanguage !== 'lfr') {
        if (this._lfrFlowVarDecorationIds && this._lfrFlowVarDecorationIds.length) {
          editor.deltaDecorations(this._lfrFlowVarDecorationIds, [])
          this._lfrFlowVarDecorationIds = []
        }
        return
      }
      const model = editor.getModel()
      if (!model) return
      const text = model.getValue()
      const flowVarNames = this.collectLfrFlowVarNames(text)
      const componentSyntax = this._componentLibrarySyntaxList || ['mixer', 'port', 'valve', 'channel']
      const keywordSet = new Set((this._baseLfrKeywords || []).map(k => k.toLowerCase()))
      const varNames = [...new Set([...flowVarNames, ...componentSyntax])].filter(
        name => !keywordSet.has(name.toLowerCase())
      )
      if (varNames.length === 0) {
        this._lfrFlowVarDecorationIds = editor.deltaDecorations(this._lfrFlowVarDecorationIds || [], [])
        return
      }
      const ranges = []
      const escaped = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      for (const name of varNames) {
        const re = new RegExp('\\b' + escaped(name) + '\\b', 'g')
        let match
        while ((match = re.exec(text)) !== null) {
          const start = model.getPositionAt(match.index)
          const end = model.getPositionAt(match.index + match[0].length)
          // Never decorate inside a // comment; comment styling must dominate.
          const line = model.getLineContent(start.lineNumber) || ''
          const commentIdx = line.indexOf('//')
          if (commentIdx !== -1 && (start.column - 1) >= commentIdx) continue

          ranges.push({ range: new monaco.Range(start.lineNumber, start.column, end.lineNumber, end.column), options: { inlineClassName: 'lfr-flowvar-decoration' } })
        }
      }
      this._lfrFlowVarDecorationIds = editor.deltaDecorations(this._lfrFlowVarDecorationIds || [], ranges)
    },
    collectLfrFlowVarNames (text) {
      const names = new Set()
      const lines = text.split(/\r?\n/)
      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed.startsWith('//')) continue
        const m = trimmed.match(/^\s*(finput|foutput)\s+(.+)$/)
        if (!m) continue
        const rest = m[2].replace(/\/\/.*$/, '').trim()
        rest.split(',').forEach(part => {
          const id = part.trim().match(/^([a-zA-Z_][a-zA-Z0-9_]*)/)
          if (id) names.add(id[1])
        })
      }
      return Array.from(names)
    },
    editorWillMount (monaco) {
      this._monaco = monaco
      const keywordToken = 'keyword'

      // Minimal highlighting: only core structural keywords
      const mintKeywords = ['LAYER FLOW', 'END LAYER', 'LAYER CONTROL']
      const baseLfrKeywords = ['module', 'endmodule']

      const registerLang = (id, keywords) => {
        monaco.languages.register({ id })
        const provider = {
          tokenizer: {
            root: [
              [/\/\/.*$/, 'comment'],
              [new RegExp('\\b(' + keywords.join('|') + ')\\b', 'i'), keywordToken],
            ],
          },
        }
        monaco.languages.setMonarchTokensProvider(id, provider)
        monaco.editor.defineTheme(id + 'Theme', {
          base: 'vs',
          inherit: true,
          rules: [
            { token: keywordToken, foreground: '006994', fontStyle: 'bold' },
            // Comments have highest priority and should dominate other highlighting.
            { token: 'comment', foreground: '008000', fontStyle: 'italic' },
          ],
        })
      }

      registerLang('mint', mintKeywords)
      registerLang('lfr', baseLfrKeywords)
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
        if (this.$store.getters.isGuest) {
          guestStore.updateFile(this.currentworkspace._id, this.fileobject.id, this.code, newName)
          this.fileobject.name = newName
          this.goToDashboardWorkspace(this.currentworkspace)
          return
        }
        const payload = { fileid: this.fileobject.id, text: this.code }
        if (newName !== (this.fileobject.name || '')) payload.name = newName
        axios.put('/api/v1/file', payload, config)
          .then(() => {
            this.fileobject.name = newName
            this.goToDashboardWorkspace(this.currentworkspace)
          })
          .catch((err) => {
            const msg = (err.response && err.response.data && (err.response.data.error || err.response.data.message)) || err.message
            alert('Could not save file. ' + (msg ? String(msg) : 'Please try again.'))
          })
      } else {
        this.openNewWorkspaceDialog(false)
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
      if (this.$store.getters.isGuest) {
        guestStore.updateFile(this.currentworkspace._id, this.fileobject.id, this.code, newName)
        this.fileobject.name = newName
        this.compilefile()
        return
      }
      const payload = { fileid: this.fileobject.id, text: this.code }
      if (newName !== (this.fileobject.name || '')) payload.name = newName
      axios.put('/api/v1/file', payload, config)
        .then(() => {
          this.fileobject.name = newName
          this.compilefile()
        })
        .catch((err) => {
          const msg = (err.response && err.response.data && (err.response.data.error || err.response.data.message)) || err.message
          alert('Could not save file. ' + (msg ? String(msg) : 'Please try again.'))
        })
    },
    defaultSaveAsFileBaseName () {
      const name = String((this.fileobject && this.fileobject.name) || '')
      const stripped = name.replace(/\.(mint|lfr|uf|v)$/i, '')
      if (stripped) return stripped
      const fromEditor = String(this.editableFileBaseName || this.newScriptBaseName || '').trim()
      return fromEditor || 'script'
    },
    resolvedSaveAsFileName () {
      const ext = '.' + this.selectedScriptLanguage
      const base = String(this.saveAsFileBaseName || this.defaultSaveAsFileBaseName() || 'script')
        .trim()
        .replace(/\.(mint|lfr|uf|v)$/i, '') || 'script'
      return base + ext
    },
    prepareWorkspaceFileDialog (isMove) {
      this.workspaceActionIsMove = !!isMove
      this.saveAsFileBaseName = this.defaultSaveAsFileBaseName()
    },
    goToDashboardWorkspace (workspace) {
      const id = workspace && (workspace._id || workspace.id)
      if (workspace && id) this.$store.commit('SET_WORKSPACE', workspace)
      if (id) {
        this.$router.push({ path: '/dashboard', query: { workspace: String(id), expand: '1' } })
        return
      }
      this.$router.push('/dashboard')
    },
    filterOtherWorkspaces (list) {
      const curId = this.currentworkspace && this.currentworkspace._id
      return (list || []).filter((w) => w && (curId == null || String(w._id) !== String(curId)))
    },
    applyExistingWorkspaceChoices (list) {
      this.existingWorkspacesList = this.filterOtherWorkspaces(list)
      if (this.existingWorkspacesList.length) {
        this.selectedExistingWorkspaceId = this.existingWorkspacesList[0]._id
      } else {
        this.selectedExistingWorkspaceId = '__none__'
      }
      this.existingWorkspaceDialog = true
    },
    removeOriginalFileIfMoving () {
      if (!this.workspaceActionIsMove) return Promise.resolve()
      const fid = this.fileobject && this.fileobject.id
      const wid = this.currentworkspace && this.currentworkspace._id
      if (!fid || !wid) return Promise.resolve()
      if (this.$store.getters.isGuest) {
        guestStore.deleteFile(wid, fid)
        return Promise.resolve()
      }
      return axios.delete('/api/v1/file', {
        data: { fileid: fid, workspaceid: wid },
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' },
      }).catch((err) => {
        console.error(err)
        alert('Saved to the destination, but could not remove the original file.')
      })
    },
    openNewWorkspaceDialog (isMove) {
      this.prepareWorkspaceFileDialog(isMove)
      this.newWorkspaceName = ''
      this.newWorkspaceNotes = ''
      this.saveDialog = true
    },
    saveToNewWorkspace () {
      this.openNewWorkspaceDialog(false)
    },
    moveToNewWorkspace () {
      this.openNewWorkspaceDialog(true)
    },
    openCompile () {
      if (!this.fileobject || !this.fileobject.id) {
        alert('Save the file first (use Save file from the Save file menu), then use Compile.')
        return
      }
      this.compilefile()
    },
    openExistingWorkspaceDialog (isMove) {
      this.prepareWorkspaceFileDialog(!!isMove)
      if (this.$store.getters.isGuest) {
        this.applyExistingWorkspaceChoices(guestStore.getWorkspacesSortedForDashboard())
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
          this.applyExistingWorkspaceChoices(list.filter(Boolean))
        })
        .catch(() => {
          this.applyExistingWorkspaceChoices([])
        })
    },
    confirmSaveToExistingWorkspace () {
      if (!this.canConfirmExistingWorkspace) return
      const wsId = this.selectedExistingWorkspaceId
      const ext = '.' + this.selectedScriptLanguage
      const fileName = this.resolvedSaveAsFileName()
      const config = { withCredentials: true, headers: { 'Content-Type': 'application/json' } }
      const destWorkspace = this.existingWorkspacesList.find((w) => String(w._id) === String(wsId))
        || { _id: wsId }
      if (this.$store.getters.isGuest) {
        const file = guestStore.createFile(wsId, fileName, ext)
        if (file) {
          guestStore.updateFile(wsId, file.id, this.code)
          this.$store.commit('SET_CURRENT_FILE', file.id)
        }
        this.removeOriginalFileIfMoving().then(() => {
          this.existingWorkspaceDialog = false
          this.goToDashboardWorkspace(guestStore.getWorkspace(wsId) || destWorkspace)
        })
        return
      }
      axios.post('/api/v1/file', { workspaceid: wsId, file_name: fileName, ext }, config)
        .then((res) => {
          const fileId = res.data.id
          if (fileId) this.$store.commit('SET_CURRENT_FILE', fileId)
          if (fileId && this.code) {
            return axios.put('/api/v1/file', { fileid: fileId, text: this.code }, config)
          }
        })
        .then(() => this.removeOriginalFileIfMoving())
        .then(() => {
          this.existingWorkspaceDialog = false
          this.goToDashboardWorkspace(destWorkspace)
        })
        .catch((err) => {
          const msg = (err.response && err.response.data && (err.response.data.error || err.response.data.message)) || err.message
          alert('Could not save. ' + (msg ? String(msg) : 'Please try again.'))
        })
    },
    triggerImport () {
      this.$refs.fileImportInput && this.$refs.fileImportInput.click()
    },
    confirmSaveNewWorkspace () {
      const name = (this.newWorkspaceName || '').trim() || 'New Workspace'
      const notes = (this.newWorkspaceNotes || '').trim()
      const ext = '.' + this.selectedScriptLanguage
      const fileName = this.resolvedSaveAsFileName()

      if (this.$store.getters.isGuest) {
        const ws = guestStore.createWorkspace(name, notes)
        const file = guestStore.createFile(ws._id, fileName, ext)
        if (file) {
          guestStore.updateFile(ws._id, file.id, this.code)
          this.$store.commit('SET_CURRENT_FILE', file.id)
        }
        this.removeOriginalFileIfMoving().then(() => {
          this.saveDialog = false
          this.goToDashboardWorkspace(ws)
        })
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
          }, config).then((fileRes) => ({ workspace, workspaceId, fileId: fileRes.data.id }))
        })
        .then(({ workspace, workspaceId, fileId }) => {
          if (fileId) this.$store.commit('SET_CURRENT_FILE', fileId)
          const afterContent = fileId && this.code
            ? axios.put('/api/v1/file', { fileid: fileId, text: this.code }, config)
            : Promise.resolve()
          return afterContent.then(() => ({ workspace, workspaceId }))
        })
        .then(({ workspace, workspaceId }) => this.removeOriginalFileIfMoving().then(() => ({ workspace, workspaceId })))
        .then(({ workspace, workspaceId }) => {
          this.saveDialog = false
          this.goToDashboardWorkspace(workspace || { _id: workspaceId, name })
        })
        .catch((err) => {
          console.error(err)
          const msg = (err.response && err.response.data && (err.response.data.error || err.response.data.message)) || err.message
          alert('Could not create workspace. ' + (msg ? String(msg) : 'Please try again.'))
        })
    },
    async compilefile (event) {
      let self = this
      self.isloading = true
      const config = {
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' },
      }
      await ensureServerGuestSession(axios)
      let componentBundle = []
      try {
        const compRes = await axios.get('/api/v1/componentFiles', config)
        componentBundle = (compRes.data && Array.isArray(compRes.data.components))
          ? compRes.data.components
          : []
      } catch (_) {
        componentBundle = []
      }

      const ext = this.fileobject.name.match(/\.[0-9a-z]+$/i) ? this.fileobject.name.match(/\.[0-9a-z]+$/i)[0] : ''
      let endpoint = ''
      if (ext === '.uf' || ext === '.mint') {
        endpoint = '/api/v1/fluigi'
        this.lastCompileType = 'mint'
      } else if (ext === '.lfr' || ext === '.v') {
        endpoint = '/api/v1/mushroommapper'
        this.lastCompileType = 'lfr'
      } else {
        alert('Unknown File Type !')
        self.isloading = false
        return
      }

      const currentUser = this.$store.getters.currentUser || {}
      const currentWorkspace = this.resolveCompileWorkspace()
      const data = {
        sourcefileid: this.fileobject.id,
        sourcefilename: this.fileobject.name,
        workspace: currentWorkspace._id,
        workspaceName: currentWorkspace.name || '',
        user: currentUser.email,
        componentBundle,
        sourceContent: this.code || '',
      }

      // LFR: resolve `` `import `` on the frontend; send only referenced files.
      if (this.lastCompileType === 'lfr') {
        try {
          const workspaces = await this.loadWorkspacesForImportIndex(config)
          const index = buildWorkspaceLfrIndex(workspaces)
          const resolved = collectImportLfr(this.code || '', index)
          if (!resolved.ok) {
            alert(formatImportResolveError(resolved))
            self.isloading = false
            return
          }
          data.importLfr = resolved.importLfr || []
        } catch (err) {
          console.error(err)
          alert('Could not check LFR import files. Please try again.')
          self.isloading = false
          return
        }
      }

      axios.post(endpoint, data, config)
        .then((response) => {
          const jobid = response.data
          try { if (self.$socket) self.$socket.emit('monitor', jobid) } catch (e) { /* ignore */ }
          self.$store.commit('ingestJobSnapshots', [{
            id: jobid,
            status: 'running',
            sourceFilename: self.fileobject && self.fileobject.name,
            workspaceName: currentWorkspace.name || '',
            workspaceId: currentWorkspace._id,
          }])
          self.isloading = false
          self.$router.push({ name: 'Jobs' }).catch(() => {})
          pollCompileJobUntilSettled(axios, jobid).then((job) => {
            if (!job) return
            self.$store.commit('addJobResultAlert', job)
            if (self.$store.getters.isGuest) {
              persistGuestJobOutputs(guestStore, [job])
            }
            self.$root.$emit('neptune-job-outputs-changed', {
              workspaceId: job.workspaceId || currentWorkspace._id,
              expand: true,
            })
          })
        })
        .catch((error) => {
          console.error(error)
          self.isloading = false
          const kind = (self.lastCompileType || self.selectedScriptLanguage || 'script').toUpperCase()
          const status = error && error.response && error.response.status
          const body = error && error.response && error.response.data
          const detail = (body && (body.error || body.message)) || error.message || ''
          const suffix = status ? ` (HTTP ${status}${detail ? ': ' + detail : ''})` : (detail ? ` (${detail})` : '')
          alert(kind + ' compile failed. Could not start compile job.' + suffix)
        })
    },
    resolveCompileWorkspace () {
      const fromStore = this.$store.getters.currentWorkspace
      if (fromStore && fromStore._id) {
        if (!this.currentworkspace || !this.currentworkspace._id) this.applyEditorWorkspace(fromStore)
        return fromStore
      }
      if (this.currentworkspace && this.currentworkspace._id) return this.currentworkspace
      if (this.$store.getters.isGuest && this.fileobject && this.fileobject.id) {
        const hit = guestStore.findWorkspaceContainingFile(this.fileobject.id)
        if (hit) {
          this.applyEditorWorkspace(hit)
          return hit
        }
      }
      return fromStore || this.currentworkspace || {}
    },
    /**
     * Load every workspace + file content so `` `import "Ws/file.lfr" `` can be checked locally.
     */
    async loadWorkspacesForImportIndex (config) {
      if (this.$store.getters.isGuest) {
        return guestStore.getWorkspaces() || []
      }
      const idsRes = await axios.get('/api/v1/workspaces', config)
      const ids = idsRes.data || []
      const workspaces = []
      for (const wid of ids) {
        const wRes = await axios.get('/api/v1/workspace', { params: { workspace_id: wid }, ...config })
        const w = wRes.data || { _id: wid, name: 'Workspace' }
        const filesRes = await axios.get('/api/v1/files', { params: { id: wid }, ...config })
        const fileIds = filesRes.data || []
        const files = await Promise.all(
          fileIds.map((fid) =>
            axios.get('/api/v1/file', { params: { id: fid }, ...config }).then((r) => r.data).catch(() => null)
          )
        )
        workspaces.push({
          ...w,
          files: files.filter(Boolean),
        })
      }
      return workspaces
    },
    deletefile (event) {
      const fid = this.fileobject.id
      const wid = this.$store.getters.currentWorkspace && this.$store.getters.currentWorkspace._id
      if (this.$store.getters.isGuest) {
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
    downloadfile (event) {
      const ext = '.' + (this.selectedScriptLanguage || 'mint')
      const baseName = (this.editableFileBaseName || this.fileobject.name || this.newScriptBaseName || 'script').trim().replace(/\.(mint|lfr)$/i, '') || 'script'
      const fileName = baseName + ext

      if (this.$store.getters.isGuest) {
        const blob = new Blob([this.code || ''], { type: 'text/plain;charset=utf-8' })
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', fileName)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
        return
      }

      if (!this.fileobject || !this.fileobject.id) {
        const blob = new Blob([this.code || ''], { type: 'text/plain;charset=utf-8' })
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', fileName)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
        return
      }

      const self = this
      axios.get('/api/v1/downloadFile', {
        params: { id: this.fileobject.id },
        responseType: 'arraybuffer',
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' },
      })
        .then((response) => {
          const blob = new Blob([response.data], { type: 'text/plain;charset=utf-8' })
          const url = window.URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.setAttribute('download', self.fileobject.name || fileName)
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          window.URL.revokeObjectURL(url)
        })
        .catch((err) => {
          const msg = (err.response && err.response.data) ? (typeof err.response.data === 'string' ? err.response.data : (err.response.data.error || err.response.data.message)) : err.message
          alert('Export failed. ' + (msg || 'Please try again.'))
        })
    },
    applyScriptLanguageFromImportExt (ext) {
      const e = (ext || '').toLowerCase()
      if (e === '.lfr' || e === '.v') {
        this.selectedScriptLanguage = 'lfr'
      } else if (e === '.mint' || e === '.uf') {
        this.selectedScriptLanguage = 'mint'
      }
    },
    importFile (event) {
      const input = event.target
      const file = input.files && input.files[0]
      if (!file) return
      const reader = new FileReader()
      const self = this
      reader.onload = async () => {
        const content = reader.result
        const name = file.name
        const ext = (name.match(/\.[0-9a-z]+$/i) && name.match(/\.[0-9a-z]+$/i)[0]) || ''
        const allowed = ['.lfr', '.mint', '.v', '.uf']
        if (!allowed.includes(ext.toLowerCase())) {
          alert('Please import an .lfr or .mint file (or .v / .uf for compatibility).')
          input.value = ''
          return
        }

        let wsId = self.currentworkspace && self.currentworkspace._id
        if (!wsId) {
          if (self.$store.getters.isGuest) {
            const w = guestStore.getOrCreateUploadWorkspace()
            self.currentworkspace = w
            self.$store.commit('SET_WORKSPACE', w)
            wsId = w._id
          } else {
            const config = { withCredentials: true, headers: { 'Content-Type': 'application/json' } }
            try {
              const idsRes = await axios.get('/api/v1/workspaces', config)
              const ids = idsRes.data || []
              let found = null
              for (const wid of ids) {
                // eslint-disable-next-line no-await-in-loop
                const res = await axios.get('/api/v1/workspace', { params: { workspace_id: wid }, ...config })
                if (res.data && String(res.data.name || '').trim() === 'uploaded files') {
                  found = res.data
                  break
                }
              }
              const w = found
                ? found
                : (await axios.post('/api/v1/workspace', { name: 'uploaded files' }, config)).data
              self.currentworkspace = w
              self.$store.commit('SET_WORKSPACE', w)
              wsId = w._id
            } catch (err) {
              const msg = (err.response && err.response.data && (err.response.data.error || err.response.data.message)) || err.message
              alert('Could not create a workspace for import. ' + (msg ? String(msg) : 'Please try again.'))
              input.value = ''
              return
            }
          }
        }

        if (self.$store.getters.isGuest) {
          const f = guestStore.createFile(wsId, name, ext)
          if (f) guestStore.updateFile(wsId, f.id, content)
          self.fileobject = { id: f.id, name: f.name, ext: f.ext }
          self.code = content
          self.applyScriptLanguageFromImportExt(ext)
          self.$store.commit('SET_WORKSPACE', self.currentworkspace)
        } else {
          const config = { withCredentials: true, headers: { 'Content-Type': 'application/json' } }
          axios.post('/api/v1/file', { workspaceid: wsId, file_name: name, ext }, config)
            .then((res) => {
              const fileId = res.data.id
              return axios.put('/api/v1/file', { fileid: fileId, text: content }, config).then(() => res.data)
            })
            .then((f) => {
              self.fileobject = { id: f.id, name: f.name, ext: f.ext }
              self.code = content
              self.applyScriptLanguageFromImportExt(ext)
            })
            .catch((err) => {
              const msg = (err.response && err.response.data && (err.response.data.error || err.response.data.message)) || err.message
              alert('Import failed. ' + (msg ? String(msg) : 'Please try again.'))
            })
        }
        input.value = ''
      }
      reader.readAsText(file, 'UTF-8')
    },
    focusTerminal () {
      const textarea = document.querySelector('#terminal .xterm-helper-textarea')
      if (textarea) textarea.focus()
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
  height: calc(500px * var(--neptune-content-scale, 1));
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
  font-size: var(--neptune-fs-section, 1.1875rem);
  font-weight: 600;
  color: #006994;
  margin-bottom: 6px;
}
.neptune-console-desc {
  font-size: var(--neptune-fs-body, 14pt);
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
/* Console: explanatory / run row 12pt */
.neptune-console-run-row .v-input label,
.neptune-console-run-row .v-input .v-input__slot input,
.neptune-console-run-row .v-btn {
  font-size: var(--neptune-fs-body, 14pt) !important;
}
.neptune-console-run-row .v-input label {
  font-weight: 600;
}
.neptune-console-terminal,
.terminal,
#terminal {
  width: 100%;
  min-height: 280px;
  height: calc(500px * var(--neptune-content-scale, 1));
}
/* When console card is stretched to match editor card, terminal fills remaining space */
.editor-page .neptune-console-card .neptune-console-content .neptune-console-terminal {
  flex: 1;
  min-height: 300px;
  height: 100% !important;
}
/* Keep xterm focusable so user can type in the terminal (real console). Textarea is positioned over the terminal for input. */
#terminal .xterm-helpers {
  position: absolute !important;
  left: 0 !important;
  top: 0 !important;
  width: 100% !important;
  height: 100% !important;
  pointer-events: none !important;
}
#terminal .xterm-helper-textarea {
  pointer-events: auto !important;
  opacity: 0 !important;
  caret-color: #fff;
}

.fab-container {
  position: fixed;
  bottom: 0;
  right: 0;
}

/* Breathing room below app bar + before Script language row */
.editor-page .editor-toolbar-row {
  padding-top: 10pt;
  margin-bottom: 10pt;
}

/* Space below Script language row before editor card */
.editor-page .editor-script-language-row {
  margin-bottom: 10pt;
}

/* Editor toolbar: Save → Compile → Import → Export → Delete; Save/Compile/Import blues shallow→deep; Export green */
.editor-page .editor-toolbar {
  gap: 6px;
}
.editor-page .editor-toolbar .v-btn {
  font-size: var(--neptune-fs-body, 14pt) !important;
  color: #fff;
  min-width: 0;
  padding-left: 12px;
  padding-right: 12px;
}
.editor-page .editor-toolbar .v-btn .v-btn__content {
  justify-content: center;
  font-size: var(--neptune-fs-body, 14pt) !important;
}
.editor-page .editor-toolbar .v-btn .v-icon {
  color: inherit;
}
/* Save → Compile → Import: blues light→deep (muted, not pale); Export green */
.editor-page .editor-toolbar .editor-toolbar-btn-1 { background-color: #0092b3 !important; border-color: #0092b3 !important; }
.editor-page .editor-toolbar .editor-toolbar-btn-2 { background-color: #007fa1 !important; border-color: #007fa1 !important; }
.editor-page .editor-toolbar .editor-toolbar-btn-3 { background-color: #50c878 !important; border-color: #50c878 !important; }
.editor-page .editor-toolbar .editor-toolbar-btn-4 { background-color: #006994 !important; border-color: #006994 !important; }
.editor-page .editor-toolbar .editor-toolbar-btn-6 { background-color: #00CAE3 !important; border-color: #00CAE3 !important; }
.editor-page .editor-toolbar .editor-toolbar-btn-delete { color: #fff !important; }
/* File name: label +2pt (16pt); text inside box matches */
.editor-page .editor-page-filename-input label,
.editor-page .new-script-filename-input label {
  font-size: var(--neptune-fs-label, 13.25pt) !important;
  font-weight: 600;
  color: #9e9e9e !important;
}
.editor-page .editor-page-filename-input .v-input__slot input,
.editor-page .new-script-filename-input .v-input__slot input,
.editor-page .new-script-filename-input .v-input__slot {
  font-size: var(--neptune-fs-body, 14pt) !important;
  font-weight: 600;
  color: #006994 !important;
}
.editor-page .v-card .v-list-item__subtitle:not(.editor-workspace-subtitle) {
  font-size: var(--neptune-fs-small, 12.75pt) !important;
}
.editor-page .v-card .v-list-item__subtitle.editor-workspace-subtitle,
.editor-page .v-card .editor-workspace-subtitle.v-list-item__subtitle {
  font-size: var(--neptune-fs-body, 14pt) !important;
  color: #006994 !important;
}
.theme--dark .editor-page .v-card .v-list-item__subtitle.editor-workspace-subtitle,
.theme--dark .editor-page .v-card .editor-workspace-subtitle.v-list-item__subtitle {
  color: #00ACC1 !important;
}
.editor-page .v-card-title,
.editor-page .v-card-text.subtitle-1 {
  font-size: var(--neptune-fs-body, 14pt);
}

.editor-page .script-language-select label {
  font-size: var(--neptune-fs-label, 13.25pt) !important;
  font-weight: 600;
  color: #9e9e9e !important;
}
.editor-page .script-language-select .v-input__slot input,
.editor-page .script-language-select .v-select__selection {
  font-size: var(--neptune-fs-body, 14pt) !important;
  font-weight: 600;
  color: #006994 !important;
}
.script-language-select-menu .v-list-item,
.script-language-select-menu .v-list-item__title {
  font-size: var(--neptune-fs-body, 14pt) !important;
}
/* Script language: arrow + hint 12pt (explanatory) */
.script-language-wrapper {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}
.script-language-wrapper .script-language-arrow {
  font-size: var(--neptune-fs-label, 13.25pt);
  font-weight: bold;
  color: #9e9e9e;
  line-height: 1;
}
.theme--dark .script-language-wrapper .script-language-arrow {
  color: #9e9e9e;
}
.script-language-hint {
  font-size: var(--neptune-fs-body, 14pt) !important;
  font-weight: 500;
  color: #006994;
}
.theme--dark .script-language-hint {
  color: #00ACC1;
}
.script-language-switch-btn {
  text-transform: none !important;
  letter-spacing: normal !important;
  font-size: var(--neptune-fs-body, 14pt) !important;
}
.script-language-switch-btn .v-btn__content {
  font-size: var(--neptune-fs-body, 14pt) !important;
}

/* Programming area: double padding from border */
.editor-card-text {
  padding: calc(32px * var(--neptune-content-scale, 1)) !important;
}
.editor-card-text .editor {
  border-radius: 4px;
}

.editor-page-filename-ext {
  font-size: var(--neptune-fs-body, 14pt);
  font-weight: 600;
  color: #006994;
}
/* Code buffer: Cursor/VS Code–style system monospace (--neptune-font-code), separate from UI sans */
.editor .monaco-editor,
.editor .monaco-editor .view-lines,
.editor .monaco-editor .view-line,
.editor .monaco-mouse-cursor-text {
  font-family: var(--neptune-font-code) !important;
  font-size: var(--neptune-fs-body, 14pt) !important;
}
.editor .monaco-editor .margin,
.editor .monaco-editor .line-numbers {
  font-family: var(--neptune-font-code) !important;
}

/* LFR: finput/foutput variable occurrences (document decoration) */
.editor .lfr-flowvar-decoration {
  color: #6f42c1 !important;
  font-style: italic;
}

/* Hide Monaco overview ruler (decorationsOverviewRuler) - not needed without minimap */
.editor .decorationsOverviewRuler {
  display: none !important;
  width: 0 !important;
  min-width: 0 !important;
}

/* Hide indent guides and any vertical guide lines */
.editor .indent-guide,
.editor .line-numbers .indent-guide {
  display: none !important;
  width: 0 !important;
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

/* Main script card + dialogs: match Library / Dashboard surfaces */
.editor-page .editor-main-surface.v-card {
  border: 1px solid rgba(0, 51, 73, 0.12);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  border-radius: 6px;
  overflow: hidden;
}

.editor-dialog-surface .editor-dialog-card.v-card {
  border-radius: 6px;
  border: 1px solid rgba(0, 51, 73, 0.12);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.12);
}

.editor-dialog-title {
  font-size: var(--neptune-fs-section, 1.1875rem) !important;
  font-weight: 600 !important;
  letter-spacing: -0.015em;
  color: #006994 !important;
  padding-bottom: 4px !important;
}

.theme--dark .editor-dialog-title {
  color: #00acc1 !important;
}

.editor-dialog-card .v-card__text {
  font-size: var(--neptune-fs-body, 14pt);
}

.editor-dialog-card .v-card__actions .v-btn {
  font-size: var(--neptune-fs-body, 14pt);
}

@media (max-width: 1280px) {
  .editor-page .editor-toolbar {
    gap: 4px;
  }

  .editor-page .editor-toolbar .v-btn {
    padding-left: 10px;
    padding-right: 10px;
  }

  .editor-page .script-language-select {
    max-width: 220px !important;
  }
}

@media (max-width: 1100px) {
  .editor-page .editor-toolbar {
    display: grid !important;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    width: 100%;
  }

  .editor-page .editor-toolbar .v-btn {
    width: 100%;
    margin: 0 !important;
  }

  .editor-page .editor-toolbar .v-menu {
    width: 100%;
  }

  .editor-page .editor-toolbar .v-menu .v-btn {
    width: 100%;
  }

  .editor-page .script-language-wrapper {
    width: 100%;
    gap: 8px;
  }

  .editor-page .script-language-select {
    width: 100%;
    max-width: 100% !important;
  }

  .editor-page .editor-page-filename-input,
  .editor-page .new-script-filename-input {
    max-width: 100% !important;
  }
}

@media (max-width: 768px) {
  .editor-page .editor-toolbar {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .editor,
  .terminal,
  #terminal {
    height: calc(420px * var(--neptune-content-scale, 1));
  }

  .editor-card-text {
    padding: 14px !important;
  }
}
</style>
