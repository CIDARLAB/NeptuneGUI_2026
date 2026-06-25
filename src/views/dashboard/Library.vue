<template>
  <v-container fluid id="component-library" class="component-library-page">
    <v-row>
      <v-col cols="12">
        <v-card class="component-library-main-card" flat>
          <v-card-text class="component-library-card-text">
            <v-alert
              dense
              outlined
              color="primary"
              icon="mdi-information"
              class="mb-3 component-library-case-hint"
            >
              <div class="component-library-case-hint-row">
                <div class="component-library-case-hint-text">
                  <strong>All component syntax in the table below is shown using the LFR naming convention</strong>
                  (lowercase <code>snake_case</code>; MINT uses the uppercase form, e.g.
                  <code>droplet_generator</code> / <code>DROPLET_GENERATOR</code>).
                  Custom components must be imported with names that strictly follow the LFR convention&mdash;non-conforming
                  names will be flagged with an option to auto-convert.
                </div>
                <v-btn
                  small
                  outlined
                  color="primary"
                  class="component-library-spec-btn ml-3"
                  :href="namingSpecUrl"
                  target="_blank"
                  rel="noopener"
                >
                  <v-icon left small>mdi-github</v-icon>
                  View full spec
                </v-btn>
              </div>
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
              <template v-slot:item.name="{ item }">
                <div class="syntax-cell-wrap">
                  <code class="syntax-cell">{{ item.name || item.syntax }}</code>
                  <v-tooltip v-if="descriptionFor(item)" bottom max-width="320">
                    <template v-slot:activator="{ on, attrs }">
                      <v-icon
                        small
                        class="ml-1 syntax-cell-help"
                        v-bind="attrs"
                        v-on="on"
                        tabindex="0"
                      >
                        mdi-help-circle-outline
                      </v-icon>
                    </template>
                    <span>{{ descriptionFor(item) }}</span>
                  </v-tooltip>
                </div>
              </template>
              <template v-slot:item.jsonScript="{ item }">
                <v-btn small text color="primary" @click="openFileView(item, 'json')">View</v-btn>
              </template>

              <template v-slot:item.threeDuF="{ item }">
                <v-tooltip bottom>
                  <template v-slot:activator="{ on, attrs }">
                    <v-btn
                      small
                      class="three-duf-go-btn white--text"
                      v-bind="attrs"
                      v-on="on"
                      @click="openIn3DuF(item)"
                    >
                      Go to 3DuF
                    </v-btn>
                  </template>
                  <span>Open 3DuF with this component’s JSON for visualization</span>
                </v-tooltip>
              </template>

              <template v-slot:item.diy="{ item }">
                <v-tooltip bottom>
                  <template v-slot:activator="{ on, attrs }">
                    <v-btn
                      small
                      class="diy-btn white--text"
                      v-bind="attrs"
                      v-on="on"
                      @click="openDiyDialog(item)"
                    >
                      Yes
                    </v-btn>
                  </template>
                  <span>DIY this component — edit numeric parameters</span>
                </v-tooltip>
              </template>

              <template v-slot:item.export="{ item }">
                <v-tooltip bottom>
                  <template v-slot:activator="{ on, attrs }">
                    <v-btn
                      small
                      class="export-files-btn white--text"
                      color="success"
                      depressed
                      dark
                      v-bind="attrs"
                      v-on="on"
                      @click="exportAllFiles(item)"
                    >
                      Yes
                    </v-btn>
                  </template>
                  <span>Export this component’s JSON as a .json file</span>
                </v-tooltip>
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
        <v-card-title class="headline component-library-dialog-title">
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
        <v-card-title class="headline component-library-dialog-title">
          DIY this component: {{ diyComponent ? diyComponent.syntax : '' }}
        </v-card-title>
        <v-card-text>
          <p class="caption grey--text text--darken-1 mb-3">
            The name above is shown in LFR form (lowercase snake_case). Reference it as-is in LFR; in MINT use the uppercase form.
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
          >
            <template v-slot:append-outer>
              <v-tooltip bottom max-width="360">
                <template v-slot:activator="{ on, attrs }">
                  <v-icon
                    small
                    class="diy-param-help-icon"
                    v-bind="attrs"
                    v-on="on"
                    tabindex="0"
                  >
                    mdi-help-circle-outline
                  </v-icon>
                </template>
                <span>{{ diyParamDescription(key) }}</span>
              </v-tooltip>
            </template>
          </v-text-field>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text color="success" :loading="diyBusy" @click="saveDiy">Save</v-btn>
          <v-btn text color="warning" :loading="diyBusy" @click="resetDiy">Reset</v-btn>
          <v-btn text color="primary" :disabled="diyBusy" @click="closeDiyDialog">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="namingDialog" max-width="520px" persistent>
      <v-card class="component-library-naming-dialog">
        <v-card-title class="headline component-library-dialog-title">
          Apply LFR naming convention?
        </v-card-title>
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
  </v-container>
