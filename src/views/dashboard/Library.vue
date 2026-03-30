<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-text>
            <v-data-table
              :headers="tableHeaders"
              :items="components"
              :items-per-page="10"
              class="component-library-table"
            >
              <template v-slot:header.syntax="{ header }">
                <span>{{ header.text }}</span>
                <v-tooltip bottom max-width="280">
                  <template v-slot:activator="{ on, attrs }">
                    <v-icon small class="ml-1" v-bind="attrs" v-on="on">mdi-help-circle-outline</v-icon>
                  </template>
                  <span>Keyword used to call this component in MINT/LFR (e.g. mixer, port, valve).</span>
                </v-tooltip>
              </template>
              <template v-slot:header.picture="{ header }">
                <span>{{ header.text }}</span>
                <v-tooltip bottom max-width="280">
                  <template v-slot:activator="{ on, attrs }">
                    <v-icon small class="ml-1" v-bind="attrs" v-on="on">mdi-help-circle-outline</v-icon>
                  </template>
                  <span>Preview image of the component (.png).</span>
                </v-tooltip>
              </template>
              <template v-slot:header.mintScript="{ header }">
                <span>{{ header.text }}</span>
                <v-tooltip bottom max-width="280">
                  <template v-slot:activator="{ on, attrs }">
                    <v-icon small class="ml-1" v-bind="attrs" v-on="on">mdi-help-circle-outline</v-icon>
                  </template>
                  <span>MINT structural-level description code. Editable per account; guest customizations are cleared when you leave.</span>
                </v-tooltip>
              </template>
              <template v-slot:header.jsonScript="{ header }">
                <span>{{ header.text }}</span>
                <v-tooltip bottom max-width="280">
                  <template v-slot:activator="{ on, attrs }">
                    <v-icon small class="ml-1" v-bind="attrs" v-on="on">mdi-help-circle-outline</v-icon>
                  </template>
                  <span>JSON structural-level description code. Editable per account; guest customizations are cleared when you leave.</span>
                </v-tooltip>
              </template>
              <template v-slot:header.import="{ header }">
                <span>{{ header.text }}</span>
                <v-tooltip bottom max-width="280">
                  <template v-slot:activator="{ on, attrs }">
                    <v-icon small class="ml-1" v-bind="attrs" v-on="on">mdi-help-circle-outline</v-icon>
                  </template>
                  <span>Import to workspace: Neptune will use this customized component instead of the default assignment.</span>
                </v-tooltip>
              </template>

              <template v-slot:item.syntax="{ item }">
                <code class="syntax-cell">{{ item.syntax }}</code>
              </template>
              <template v-slot:item.picture="{ item }">
                <img
                  v-if="item.picture"
                  :src="item.picture"
                  :alt="item.syntax"
                  class="component-picture"
                />
                <span v-else class="grey--text">—</span>
              </template>
              <template v-slot:item.mintScript="{ item }">
                <v-btn small text color="primary" @click="openEditDialog(item, 'mintScript')">
                  Click to edit
                </v-btn>
              </template>
              <template v-slot:item.jsonScript="{ item }">
                <v-btn small text color="primary" @click="openEditDialog(item, 'jsonScript')">
                  Click to edit
                </v-btn>
              </template>
              <template v-slot:item.import="{ item }">
                <v-btn
                  small
                  class="import-btn white--text"
                  @click="importToWorkspace(item)"
                >
                  Yes
                </v-btn>
              </template>
              <template v-slot:body.append>
                <tr>
                  <td :colspan="tableHeaders.length" class="text-center py-3">
                    <v-btn small icon color="primary" @click="addNewComponent">
                      <v-icon small>mdi-plus</v-icon>
                    </v-btn>
                  </td>
                </tr>
              </template>
            </v-data-table>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
    <v-snackbar v-model="snackbar" :color="snackbarColor" :timeout="4000" bottom>
      {{ snackbarText }}
    </v-snackbar>

    <v-dialog v-model="editDialog" max-width="700px" persistent>
      <v-card class="component-library-edit-dialog">
        <v-card-title class="headline component-edit-dialog-title">
          Edit {{ editDialogField === 'mintScript' ? 'MINT script' : 'JSON script' }} for \"{{ editDialogSyntax }}\"
        </v-card-title>
        <v-card-text>
          <v-textarea
            v-model="editDialogValue"
            outlined
            rows="12"
            hide-details="auto"
            class="example-textarea"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text color="secondary" @click="resetEditDialogToDefault">Back to default</v-btn>
          <v-btn text color="primary" @click="closeEditDialog">Cancel</v-btn>
          <v-btn text color="success" @click="saveEditDialog">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
import axios from 'axios'
import guestStore from '@/lib/guestStore'

