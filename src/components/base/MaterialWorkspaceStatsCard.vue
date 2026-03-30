<template>
  <base-material-card
    :icon="icon"
    class="v-card--material-stats"
    v-bind="$attrs"
    v-on="$listeners"
  >
    <template v-slot:after-heading>
      <div class="ml-auto text-right">
        <div
          class="body-3 grey--text font-weight-light"
          v-text="title"
        />

        <h3 class="display-2 font-weight-light text--primary">
          {{ value }} <small>{{ smallValue }}</small>
        </h3>
      </div>
    </template>
    
    <v-col
      cols="12"
      class="px-0 file-stats-row"
    >
      <div class="file-stats-line d-flex flex-nowrap align-start">
        <div class="file-stats-actions d-flex flex-shrink-0 align-center">
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
                @click="$emit('view3duf', { id, name, workspaceid })"
              >
                <v-icon>mdi-vector-square</v-icon>
              </v-btn>
            </template>
            <span>Open design JSON in 3DuF</span>
          </v-tooltip>
        </div>
        <div class="file-stats-name text--darken-4">
          {{ name }}
        </div>
      </div>
      <v-divider />
    </v-col>

    <v-icon
      class="mr-1"
      small
    >
      <!-- {{ subIcon }} -->
      mdi-clockwise
    </v-icon>

    <span
      :class="subTextColor"
      class="caption grey--text font-weight-light"
      v-text="subText"
    />
  </base-material-card>
</template>

<script>
  import Card from './Card'
  import axios from 'axios'
  import router from '../../router'
  import guestStore from '@/lib/guestStore'

  export default {
    name: 'MaterialStatsCard',

    inheritAttrs: false,

    props: {
      ...Card.props,
      icon: {
        type: String,
        required: true,
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
        default: undefined
      },
      workspaceid: {
        type: String,
        default: undefined
      },
      ext: {
        type: String,
        default: undefined,
      },
    },

    methods: {
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
      editfile(id){
        // For .log and .json files, keep cards read-only (no editor open)
        const lowerExt = (this.ext || '').toLowerCase()
        if (lowerExt === '.log' || lowerExt === '.json') {
          return
        }
        console.log("edit:",id)
        this.$store.commit('SET_CURRENT_FILE', id)
        router.push('/editor')
      }
    }
  }
</script>

<style lang="sass">
.v-card--material-stats
  display: flex
  flex-wrap: wrap
  position: relative

  > div:first-child
    justify-content: space-between

  .v-card
    border-radius: 4px
    flex: 0 1 auto

  .v-card__text
    display: inline-block
    flex: 1 0 calc(100% - 120px)
    position: absolute
    top: 0
    right: 0
    width: 100%

  .v-card__actions
    flex: 1 0 100%

  .file-stats-line
    width: 100%
    gap: 4px

  .file-stats-actions
    flex: 0 0 auto
    white-space: nowrap
    padding-right: 8px

  .file-stats-name
    flex: 1 1 auto
    min-width: 0
    word-break: break-word
    overflow-wrap: anywhere
    line-height: 1.35
    text-align: right

  .file-stats-action-btn
    margin: 0 !important
</style>