</template>

<script>
import axios from 'axios'
import { openAndLoadDeviceIn3DuF } from '@/lib/open3DuFPostMessage'
import {
  LFR_NAMING_SPEC_URL,
  validateAndNormalizeLfrName,
} from '@/lib/lfrNaming'

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
        { text: 'Export JSON', value: 'export', sortable: false, width: '150px', align: 'center' },
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
      namingSpecUrl: LFR_NAMING_SPEC_URL,
      namingDialog: false,
      namingDialogOriginal: '',
      namingDialogNormalized: '',
      namingDialogResolver: null,
      defaultComponentDescriptions: {
        channel: 'Microfluidic channel that conveys fluid between components.',
        valve: 'Pneumatically actuated valve that gates flow on a channel.',
        valve3d: '3D valve primitive with editable gap, radius, height, and rotation for flow-control geometry.',
        valve_3d: '3D valve primitive with editable gap, radius, height, and rotation for flow-control geometry.',
        mixer: 'Serpentine mixer that combines two or more input streams via diffusion.',
        mux: 'Multiplexer that routes one input to a selected output channel.',
        port: 'External I/O port for connecting tubing or pressure lines to the chip.',
        reaction_chamber: 'Chamber where reagents mix, react, or incubate.',
        tree: 'Branching network that splits a single stream into multiple equal outputs.',
        nozzle_droplet_generator: 'Flow-focusing nozzle that generates monodisperse droplets in a continuous phase.',
        picoinjector: 'Injects picoliter volumes of reagent into passing droplets.',
      },
      diyParamDescriptionsByComponent: {
        valve: {
          rotation: 'Valve orientation in degrees; rotates the valve geometry around its insertion point.',
          gap: 'Flow-gap opening used by the valve geometry; larger values increase the open passage size.',
          valveradius: 'Valve body radius; larger values create a larger circular valve footprint.',
          width: 'Valve body width in the rendered geometry.',
          length: 'Valve body length in the rendered geometry.',
          height: 'Extrusion height (z dimension) used for valve rendering/manufacturing layers.',
          componentspacing: 'Placement offset used by the component macro when positioning local valve features.',
        },
        valve3d: {
          rotation: 'Valve orientation in degrees; rotates the valve geometry around its insertion point.',
          gap: 'Flow-gap opening used by the valve geometry; larger values increase the open passage size.',
          valveradius: 'Valve body radius; larger values create a larger circular valve footprint.',
          width: 'Valve body width in the rendered geometry.',
          length: 'Valve body length in the rendered geometry.',
          height: 'Extrusion height (z dimension) used for valve rendering/manufacturing layers.',
          componentspacing: 'Placement offset used by the component macro when positioning local valve features.',
        },
      },
      diyParamDescriptionsGeneric: {
        width: 'Overall width of the feature/component geometry in layout units.',
        length: 'Overall length of the feature/component geometry in layout units.',
        height: 'Feature height (z dimension) used in multilayer/3D rendering context.',
        radius: 'Radius used to construct circular geometry elements.',
        valveradius: 'Valve radius used to construct the valve body geometry.',
        rotation: 'Rotation angle in degrees applied to the feature/component orientation.',
        gap: 'Gap/opening size that controls spacing between two relevant geometry boundaries.',
        channelwidth: 'Width of the channel cross-section in the flow layer.',
        connectionspacing: 'Spacing value used when routing or placing connection/channel segments.',
        componentspacing: 'Spacing offset used when placing component-local geometry around anchors.',
        portradius: 'Port radius that controls the size of circular I/O port openings.',
      },
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
    /**
     * Return a short function description for a built-in default component, or '' otherwise.
     * Custom-imported components have no canonical description, so the help icon stays hidden.
     */
    descriptionFor (item) {
      if (!item || item.source === 'custom') return ''
      const key = String(item.syntax || item.name || '').toLowerCase()
      return this.defaultComponentDescriptions[key] || ''
    },
    diyParamDescription (key) {
      const normalizedKey = String(key || '').trim().toLowerCase()
      const syntax = String((this.diyComponent && (this.diyComponent.syntax || this.diyComponent.name)) || '').toLowerCase()
      const byComponent = this.diyParamDescriptionsByComponent[syntax] || {}
      if (byComponent[normalizedKey]) return byComponent[normalizedKey]
      if (this.diyParamDescriptionsGeneric[normalizedKey]) return this.diyParamDescriptionsGeneric[normalizedKey]
      return `Numeric parameter used by this component. Increasing "${key}" updates the same field in the generated JSON and may change the rendered geometry.`
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
    /** Show the normalize-confirmation dialog and resolve true (Use LFR) / false (Cancel). */
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
    async onJsonImportSelected (e) {
      const file = e && e.target && e.target.files && e.target.files[0]
      try { e.target.value = '' } catch (_) {}
      if (!file) return
      const fileName = String(file.name || '')
      if (!/\.json$/i.test(fileName)) {
        this.showSnack('Only .json files can be imported. Choose a file whose name ends with .json.', 'warning')
        return
      }

      let raw
      try {
        raw = await file.text()
      } catch (_) {
        this.showSnack('Failed to read imported file.', 'error')
        return
      }

      let parsed
      try {
        parsed = JSON.parse(raw)
      } catch (_) {
        this.showSnack('Imported file is not valid JSON.', 'error')
        return
      }

      const baseName = String(file.name || 'component').replace(/\.json$/i, '')
      const customName = window.prompt(
        'Component name for the library (LFR naming convention: lowercase snake_case, e.g. droplet_generator):',
        baseName
      )
      if (!customName || !String(customName).trim()) return

      const check = validateAndNormalizeLfrName(customName)
      if (!check.valid) {
        this.showSnack(`Invalid component name: ${check.reason}`, 'error')
        return
      }

      let finalName = check.normalized
      if (check.needsNormalization) {
        const accepted = await this.askToNormalizeLfrName(String(customName).trim(), check.normalized)
        if (!accepted) {
          this.showSnack('Import canceled. Re-enter the name in LFR form (lowercase snake_case) to import.', 'warning')
          return
        }
        finalName = check.normalized
      }

      try {
        await axios.post('/api/v1/componentFiles/upload', {
          name: finalName,
          jsonText: JSON.stringify(parsed),
        }, this.apiConfig())
        this.showSnack(`JSON component imported as "${finalName}".`, 'success')
        this.loadComponents()
      } catch (err) {
        const msg = (err.response && err.response.data && err.response.data.error) || err.message || 'Unknown error'
        this.showSnack(`Failed to import component: ${msg}`, 'error')
      }
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
    exportAllFiles (item) {
      const syntax = item.syntax || 'component'
      const content = item.jsonScript || ''
      const stamp = new Date().toISOString().replace(/[:.]/g, '-')
      this.exportTextFile(`${syntax}_${stamp}.json`, content, 'application/json')
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

    openIn3DuF (item) {
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

      const result = openAndLoadDeviceIn3DuF(parsed.jsonObject)
      if (!result.ok) {
        if (result.reason === 'popup_blocked') {
          this.showSnack('Popup blocked. Please allow popups to open 3DuF.', 'warning')
        } else {
          this.showSnack('Component JSON is invalid and cannot be opened in 3DuF.', 'error')
        }
      }
    },
  },
}
</script>

<style scoped>
/* —— Page shell (align with Dashboard workspace cards) —— */
#component-library .component-library-main-card {
  border: 1px solid rgba(0, 51, 73, 0.12) !important;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06) !important;
  border-radius: 6px;
}

