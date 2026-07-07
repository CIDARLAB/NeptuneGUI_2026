<template>
  <base-material-card
    :color="cardColor"
    class="v-card--material-stats file-stats-card"
    v-bind="$attrs"
    v-on="$listeners"
  >
    <template v-slot:heading>
      <span class="file-stats-ext-heading">{{ ext || '—' }}</span>
    </template>

    <div class="file-stats-actions-row">
      <div class="file-stats-actions d-flex align-center justify-center">
        <v-tooltip bottom>
          <template v-slot:activator="{ on, attrs }">
            <v-btn
              text
              icon
              color="green"
              class="file-stats-action-btn"
              v-bind="attrs"
              v-on="on"
              @click="downloadfile(id)"
            >
              <v-icon>mdi-download</v-icon>
            </v-btn>
          </template>
          <span>Download this file</span>
        </v-tooltip>
        <v-tooltip
          v-if="(ext || '').toLowerCase() !== '.log' && (ext || '').toLowerCase() !== '.json'"
          bottom
        >
          <template v-slot:activator="{ on, attrs }">
            <v-btn
              text
              icon
              color="blue"
              class="file-stats-action-btn"
              v-bind="attrs"
              v-on="on"
              @click="editfile(id)"
            >
              <v-icon>mdi-pen</v-icon>
            </v-btn>
          </template>
          <span>Open this file in the Editor</span>
        </v-tooltip>
        <v-tooltip
          v-if="(ext || '').toLowerCase() === '.json'"
          bottom
        >
          <template v-slot:activator="{ on, attrs }">
            <v-btn
              text
              icon
              color="purple"
              class="file-stats-action-btn"
              v-bind="attrs"
              v-on="on"
              @click="$emit('view3duf', { id, name, workspaceid, ext, content })"
            >
              <img
                class="go-3duf-btn-logo"
                :src="logo3duf"
                alt="3DuF"
              >
            </v-btn>
          </template>
          <span>Open design JSON in 3DuF</span>
        </v-tooltip>
        <v-tooltip
          v-if="(ext || '').toLowerCase() === '.json'"
          bottom
        >
          <template v-slot:activator="{ on, attrs }">
            <v-btn
              text
              icon
              color="primary"
              class="file-stats-action-btn"
              v-bind="attrs"
              v-on="on"
              @click="$emit('importComponentJson', { id, name, workspaceid })"
            >
              <v-icon>mdi-database-import-outline</v-icon>
            </v-btn>
          </template>
          <span>Import this JSON into Component Library</span>
        </v-tooltip>
        <v-tooltip bottom>
          <template v-slot:activator="{ on, attrs }">
            <v-btn
              text
              icon
              color="red"
              class="file-stats-action-btn"
              v-bind="attrs"
              v-on="on"
              @click="deletefile(id)"
            >
              <v-icon>mdi-delete</v-icon>
            </v-btn>
          </template>
          <span>Remove this file from the workspace</span>
        </v-tooltip>
      </div>
    </div>

    <div class="file-stats-body">
      <h3 class="file-stats-name-heading font-weight-light text--primary">
        {{ displayNameWithoutExt }}
      </h3>
    </div>

    <div class="file-stats-footer d-flex align-center">
      <v-icon
        class="mr-1"
        small
      >
        mdi-clockwise
      </v-icon>
      <span
        :class="subTextColor"
        class="caption grey--text font-weight-light"
        v-text="subText"
      />
    </div>
  </base-material-card>
</template>

