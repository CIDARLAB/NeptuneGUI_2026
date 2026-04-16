<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-text>
            <v-alert
              dense
              outlined
              color="primary"
              icon="mdi-information"
              class="mb-3 component-library-case-hint"
            >
              Component syntax is <strong>case-sensitive</strong> and must match LFR tokens exactly.
              When you import a JSON component, the name you enter becomes that syntax—use the same casing you will reference in LFR. DIY changes apply to the listed syntax only.
            </v-alert>
            <div class="d-flex justify-end mb-3">
              <v-btn small class="import-json-btn white--text" @click="triggerJsonImport">
                <v-icon left small class="import-json-btn-icon">mdi-upload</v-icon>
                Import JSON component
              </v-btn>
              <input
                ref="jsonImportInput"
                type="file"
                accept=".json"
                style="display: none"
                @change="onJsonImportSelected"
              >
            </div>
            <v-data-table
              :headers="tableHeaders"
              :items="components"
              :items-per-page="10"
              class="component-library-table"
            >
              <template v-slot:header.name="{ header }">
                <span>{{ header.text }}</span>
                <v-tooltip bottom max-width="320">
                  <template v-slot:activator="{ on, attrs }">
                    <v-icon small class="ml-1" v-bind="attrs" v-on="on">mdi-help-circle-outline</v-icon>
                  </template>
                  <span>Component syntax is case-sensitive: it must match the LFR token exactly (e.g. VALVE100, not valve100). Import and DIY use this same spelling.</span>
                </v-tooltip>
              </template>
              <template v-slot:item.name="{ item }">
                <code class="syntax-cell">{{ item.name || item.syntax }}</code>
              </template>
              <template v-slot:item.jsonScript="{ item }">
                <v-btn small text color="primary" @click="openFileView(item, 'json')">View</v-btn>
              </template>

              <template v-slot:item.threeDuF="{ item }">
                <v-btn
                  small
                  class="three-duf-go-btn white--text"
                  @click="openInLocal3DuF(item)"
                >
                  Go to 3DuF
                </v-btn>
              </template>

              <template v-slot:item.diy="{ item }">
                <v-btn
                  small
                  class="diy-btn white--text"
                  @click="openDiyDialog(item)"
                >
                  DIY this component
                </v-btn>
              </template>

              <template v-slot:item.export="{ item }">
                <v-btn
                  small
                  class="export-files-btn white--text"
                  color="success"
                  depressed
                  dark
                  @click="exportAllFiles(item)"
                >
                  Export files
                </v-btn>
              </template>

              <template v-slot:item.remove="{ item }">
                <v-tooltip v-if="isRemovableComponent(item)" bottom>
                  <template v-slot:activator="{ on, attrs }">
                    <v-btn
                      small
                      depressed
                      dark
                      color="error"
                      class="remove-yes-btn"
                      :loading="removeBusySyntax === item.syntax"
                      v-bind="attrs"
                      v-on="on"
                      @click="confirmRemoveComponent(item)"
                    >
                      Yes
                    </v-btn>
                  </template>
                  <span>Remove this component from the library</span>
                </v-tooltip>
                <span v-else class="grey--text text--darken-1 text-caption">—</span>
              </template>
            </v-data-table>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-snackbar v-model="snackbar" :color="snackbarColor" :timeout="4000" bottom>
      {{ snackbarText }}
    </v-snackbar>

    <v-dialog v-model="fileDialog" max-width="900px">
      <v-card class="component-library-file-dialog">
        <v-card-title class="headline">
          {{ fileDialogTitle }}
        </v-card-title>
        <v-card-text>
          <v-textarea
            :value="fileDialogContent"
            readonly
            outlined
            rows="18"
            hide-details="auto"
            class="readonly-file-textarea"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text color="primary" @click="exportCurrentFile">Export</v-btn>
          <v-btn text color="secondary" @click="closeFileDialog">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="diyDialog" max-width="700px" persistent>
      <v-card class="component-library-diy-dialog">
        <v-card-title class="headline">
          DIY this component: {{ diyComponent ? diyComponent.syntax : '' }}
        </v-card-title>
        <v-card-text>
          <p class="caption grey--text text--darken-1 mb-3">
            Syntax is case-sensitive. In LFR, reference this component with the same spelling as shown above.
          </p>
          <div v-if="diyParamKeys.length === 0" class="grey--text text--darken-1">
            No editable numeric parameters were found for this component.
          </div>
          <v-text-field
            v-for="key in diyParamKeys"
            :key="key"
            v-model="diyForm[key]"
            :label="key"
            outlined
            dense
            class="mb-2"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text color="success" :loading="diyBusy" @click="saveDiy">Save</v-btn>
          <v-btn text color="warning" :loading="diyBusy" @click="resetDiy">Reset</v-btn>
          <v-btn text color="primary" :disabled="diyBusy" @click="closeDiyDialog">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