#component-library .component-library-card-text {
  padding: 20px 24px 24px !important;
}

.component-library-case-hint.v-alert--outlined {
  border-color: rgba(0, 105, 148, 0.45) !important;
  background: rgba(0, 105, 148, 0.04) !important;
}

.component-library-case-hint >>> .v-alert__icon {
  color: #006994 !important;
}

.component-library-case-hint >>> .v-alert__content {
  font-size: var(--neptune-fs-body, 14pt) !important;
  line-height: 1.55;
  color: rgba(0, 0, 0, 0.87) !important;
}

.theme--dark .component-library-case-hint >>> .v-alert__content {
  color: rgba(255, 255, 255, 0.9) !important;
}

.component-library-case-hint >>> .v-alert__content strong {
  color: #006994 !important;
  font-weight: 600;
}

.component-library-case-hint >>> .v-alert__content code {
  font-family: var(--neptune-font-code), monospace;
  background: rgba(0, 105, 148, 0.08);
  color: #006994;
  padding: 0 4px;
  border-radius: 3px;
  font-size: 0.95em;
}

.theme--dark .component-library-case-hint >>> .v-alert__content code {
  background: rgba(255, 255, 255, 0.08);
  color: #80deea;
}

.component-library-case-hint-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.component-library-case-hint-text {
  flex: 1 1 320px;
  min-width: 0;
}