const DEFAULT_COMPONENTS = [
  {
    syntax: 'mixer',
    picture: '',
    mintScript:
`// Example MINT-style definition (see Data/example)
device mixer_1 {
  channel in1;
  channel in2;
  channel out1;
}
`,
    jsonScript:
`{
  \"component\": \"mixer\",
  \"ports\": [\"in1\", \"in2\", \"out1\"],
  \"type\": \"flow\"
}
`,
    _id: 'mixer',
  },
  {
    syntax: 'port',
    picture: '',
    mintScript:
`// Example MINT-style port
port p1 {
  layer control;
}
`,
    jsonScript:
`{
  \"component\": \"port\",
  \"name\": \"p1\",
  \"layer\": \"control\"
}
`,
    _id: 'port',
  },
  {
    syntax: 'valve',
    picture: '',
    mintScript:
`// Example MINT-style valve
valve v1 {
  channel flow;
  port control;
}
`,
    jsonScript:
`{
  \"component\": \"valve\",
  \"name\": \"v1\",
  \"connections\": {
    \"flow\": \"flow\",
    \"control\": \"control\"
  }
}
`,
    _id: 'valve',
  },
  {
    syntax: 'channel',
    picture: '',
    mintScript:
`// Example MINT-style channel
channel c1 {
  width 200um;
  length 5mm;
}
`,
    jsonScript:
`{
  \"component\": \"channel\",
  \"name\": \"c1\",
  \"width_um\": 200,
  \"length_mm\": 5
}
`,
    _id: 'channel',
  },
]

export default {
  name: 'Library',
  data () {
    return {
      components: [],
      snackbar: false,
      snackbarText: '',
      snackbarColor: 'success',
      tableHeaders: [
        { text: 'Syntax', value: 'syntax', sortable: true, width: '140px' },
        { text: 'Picture', value: 'picture', sortable: false, width: '120px' },
        { text: 'MINT script', value: 'mintScript', sortable: false, width: '180px' },
        { text: 'JSON script', value: 'jsonScript', sortable: false, width: '180px' },
        { text: 'Import', value: 'import', sortable: false, width: '120px', align: 'center' },
      ],
      editDialog: false,
      editDialogValue: '',
      editDialogField: null,
      editDialogIndex: null,
      editDialogSyntax: '',
    }
  },
  mounted () {
    this.loadComponents()
  },
  methods: {
    loadComponents () {
      const isGuest = this.$store.getters.isGuest
      if (isGuest) {
        this.components = this.cloneDefaultComponents()
        return
      }
      const config = { withCredentials: true, headers: { 'Content-Type': 'application/json' } }
      axios.get('/api/v1/componentLibrary', config)
        .then((res) => {
          if (res.data && Array.isArray(res.data.components) && res.data.components.length > 0) {
            this.components = res.data.components
          } else {
            this.components = this.cloneDefaultComponents()
          }
        })
        .catch(() => {
          this.components = this.cloneDefaultComponents()
        })
    },
    cloneDefaultComponents () {
      return DEFAULT_COMPONENTS.map(c => ({
        ...c,
        mintScript: c.mintScript || '',
        jsonScript: c.jsonScript || '',
        picture: c.picture || '',
      }))
    },
    persistIfLoggedIn () {
      if (this.$store.getters.isGuest) return
      const config = { withCredentials: true, headers: { 'Content-Type': 'application/json' } }
      axios.put('/api/v1/componentLibrary', { components: this.components }, config).catch(() => {})
    },
    openEditDialog (item, field) {
      const index = this.components.indexOf(item)
      if (index === -1) return
      this.editDialogIndex = index
      this.editDialogField = field
      this.editDialogSyntax = item.syntax || ''
      this.editDialogValue = item[field] || ''
      this.editDialog = true
    },
    closeEditDialog () {
      this.editDialog = false
      this.editDialogValue = ''
      this.editDialogField = null
      this.editDialogIndex = null
      this.editDialogSyntax = ''
    },
    resetEditDialogToDefault () {
      if (!this.editDialogField || !this.editDialogSyntax) return
      const def = DEFAULT_COMPONENTS.find(
        c => (c.syntax || '').toLowerCase() === String(this.editDialogSyntax).toLowerCase()
      )
      if (!def) {
        this.snackbarText = 'No default exists for this component.'
        this.snackbarColor = 'warning'
        this.snackbar = true
        return
      }

      const defaultValue = def[this.editDialogField] || ''

      if (this.editDialogIndex != null) {
        const item = this.components[this.editDialogIndex]
        if (item) {
          this.$set(item, this.editDialogField, defaultValue)
        }
      }

      this.editDialogValue = defaultValue
      this.persistIfLoggedIn()

      this.snackbarText = 'Reverted to default ' + (this.editDialogField === 'mintScript' ? 'MINT' : 'JSON') + ' script.'
      this.snackbarColor = 'success'
      this.snackbar = true

      this.closeEditDialog()
    },
    saveEditDialog () {
      if (this.editDialogIndex == null || !this.editDialogField) {
        this.closeEditDialog()
        return
      }
      const item = this.components[this.editDialogIndex]
      if (item) {
        this.$set(item, this.editDialogField, this.editDialogValue || '')
        this.persistIfLoggedIn()
      }
      this.closeEditDialog()
    },
    addNewComponent () {
      const syntax = window.prompt('New component syntax (keyword):')
      if (!syntax) return
      const trimmed = String(syntax).trim()
      if (!trimmed) return
      if (this.components.some(c => (c.syntax || '').toLowerCase() === trimmed.toLowerCase())) {
        this.snackbarText = 'Syntax already exists.'
        this.snackbarColor = 'warning'
        this.snackbar = true
        return
      }
      this.components.push({
        syntax: trimmed,
        picture: '',
        mintScript: '',
        jsonScript: '',
      })
      this.persistIfLoggedIn()
    },
    importToWorkspace (item) {
      const ws = this.$store.getters.currentWorkspace
      if (!ws || !ws._id) {
        this.snackbarText = 'Select or create a workspace first.'
        this.snackbarColor = 'warning'
        this.snackbar = true
        return
      }
      const fileName = `_component_${(item.syntax || '').replace(/\s+/g, '_')}.json`
      const payload = {
        syntax: item.syntax || '',
        mint: item.mintScript || '',
        json: item.jsonScript || '',
      }
      const content = JSON.stringify(payload, null, 2)
      const config = { withCredentials: true, headers: { 'Content-Type': 'application/json' } }
      if (this.$store.getters.isGuest) {
        let file = guestStore.getFiles(ws._id).find(f => f.name === fileName)
        if (!file) file = guestStore.createFile(ws._id, fileName, '.json')
        if (file) guestStore.updateFile(ws._id, file.id, content)
        this.snackbarText = 'Component imported to workspace (guest).'
        this.snackbarColor = 'success'
        this.snackbar = true
        return
      }
      axios.post('/api/v1/file', { workspaceid: ws._id, file_name: fileName, ext: '.json' }, config)
        .then((res) => {
          const fileId = res.data.id
          return axios.put('/api/v1/file', { fileid: fileId, text: content }, config)
        })
        .then(() => {
          this.snackbarText = 'Component imported to workspace. Neptune will use this instead of default.'
          this.snackbarColor = 'success'
          this.snackbar = true
        })
        .catch((err) => {
          const msg = (err.response && err.response.data && (err.response.data.error || err.response.data.message)) || err.message
          this.snackbarText = 'Import failed: ' + (msg || 'please try again.')
          this.snackbarColor = 'error'
          this.snackbar = true
        })
    },
  },
}
</script>