<script>
  import Card from './Card'
  import axios from 'axios'
  import router from '../../router'
  import guestStore, { fileContentForZipExport } from '@/lib/guestStore'

  export default {
    name: 'MaterialStatsCard',

    inheritAttrs: false,

    data: () => ({
      logo3duf: require('@/assets/3duf_icon.png'),
    }),

    props: {
      ...Card.props,
      icon: {
        type: String,
        default: undefined,
      },
      subIcon: {
        type: String,
        default: undefined,
      },
      subIconColor: {
        type: String,
        default: undefined,
      },
      subTextColor: {
        type: String,
        default: undefined,
      },
      subText: {
        type: String,
        default: undefined,
      },
      title: {
        type: String,
        default: undefined,
      },
      value: {
        type: String,
        default: undefined,
      },
      smallValue: {
        type: String,
        default: undefined,
      },
      name: {
        type: String,
        default: undefined,
      },
      id: {
        type: String,
        default: undefined,
      },
      workspaceid: {
        type: String,
        default: undefined,
      },
      ext: {
        type: String,
        default: undefined,
      },
      content: {
        type: [String, Object, Array],
        default: undefined,
      },
      cardColor: {
        type: String,
        default: 'info',
      },
    },

    computed: {
      displayNameWithoutExt () {
        const raw = String(this.name || '').trim()
        const ext = String(this.ext || '').trim()
        if (!raw) return '—'
        if (!ext) return raw
        const normalizedExt = ext.startsWith('.') ? ext : `.${ext}`
        if (raw.toLowerCase().endsWith(normalizedExt.toLowerCase())) {
          const stem = raw.slice(0, raw.length - normalizedExt.length)
          return stem || raw
        }
        return raw
      },
    },

    methods: {
      downloadfile (fid) {
        const wid =
          this.workspaceid ||
          (this.$store.getters.currentWorkspace && this.$store.getters.currentWorkspace._id) ||
          null
        if (!fid) return
        const fileName = this.name || `file${this.ext || ''}`

        if (this.$store.getters.isGuest) {
          if (!wid) return
          const f = guestStore.getFile(wid, fid)
          const text = f ? fileContentForZipExport(f.content) : fileContentForZipExport(this.content)
          const blob = new Blob([text], { type: 'application/octet-stream' })
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

        axios.get('/api/v1/downloadFile', {
          params: { id: fid },
          responseType: 'arraybuffer',
          withCredentials: true,
        })
          .then((response) => {
            const url = window.URL.createObjectURL(new Blob([response.data]))
            const link = document.createElement('a')
            link.href = url
            link.setAttribute('download', fileName)
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            window.URL.revokeObjectURL(url)
          })
          .catch((error) => { console.log(error) })
      },
      deletefile (fid) {
        const wid =
          this.workspaceid ||
          (this.$store.getters.currentWorkspace && this.$store.getters.currentWorkspace._id) ||
          null
        if (!wid || !fid) return

        if (this.$store.getters.isGuest) {
          guestStore.deleteFile(wid, fid)
          this.$emit('onFileDeleted', wid)
          return
        }

        const config = {
          data: {
            fileid: fid,
            workspaceid: wid,
          },
          withCredentials: true,
          crossorigin: true,
          headers: { 'Content-Type': 'application/json' },
        }

        axios.delete('/api/v1/file', config)
          .then(() => {
            this.$emit('onFileDeleted', wid)
          })
          .catch((error) => { console.log(error) })
      },
      editfile (id) {
        const lowerExt = (this.ext || '').toLowerCase()
        if (lowerExt === '.log' || lowerExt === '.json') {
          return
        }
        this.$store.commit('SET_CURRENT_FILE', id)
        router.push('/editor')
      },
    },
  }
</script>

<style lang="sass">
.v-card--material-stats.file-stats-card
  display: flex
  flex-direction: column
  flex-wrap: wrap
  position: relative
  min-height: 168px

  > div:first-child
    justify-content: flex-start
    align-items: flex-start
    width: 100%

  .file-stats-actions-row
    width: 100%
    margin-top: 4px

  .file-stats-actions
    width: 100%
    flex-wrap: wrap
    justify-content: center
    gap: 2px

  .file-stats-action-btn
    margin: 0 !important

  .v-card
    border-radius: 4px
    flex: 0 1 auto

  .v-card--material__heading
    min-width: 72px
    min-height: 72px
    display: flex
    align-items: center
    justify-content: center
    padding: 12px 16px !important

  .file-stats-ext-heading
    font-family: var(--neptune-font-code), monospace
    font-size: 1.1rem
    font-weight: 600
    line-height: 1.2
    letter-spacing: 0.02em

  .file-stats-body
    width: 100%
    margin-top: 12px
    flex: 1 1 auto

  .file-stats-name-heading
    font-size: var(--neptune-fs-body, 14pt) !important
    line-height: 1.35
    word-break: break-word
    overflow-wrap: anywhere
    text-align: left
    margin: 0

  .file-stats-footer
    width: 100%
    margin-top: 10px
    padding-top: 6px

  .go-3duf-btn-logo
    width: 24px
    height: 24px
    object-fit: contain
    display: block
    vertical-align: middle
</style>