.component-library-spec-btn {
  text-transform: none !important;
  letter-spacing: normal !important;
  flex: 0 0 auto;
}

.component-library-spec-btn >>> .v-btn__content {
  text-transform: none !important;
  letter-spacing: normal !important;
}

.component-library-table >>> .v-data-table__wrapper table thead th {
  font-size: var(--neptune-fs-label, 13.25pt) !important;
  font-weight: 600 !important;
  color: rgba(0, 0, 0, 0.75) !important;
  border-bottom: thin solid rgba(0, 51, 73, 0.12) !important;
}

.theme--dark .component-library-table >>> .v-data-table__wrapper table thead th {
  color: rgba(255, 255, 255, 0.85) !important;
}

.component-library-table >>> .v-data-table__wrapper table tbody td,
.component-library-table >>> .v-data-footer,
.component-library-table >>> .v-data-footer * {
  font-size: var(--neptune-fs-body, 14pt) !important;
}

.component-library-table >>> .v-data-table__wrapper table tbody tr:hover {
  background: rgba(0, 105, 148, 0.04) !important;
}

.component-library-table >>> tbody .v-btn,
.component-library-table >>> tbody .v-btn .v-btn__content {
  font-size: var(--neptune-fs-body, 14pt) !important;
  text-transform: none !important;
  letter-spacing: normal !important;
}

.component-library-table .syntax-cell {
  font-family: var(--neptune-font-code), monospace;
  background: rgba(0, 105, 148, 0.08);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: var(--neptune-fs-body, 14pt);
}