<style scoped>
/* Component Library page: ALL table text 14pt */
.component-library-table >>> .v-data-table__wrapper table,
.component-library-table >>> .v-data-table__wrapper table th,
.component-library-table >>> .v-data-table__wrapper table td,
.component-library-table >>> .v-data-footer,
.component-library-table >>> .v-data-footer * {
  font-size: 14pt !important;
}
.component-library-table >>> .v-data-table__wrapper .v-btn,
.component-library-table >>> .v-data-table__wrapper .v-btn__content,
.component-library-table >>> .v-data-table__wrapper .v-btn__content > span {
  font-size: 14pt !important;
}
.v-card .v-card__title:not(.component-edit-dialog-title) {
  font-size: 14pt !important;
}
.component-library-table .syntax-cell {
  font-family: monospace;
  background: rgba(0, 105, 148, 0.08);
  padding: 4px 8px;
  border-radius: 4px;
}
.component-picture {
  max-width: 80px;
  max-height: 60px;
  object-fit: contain;
}
/* Edit dialog: title 14pt, rest 12pt */
.component-library-edit-dialog .component-edit-dialog-title {
  font-size: 14pt !important;
}
.component-library-edit-dialog .v-card__text,
.component-library-edit-dialog .v-card__actions,
.component-library-edit-dialog .v-btn {
  font-size: 12pt !important;
}
.example-textarea >>> .v-input__slot textarea {
  font-family: monospace;
  font-size: 12pt;
}
.import-btn {
  background-color: #4caf50 !important;
  border-color: #4caf50 !important;
}
.theme--dark .import-btn {
  background-color: #66bb6a !important;
  border-color: #66bb6a !important;
}
</style>