import axios from 'axios'
import JSZip from 'jszip'

const LOCAL_3DUF_URL = 'http://localhost:8082'

export default {
  name: 'Library',
  data () {
    return {
      components: [],
      snackbar: false,
      snackbarText: '',
      snackbarColor: 'success',
      tableHeaders: [
        { text: 'Component Syntax', value: 'name', sortable: true, width: '220px' },
        { text: 'JSON file', value: 'jsonScript', sortable: false, width: '120px', align: 'center' },
        { text: '3DuF visualization', value: 'threeDuF', sortable: false, width: '180px', align: 'center' },
        { text: 'DIY this component', value: 'diy', sortable: false, width: '200px', align: 'center' },
        { text: 'Export', value: 'export', sortable: false, width: '150px', align: 'center' },
        { text: 'Remove', value: 'remove', sortable: false, width: '110px', align: 'center' },
      ],
      fileDialog: false,
      fileDialogTitle: '',
      fileDialogContent: '',
      fileDialogFileName: '',
      diyDialog: false,
      diyBusy: false,
      diyComponent: null,
      diyForm: {},
      guestSessionBootstrapped: false,
      removeBusySyntax: null,
    }
  },
  computed: {
    diyParamKeys () {
      return Object.keys(this.diyForm).sort()
    },
  },
  mounted () {
    this.loadComponents()
  },
  methods: {
    apiConfig () {
      return { withCredentials: true, headers: { 'Content-Type': 'application/json' } }
    },
    showSnack (text, color = 'success') {
      this.snackbarText = text
      this.snackbarColor = color
      this.snackbar = true
    },
    /** Only session custom rows (upload / workspace import / zip restore), not built-in defaults. */
    isRemovableComponent (item) {
      if (!item) return false
      return item.source === 'custom'
    },
    async loadComponents () {
      try {
        const res = await axios.get('/api/v1/componentFiles', this.apiConfig())
        const list = (res.data && Array.isArray(res.data.components)) ? res.data.components : []
        this.components = list
      } catch (err) {
        const status = err && err.response && err.response.status
        if (status === 401 && !this.guestSessionBootstrapped) {
          this.guestSessionBootstrapped = true
          try {
            await axios.post('/api/v2/guest', {}, this.apiConfig())
            this.$store.commit('setGuest')
            return this.loadComponents()
          } catch (_) {}
        }
        const msg = (err.response && err.response.data && err.response.data.error) || err.message || 'Unknown error'
        this.components = []
        this.showSnack(`Failed to load component files: ${msg}`, 'error')
      }
    },
    confirmRemoveComponent (item) {
      if (!this.isRemovableComponent(item)) return
      const label = item.name || item.syntax || 'this component'
      if (!window.confirm(`Remove "${label}" from your library? This cannot be undone.`)) return
      this.removeComponent(item)
    },
    async removeComponent (item) {
      const syntax = item && item.syntax
      if (!syntax || !this.isRemovableComponent(item)) return
      this.removeBusySyntax = syntax
      try {
        await axios.post('/api/v1/componentFiles/remove', { syntax }, this.apiConfig())
        this.showSnack('Component removed from library.', 'success')
        await this.loadComponents()
      } catch (err) {
        const msg = (err.response && err.response.data && err.response.data.error) || err.message || 'Unknown error'
        this.showSnack(msg, 'error')
      } finally {
        this.removeBusySyntax = null
      }
    },
    openFileView (item, type) {
      const syntax = item.syntax || 'component'
      const displayName = item.name || syntax
      if (type === 'lfr') {
        this.fileDialogTitle = `LFR file (${syntax})`
        this.fileDialogContent = item.lfrScript || ''
        this.fileDialogFileName = `${syntax}.lfr`
      } else if (type === 'mint') {
        this.fileDialogTitle = `MINT file (${syntax})`
        this.fileDialogContent = item.mintScript || ''
        this.fileDialogFileName = `${syntax}.mint`
      } else {
        this.fileDialogTitle = `JSON file (${displayName})`
        this.fileDialogContent = item.jsonViewScript || item.jsonScript || ''
        this.fileDialogFileName = `${syntax}.json`
      }
      this.fileDialog = true
    },
    triggerJsonImport () {
      const el = this.$refs.jsonImportInput
      if (el) el.click()
    },
    onJsonImportSelected (e) {
      const file = e && e.target && e.target.files && e.target.files[0]
      try { e.target.value = '' } catch (_) {}
      if (!file) return
      const fileName = String(file.name || '')
      if (!/\.json$/i.test(fileName)) {
        this.showSnack('Only .json files can be imported. Choose a file whose name ends with .json.', 'warning')
        return
      }
      file.text()
        .then((raw) => {
          let parsed = null
          try { parsed = JSON.parse(raw) } catch (_) {
            this.showSnack('Imported file is not valid JSON.', 'error')
            return
          }
          const baseName = String(file.name || 'component').replace(/\.json$/i, '')
          const customName = window.prompt(
            'Component name for library (case-sensitive; must match LFR token exactly):',
            baseName
          )
          if (!customName || !String(customName).trim()) return
          return axios.post('/api/v1/componentFiles/upload', {
            name: String(customName).trim(),
            jsonText: JSON.stringify(parsed),
          }, this.apiConfig())
            .then(() => {
              this.showSnack('JSON component imported into component library.', 'success')
              this.loadComponents()
            })
        })
        .catch(() => {
          this.showSnack('Failed to read imported file.', 'error')
        })
    },
    closeFileDialog () {
      this.fileDialog = false
      this.fileDialogTitle = ''
      this.fileDialogContent = ''
      this.fileDialogFileName = ''
    },
    saveBlobAsFile (filename, blob) {
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    },
    exportTextFile (filename, content, mime = 'text/plain') {
      const blob = new Blob([content == null ? '' : String(content)], { type: `${mime};charset=utf-8` })
      this.saveBlobAsFile(filename, blob)
    },
    exportCurrentFile () {
      if (!this.fileDialogFileName) return
      const isJson = /\.json$/i.test(this.fileDialogFileName)
      this.exportTextFile(this.fileDialogFileName, this.fileDialogContent, isJson ? 'application/json' : 'text/plain')
    },
    async exportAllFiles (item) {
      const syntax = item.syntax || 'component'
      const zip = new JSZip()
      zip.file(`${syntax}.json`, item.jsonScript || '')
      const blob = await zip.generateAsync({ type: 'blob' })
      const stamp = new Date().toISOString().replace(/[:.]/g, '-')
      this.saveBlobAsFile(`${syntax}_files_${stamp}.zip`, blob)
    },
    openDiyDialog (item) {
      this.diyComponent = item
      const next = {}
      const src = (item && item.params && typeof item.params === 'object') ? item.params : {}
      Object.keys(src).forEach((k) => { next[k] = String(src[k]) })
      this.diyForm = next
      this.diyDialog = true
    },
    closeDiyDialog () {
      this.diyDialog = false
      this.diyBusy = false
      this.diyComponent = null
      this.diyForm = {}
    },
    updateComponentInList (nextComponent) {
      if (!nextComponent || !nextComponent.syntax) return
      const idx = this.components.findIndex(c => String(c.syntax).toLowerCase() === String(nextComponent.syntax).toLowerCase())
      if (idx === -1) return
      this.$set(this.components, idx, nextComponent)
      this.diyComponent = nextComponent
      const next = {}
      const src = (nextComponent.params && typeof nextComponent.params === 'object') ? nextComponent.params : {}
      Object.keys(src).forEach((k) => { next[k] = String(src[k]) })
      this.diyForm = next
    },
    buildNumericParamsFromForm () {
      const params = {}
      for (const k of Object.keys(this.diyForm)) {
        const raw = String(this.diyForm[k]).trim()
        if (!raw.length) return { error: `Parameter "${k}" cannot be empty.` }
        const n = Number(raw)
        if (!Number.isFinite(n)) return { error: `Parameter "${k}" must be numeric.` }
        params[k] = n
      }
      return { params }
    },
    saveDiy () {
      if (!this.diyComponent || !this.diyComponent.syntax) return
      const parsed = this.buildNumericParamsFromForm()
      if (parsed.error) {
        this.showSnack(parsed.error, 'warning')
        return
      }
      this.diyBusy = true
      axios.put(
        `/api/v1/componentFiles/${encodeURIComponent(this.diyComponent.syntax)}`,
        { params: parsed.params },
        this.apiConfig()
      )
        .then((res) => {
          if (res.data && res.data.component) {
            this.updateComponentInList(res.data.component)
            this.showSnack('DIY parameters saved. LFR/MINT/JSON refreshed from tmp values.', 'success')
          }
        })
        .catch((err) => {
          const msg = (err.response && err.response.data && err.response.data.error) || err.message || 'Unknown error'
          this.showSnack(`Failed to save DIY parameters: ${msg}`, 'error')
        })
        .finally(() => { this.diyBusy = false })
    },
    resetDiy () {
      if (!this.diyComponent || !this.diyComponent.syntax) return
      this.diyBusy = true
      axios.post(`/api/v1/componentFiles/${encodeURIComponent(this.diyComponent.syntax)}/reset`, {}, this.apiConfig())
        .then((res) => {
          if (res.data && res.data.component) {
            this.updateComponentInList(res.data.component)
            this.showSnack('Reset to default values from Data/3DuF_component/default.', 'success')
          }
        })
        .catch((err) => {
          const msg = (err.response && err.response.data && err.response.data.error) || err.message || 'Unknown error'
          this.showSnack(`Failed to reset component: ${msg}`, 'error')
        })
        .finally(() => { this.diyBusy = false })
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

    openInLocal3DuF (item) {
      const rawJsonPayload = item && item.jsonScript != null ? item.jsonScript : ''
      const isEmptyString = (typeof rawJsonPayload === 'string' && !rawJsonPayload.trim())
      if (rawJsonPayload == null || isEmptyString) {
        this.showSnack('No JSON content available for this component.', 'warning')
        return
      }

      const parsed = this.parseJsonFor3DuF(rawJsonPayload)
      if (parsed.error) {
        if (parsed.error === 'html_response') {
          this.showSnack('Received HTML instead of JSON. Refresh Neptune/login, then retry opening 3DuF.', 'error')
        } else {
          this.showSnack('Component JSON is invalid and cannot be opened in 3DuF.', 'error')
        }
        return
      }

      const win = window.open(LOCAL_3DUF_URL, '_blank')
      if (!win) {
        this.showSnack('Popup blocked. Please allow popups to open 3DuF.', 'warning')
        return
      }

      const payloadText = { type: 'loadDeviceFromJSON', json: parsed.jsonText }
      const payloadObject = { type: 'loadDeviceFromJSON', json: parsed.jsonObject }
      const targetOrigin = new URL(LOCAL_3DUF_URL).origin
      const start = Date.now()
      const interval = setInterval(() => {
        if (win.closed || Date.now() - start > 10000) {
          clearInterval(interval)
          return
        }
        try {
          // Send to strict target and wildcard for compatibility with different 3DuF dev setups.
          win.postMessage(payloadText, targetOrigin)
          win.postMessage(payloadObject, targetOrigin)
          win.postMessage(payloadText, '*')
          win.postMessage(payloadObject, '*')
        } catch (_) {
          // Ignore transient cross-window timing errors during page boot.
        }
      }, 450)
    },
  },
}
</script>

<style scoped>
.component-library-case-hint.v-alert--outlined {
  border-color: rgba(0, 105, 148, 0.54) !important;
}

.component-library-case-hint >>> .v-alert__icon {
  color: #006994 !important;
}

.component-library-case-hint >>> .v-alert__content {
  font-size: calc(0.875rem + 5pt) !important;
  line-height: 1.5;
  color: #006994 !important;
}

.component-library-case-hint >>> .v-alert__content strong {
  color: #006994 !important;
}

.component-library-table >>> .v-data-table__wrapper table,
.component-library-table >>> .v-data-table__wrapper table th,
.component-library-table >>> .v-data-table__wrapper table td,
.component-library-table >>> .v-data-footer,
.component-library-table >>> .v-data-footer * {
  font-size: 14pt !important;
}

/* Table action buttons: casing + 1pt larger than table body (14pt) */
.component-library-table >>> tbody .v-btn,
.component-library-table >>> tbody .v-btn .v-btn__content {
  font-size: calc(14pt + 1pt) !important;
  text-transform: none !important;
  letter-spacing: normal !important;
}

.component-library-table .syntax-cell {
  font-family: monospace;
  background: rgba(0, 105, 148, 0.08);
  padding: 4px 8px;
  border-radius: 4px;
}

.component-library-file-dialog .v-card__title,
.component-library-diy-dialog .v-card__title {
  font-size: 14pt !important;
}

.component-library-file-dialog .v-card__text,
.component-library-file-dialog .v-card__actions,
.component-library-diy-dialog .v-card__text,
.component-library-diy-dialog .v-card__actions,
.component-library-diy-dialog .v-btn,
.component-library-file-dialog .v-btn {
  font-size: 12pt !important;
}

/* DIY dialog readability: +2pt for title/notes/parameter helper text. */
.component-library-diy-dialog .v-card__title {
  font-size: 16pt !important;
}

.component-library-diy-dialog .v-card__text,
.component-library-diy-dialog .v-card__actions,
.component-library-diy-dialog .v-btn,
.component-library-diy-dialog .caption {
  font-size: 14pt !important;
}

.component-library-diy-dialog >>> .v-text-field input,
.component-library-diy-dialog >>> .v-text-field .v-label,
.component-library-diy-dialog >>> .v-messages__message {
  font-size: 14pt !important;
}

.component-library-file-dialog >>> .v-btn,
.component-library-diy-dialog >>> .v-btn {
  text-transform: none !important;
  letter-spacing: normal !important;
}

.component-library-file-dialog >>> .v-btn .v-btn__content,
.component-library-diy-dialog >>> .v-btn .v-btn__content {
  text-transform: none !important;
  letter-spacing: normal !important;
}

.readonly-file-textarea >>> .v-input__slot textarea {
  font-family: monospace;
  font-size: 12pt;
}

.three-duf-go-btn {
  /* Matches src/assets/3duf_icon.png dominant blue: rgb(63, 81, 181) */
  background-color: rgb(63, 81, 181) !important;
  border-color: rgb(63, 81, 181) !important;
  color: #ffffff !important;
  text-transform: none !important;
  letter-spacing: normal !important;
}

.three-duf-go-btn >>> .v-btn__content {
  text-transform: none !important;
  letter-spacing: normal !important;
}

.diy-btn {
  background-color: #fb8c00 !important;
  border-color: #fb8c00 !important;
  color: #ffffff !important;
  font-size: 17pt !important;
  text-transform: none !important;
  letter-spacing: normal !important;
}

.diy-btn >>> .v-btn__content {
  font-size: 17pt !important;
  text-transform: none !important;
  letter-spacing: normal !important;
}

.export-files-btn {
  text-transform: none !important;
  letter-spacing: normal !important;
}

.remove-yes-btn {
  text-transform: none !important;
  letter-spacing: normal !important;
}

.remove-yes-btn >>> .v-btn__content {
  color: #ffffff !important;
}

.import-json-btn-icon {
  color: #ffffff !important;
}

.import-json-btn {
  background-color: #006994 !important;
  border-color: #006994 !important;
  font-size: calc(14pt + 2pt) !important;
  text-transform: none !important;
  letter-spacing: normal !important;
}

.import-json-btn >>> .v-btn__content {
  font-size: calc(14pt + 2pt) !important;
  text-transform: none !important;
  letter-spacing: normal !important;
}

.theme--dark .three-duf-go-btn {
  background-color: rgb(63, 81, 181) !important;
  border-color: rgb(63, 81, 181) !important;
  color: #ffffff !important;
  text-transform: none !important;
  letter-spacing: normal !important;
}

.theme--dark .diy-btn {
  background-color: #ffb74d !important;
  border-color: #ffb74d !important;
}

.theme--dark .import-json-btn {
  background-color: #00838f !important;
  border-color: #00838f !important;
}
</style>
