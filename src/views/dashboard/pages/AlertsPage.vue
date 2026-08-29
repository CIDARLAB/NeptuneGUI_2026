<template>
  <v-container fluid tag="section" class="alerts-page">
    <v-row>
      <v-col cols="12">
        <base-material-card
          color="primary"
          icon="mdi-bell-outline"
          inline
          title="Alerts"
          class="px-5 py-3"
        >
          <div class="d-flex align-center justify-space-between mb-3 alerts-toolbar">
            <div class="alerts-toolbar-copy">
              Compile results appear here as jobs finish. The red badge on the bell
              counts unread completions so you can see whether every running job is done.
            </div>
            <v-btn
              small
              outlined
              color="primary"
              :disabled="!alerts.length"
              @click="clearAll"
            >
              Clear all
            </v-btn>
          </div>

          <v-list v-if="alerts.length" class="alerts-list pa-0">
            <v-list-item
              v-for="item in alerts"
              :key="item.id"
              class="alerts-list-item"
              :class="{ 'alerts-list-item--unread': !item.read }"
              @click="openJobInResults(item)"
            >
              <v-list-item-avatar>
                <v-icon :color="item.status === 'fail' ? 'error' : 'success'">
                  {{ item.status === 'fail' ? 'mdi-alert-circle' : 'mdi-check-circle' }}
                </v-icon>
              </v-list-item-avatar>
              <v-list-item-content>
                <v-list-item-title class="alerts-item-title">
                  {{ item.title }}
                  <span class="alerts-item-status" :class="'alerts-item-status--' + item.status">
                    {{ item.status === 'fail' ? 'Fail' : 'Done' }}
                  </span>
                </v-list-item-title>
                <v-list-item-subtitle class="alerts-item-text">
                  {{ item.text }}
                </v-list-item-subtitle>
                <div class="alerts-item-meta">
                  {{ formatTime(item.createdAt) }}
                  <span v-if="item.workspaceName"> · {{ item.workspaceName }}</span>
                </div>
              </v-list-item-content>
              <v-list-item-action>
                <v-btn
                  small
                  outlined
                  color="primary"
                  @click.stop="openJobInResults(item)"
                >
                  View in Jobs
                </v-btn>
              </v-list-item-action>
            </v-list-item>
          </v-list>

          <div v-else class="text-center grey--text text--darken-1 py-8">
            No compile alerts yet. Finished jobs will show up here.
          </div>
        </base-material-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import { mapGetters } from 'vuex'
import * as Utils from '../../../utils'

export default {
  name: 'AlertsPage',

  computed: {
    ...mapGetters(['jobAlertsNewestFirst']),
    alerts () {
      return this.jobAlertsNewestFirst || []
    },
  },

  mounted () {
    this.$store.commit('markJobAlertsRead')
  },

  methods: {
    formatTime (ts) {
      if (!ts) return ''
      try {
        return Utils.getprettytimestamp(new Date(ts).toISOString())
      } catch (_) {
        return ''
      }
    },
    clearAll () {
      this.$store.commit('clearJobAlerts')
    },
    openJobInResults (item) {
      if (!item || !item.jobId) {
        this.$router.push({ name: 'Jobs' }).catch(() => {})
        return
      }
      this.$store.commit('setHighlightJobId', item.jobId)
      this.$router.push({
        name: 'Jobs',
        query: { job: String(item.jobId) },
      }).catch(() => {})
    },
  },
}
</script>

<style scoped>
.alerts-page {
  padding-top: 1rem;
}

.alerts-toolbar-copy {
  font-size: var(--neptune-fs-body, 14pt);
  line-height: 1.4;
  max-width: 52rem;
  opacity: 0.88;
}

.alerts-list-item {
  border-bottom: 1px solid rgba(0, 51, 73, 0.12);
  cursor: pointer;
}

.alerts-list-item--unread {
  background: rgba(0, 105, 148, 0.06);
}

.alerts-item-title {
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.alerts-item-status {
  font-size: 0.75em;
  font-weight: 700;
  border-radius: 999px;
  padding: 1px 8px;
}

.alerts-item-status--done {
  background: rgba(76, 175, 80, 0.22);
  color: #1b5e20;
}

.alerts-item-status--fail {
  background: rgba(244, 67, 54, 0.18);
  color: #b71c1c;
}

.alerts-item-text {
  white-space: normal;
  font-size: var(--neptune-fs-body, 14pt) !important;
  opacity: 0.9;
}

.alerts-item-meta {
  margin-top: 4px;
  font-size: var(--neptune-fs-label, 13.25pt);
  opacity: 0.7;
}
</style>