.component-library-table .syntax-cell-wrap {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.component-library-table .syntax-cell-help {
  color: rgba(0, 105, 148, 0.6);
  outline: none;
  transition: color 120ms ease;
}

.component-library-table .syntax-cell-help:hover,
.component-library-table .syntax-cell-help:focus {
  color: #006994;
}

.theme--dark .component-library-table .syntax-cell-help {
  color: rgba(128, 222, 234, 0.65);
}

.theme--dark .component-library-table .syntax-cell-help:hover,
.theme--dark .component-library-table .syntax-cell-help:focus {
  color: #80deea;
}

.component-library-dialog-title {
  font-size: var(--neptune-fs-section, 1.1875rem) !important;
  font-weight: 600 !important;
  letter-spacing: -0.015em;
  line-height: 1.35;
}

.component-library-file-dialog .v-card__text,
.component-library-file-dialog .v-card__actions,
.component-library-diy-dialog .v-card__text,
.component-library-diy-dialog .v-card__actions,
.component-library-naming-dialog .v-card__text,
.component-library-naming-dialog .v-card__actions {
  font-size: var(--neptune-fs-body, 14pt) !important;
}

.component-library-naming-dialog .caption {
  font-size: var(--neptune-fs-label, 13.25pt) !important;
}

.component-library-naming-dialog code {
  font-family: var(--neptune-font-code), monospace;
  background: rgba(0, 105, 148, 0.08);
  color: #006994;
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 0.95em;
}

.theme--dark .component-library-naming-dialog code {
  background: rgba(255, 255, 255, 0.08);
  color: #80deea;
}

.component-library-naming-dialog .naming-diff {
  border: 1px solid rgba(0, 51, 73, 0.12);
  border-radius: 6px;
  padding: 10px 14px;
  background: rgba(0, 105, 148, 0.03);
}

.theme--dark .component-library-naming-dialog .naming-diff {
  border-color: rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.03);
}

.component-library-naming-dialog .naming-diff-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 4px 0;
}

.component-library-naming-dialog .naming-diff-label {
  flex: 0 0 110px;
  color: rgba(0, 0, 0, 0.6);
  font-size: var(--neptune-fs-label, 13.25pt);
}

.theme--dark .component-library-naming-dialog .naming-diff-label {
  color: rgba(255, 255, 255, 0.7);
}

.component-library-naming-dialog .naming-diff-original {
  color: #c62828;
  background: rgba(198, 40, 40, 0.08);
}

.theme--dark .component-library-naming-dialog .naming-diff-original {
  color: #ef9a9a;
  background: rgba(239, 154, 154, 0.12);
}

.component-library-naming-dialog .naming-diff-normalized {
  color: #2e7d32;
  background: rgba(46, 125, 50, 0.08);
}

.theme--dark .component-library-naming-dialog .naming-diff-normalized {
  color: #a5d6a7;
  background: rgba(165, 214, 167, 0.12);
}

.component-library-naming-dialog >>> .v-btn,
.component-library-naming-dialog >>> .v-btn .v-btn__content {
  text-transform: none !important;
  letter-spacing: normal !important;
}

.component-library-diy-dialog .caption {
  font-size: var(--neptune-fs-label, 13.25pt) !important;
}

.component-library-diy-dialog >>> .v-text-field input,
.component-library-diy-dialog >>> .v-text-field .v-label,
.component-library-diy-dialog >>> .v-messages__message {
  font-size: var(--neptune-fs-body, 14pt) !important;
}

.component-library-diy-dialog .diy-param-help-icon {
  color: rgba(0, 105, 148, 0.6);
  cursor: help;
  transition: color 120ms ease;
}

.component-library-diy-dialog .diy-param-help-icon:hover,
.component-library-diy-dialog .diy-param-help-icon:focus {
  color: #006994;
}

.theme--dark .component-library-diy-dialog .diy-param-help-icon {
  color: rgba(128, 222, 234, 0.72);
}

.theme--dark .component-library-diy-dialog .diy-param-help-icon:hover,
.theme--dark .component-library-diy-dialog .diy-param-help-icon:focus {
  color: #80deea;
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
  font-family: var(--neptune-font-code), monospace !important;
  font-size: var(--neptune-fs-body, 14pt) !important;
  line-height: 1.45;
}

/* 3DuF partner accent (Material indigo), distinct from Neptune primary */
.three-duf-go-btn {
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
  font-size: var(--neptune-fs-body, 14pt) !important;
  text-transform: none !important;
  letter-spacing: normal !important;
}

.diy-btn >>> .v-btn__content {
  font-size: var(--neptune-fs-body, 14pt) !important;
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
  font-size: var(--neptune-fs-body, 14pt) !important;
  text-transform: none !important;
  letter-spacing: normal !important;
}

.import-json-btn >>> .v-btn__content {
  font-size: var(--neptune-fs-body, 14pt) !important;
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
