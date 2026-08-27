<template>
  <v-container fluid class="solutions-page">
    <v-row>
      <v-col cols="12" lg="12">
        <div class="solutions-formula-panel mb-4">
          <div class="solutions-formula-line mb-2">
            <strong>Evaluation Formula:</strong>
          </div>
          <div class="solutions-formula-line mb-2">
            <span>
              Evaluation Score = ({{ formatWeightDisplay(evaluationWeights.area) }} x Global Utilization Score) +
              ({{ formatWeightDisplay(evaluationWeights.compact) }} x Local Compactness Score) +
              ({{ formatWeightDisplay(evaluationWeights.connectionLength) }} x Connection Length Score) +
              ({{ formatWeightDisplay(evaluationWeights.bend) }} x Bend Score) +
              ({{ formatWeightDisplay(evaluationWeights.symmetry) }} x Symmetry Score) +
              ({{ formatWeightDisplay(evaluationWeights.fragmentation) }} x Fragmentation Score)
            </span>
          </div>
          <div class="solutions-formula-line solutions-formula-inputs">
            <v-text-field
              v-model="evaluationWeightInputs.area"
              label="w_area"
              dense
              outlined
              hide-details
              class="solutions-weight-input"
            />
            <v-text-field
              v-model="evaluationWeightInputs.compact"
              label="w_cmpt"
              dense
              outlined
              hide-details
              class="solutions-weight-input"
            />
            <v-text-field
              v-model="evaluationWeightInputs.connectionLength"
              label="w_conn"
              dense
              outlined
              hide-details
              class="solutions-weight-input"
            />
            <v-text-field
              v-model="evaluationWeightInputs.bend"
              label="w_bend"
              dense
              outlined
              hide-details
              class="solutions-weight-input"
            />
            <v-text-field
              v-model="evaluationWeightInputs.symmetry"
              label="w_sym"
              dense
              outlined
              hide-details
              class="solutions-weight-input"
            />
            <v-text-field
              v-model="evaluationWeightInputs.fragmentation"
              label="w_frag"
              dense
              outlined
              hide-details
              class="solutions-weight-input"
            />
            <v-btn
              color="success"
              class="solutions-apply-btn"
              @click="applyEvaluationWeights"
            >
              Apply
            </v-btn>
          </div>
          <div class="solutions-formula-line mt-2">
            Current input weight sum: {{ formatWeightDisplay(currentInputWeightSum) }}
            <span v-if="!isCurrentInputWeightSumOne" class="warning--text">
              (recommended: 1.000)
            </span>
          </div>
          <v-alert
            dense
            outlined
            color="primary"
            icon="mdi-information-outline"
            class="mt-3 mb-0 solutions-parameter-alert"
          >
            <div class="solutions-parameter-hint-row">
              <div class="solutions-parameter-hint-text">
                <strong>Evaluation parameter definitions and formulas are documented in GitHub.</strong>
                Component scores come from the compile backend; Total is recomputed when you Apply new weights.
              </div>
              <v-btn
                small
                outlined
                color="primary"
                class="solutions-parameter-spec-btn ml-3"
                :href="evaluationMetricSpecUrl"
                target="_blank"
                rel="noopener"
              >
                <v-icon left small>mdi-github</v-icon>
                View full spec
              </v-btn>
            </div>
          </v-alert>
        </div>

        <base-material-card
          color="success"
          icon="mdi-clipboard-text"
          inline
          title="Results"
          class="solutions-jobs-card px-5 py-3 mb-5"
        >
          <div class="d-flex justify-end mb-3">
            <v-btn
              color="success"
              small
              outlined
              @click="refreshResults"
            >
              <v-icon left small>mdi-refresh</v-icon>
              Refresh
            </v-btn>
          </div>

          <v-data-table
            :key="'results-weights-' + evaluationWeightsRevision"
            :headers="tableHeaders"
            :items="displayRows"
            :items-per-page="10"
            :custom-sort="customTableSort"
            item-key="rowKey"
            :item-class="rowClass"
            class="component-library-table solutions-jobs-table"
            :footer-props="{ 'items-per-page-options': [10, 25, 50] }"
          >
            <template v-slot:item.workspaceName="{ item }">
              <button
                v-if="item.workspaceId"
                type="button"
                class="solutions-path-link"
                @click="navigateToWorkspaceOutput(item)"
              >
                {{ item.workspaceName || '—' }}
              </button>
              <span v-else>{{ item.workspaceName || '—' }}</span>
            </template>

            <template v-slot:item.areaScore="{ item }">
              {{ formatMetricCell(item, 'areaScore') }}
            </template>
            <template v-slot:item.compactScore="{ item }">
              {{ formatMetricCell(item, 'compactScore') }}
            </template>
            <template v-slot:item.connectionLengthScore="{ item }">
              {{ formatMetricCell(item, 'connectionLengthScore') }}
            </template>
            <template v-slot:item.bendScore="{ item }">
              {{ formatMetricCell(item, 'bendScore') }}
            </template>
            <template v-slot:item.symmetryScore="{ item }">
              {{ formatMetricCell(item, 'symmetryScore') }}
            </template>
            <template v-slot:item.fragmentationScore="{ item }">
              {{ formatMetricCell(item, 'fragmentationScore') }}
            </template>
            <template v-slot:item.overallScore="{ item }">
              <v-tooltip bottom>
                <template v-slot:activator="{ on, attrs }">
                  <span class="solutions-metric-value" v-bind="attrs" v-on="on">
                    {{ formatMetricCell(item, 'overallScore') }}
                  </span>
                </template>
                <span>{{ item.metricExplanation || 'Weighted total using applied formula weights.' }}</span>
              </v-tooltip>
            </template>

            <template v-slot:item.jsonActions="{ item }">
              <span v-if="!canShowResultActions(item)">-</span>
              <v-btn
                v-else
                small
                outlined
                color="primary"
                :disabled="!item.hasJson"
                @click="openJsonDialog(item)"
              >
                View
              </v-btn>
            </template>

            <template v-slot:item.logActions="{ item }">
              <span v-if="item.status === 'processing'">-</span>
              <v-btn
                v-else-if="item.hasLog"
                small
                outlined
                color="primary"
                @click="openLogDialog(item)"
              >
                View
              </v-btn>
              <span v-else>-</span>
            </template>

            <template v-slot:item.threedufActions="{ item }">
              <span v-if="!canShowResultActions(item)">-</span>
              <v-btn
                v-else
                small
                outlined
                color="primary"
                :disabled="!item.hasJson"
                @click="openRowIn3DuF(item)"
              >
                Open in 3DuF
              </v-btn>
            </template>

            <template v-slot:item.status="{ item }">
              <span :class="['results-status', `results-status--${item.status}`]">
                {{ formatStatusLabel(item.status) }}
              </span>
            </template>

            <template v-slot:no-data>
              <div class="text-center grey--text text--darken-1 py-4">
                No jobs found for current session.
              </div>
            </template>
          </v-data-table>
        </base-material-card>
      </v-col>
    </v-row>

    <v-dialog v-model="jsonDialogOpen" max-width="900px" scrollable>
      <v-card class="component-library-file-dialog solutions-json-dialog">
        <v-card-title class="headline component-library-dialog-title">
          {{ jsonDialogTitle }}
        </v-card-title>
        <v-card-text>
          <v-textarea
            :value="jsonDialogText"
            readonly
            outlined
            rows="18"
            hide-details="auto"
            class="readonly-file-textarea"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text color="success" @click="downloadJsonDialog">Export</v-btn>
          <v-btn text color="primary" @click="importJsonDialogToLibrary">Import to Component Library</v-btn>
          <v-btn text color="primary" @click="openJsonDialogIn3DuF">Open in 3DuF</v-btn>
          <v-btn
            text
            color="warning"
            :disabled="!jsonDialogRow || !jsonDialogRow.fileId"
            @click="deleteJsonDialogFile"
          >
            Delete
          </v-btn>
          <v-btn text color="error" @click="jsonDialogOpen = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog v-model="logDialogOpen" max-width="900px" scrollable>
      <v-card class="component-library-file-dialog solutions-json-dialog">
        <v-card-title class="headline component-library-dialog-title">
          {{ logDialogTitle }}
        </v-card-title>
        <v-card-text>
          <v-textarea
            :value="logDialogText"
            readonly
            outlined
            rows="18"
            hide-details="auto"
            class="readonly-file-textarea"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text color="success" @click="downloadLogDialog">Export</v-btn>
          <v-btn text color="error" @click="logDialogOpen = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
import axios from 'axios'
import * as Utils from '../../utils'
import flowOnlyPrJson from '../../../Data/example/flow_only_demo/flow_only_demo_fromLFR_PR.json'
import flowControlPrJson from '../../../Data/example/flow_and_control_demo/flow_and_control_demo_fromLFR_PR.json'
import { EVALUATION_METRIC_SPEC_URL } from '@/lib/evaluationMetricSpec'
import guestStore, { EXAMPLE_WORKSPACE_NAME } from '@/lib/guestStore'
import { validateAndNormalizeLfrName } from '@/lib/lfrNaming'
import { openAndLoadDeviceIn3DuF } from '@/lib/open3DuFPostMessage'

const METRIC_KEYS = ['areaScore', 'compactScore', 'connectionLengthScore', 'bendScore', 'symmetryScore', 'fragmentationScore']

export default {
  data () {
    return {
      jobs: [],
      jobobjects: {},
      fileNameById: {},
      fileDataById: {},
      workspaceNameById: {},
      exampleWorkspaceMeta: {
        workspaceId: null,
        workspaceName: EXAMPLE_WORKSPACE_NAME,
        filesByName: {},
      },
      computedMetricsByFileId: {},
      evaluationFetchStateByFileId: {},
      staticExampleRows: [
        {
          inputFile: 'flow_only_demo.lfr',
          outputFile: 'flow_only_demo_fromLFR_PR.json',
          jsonText: typeof flowOnlyPrJson === 'string' ? flowOnlyPrJson : JSON.stringify(flowOnlyPrJson),
          status: 'done',
          areaScore: 0.17541309816827944,
          compactScore: 0.5876708791012953,
          connectionLengthScore: 0.8613152033002893,
          bendScore: 0.6,
          symmetryScore: 0.5,
          fragmentationScore: 1.0,
        },
        {
          inputFile: 'flow_and_control_demo.lfr',
          outputFile: 'flow_and_control_demo_fromLFR_PR.json',
          jsonText: typeof flowControlPrJson === 'string' ? flowControlPrJson : JSON.stringify(flowControlPrJson),
          status: 'done',
          areaScore: 0.24710052460786117,
          compactScore: 0.5282077176766525,
          connectionLengthScore: 0.865696792593593,
          bendScore: 0.6,
          symmetryScore: 0.2222222222222222,
          fragmentationScore: 0.3333333333333333,
        },
      ],
      evaluationWeights: {
        area: 0.2,
        connectionLength: 0.2,
        compact: 0.2,
        bend: 0.2,
        symmetry: 0.1,
        fragmentation: 0.1,
      },
      // Bumped on Apply so Results Total cells always rebuild with new weights.
      evaluationWeightsRevision: 0,
      evaluationWeightInputs: {
        area: '0.2',
        connectionLength: '0.2',
        compact: '0.2',
        bend: '0.2',
        symmetry: '0.1',
        fragmentation: '0.1',
      },
      evaluationMetricSpecUrl: EVALUATION_METRIC_SPEC_URL,
      jsonDialogOpen: false,
      jsonDialogRow: null,
      jsonDialogText: '',
      logDialogOpen: false,
      logDialogRow: null,
      logDialogText: '',
      tableHeaders: [
        { text: 'Input File', value: 'inputFile', sortable: true },
        { text: 'Modified', value: 'lastUpdatedDisplay', sortable: true },
        { text: 'Workspace', value: 'workspaceName', sortable: false },
        { text: 'Global Util.', value: 'areaScore', sortable: false, align: 'end' },
        { text: 'Local Compact.', value: 'compactScore', sortable: false, align: 'end' },
        { text: 'Conn Length', value: 'connectionLengthScore', sortable: false, align: 'end' },
        { text: 'Bend', value: 'bendScore', sortable: false, align: 'end' },
        { text: 'Symmetry', value: 'symmetryScore', sortable: false, align: 'end' },
        { text: 'Fragment.', value: 'fragmentationScore', sortable: false, align: 'end' },
        { text: 'Total', value: 'overallScore', sortable: false, align: 'end' },
        { text: 'JSON', value: 'jsonActions', sortable: false, align: 'center' },
        { text: 'Log', value: 'logActions', sortable: false, align: 'center' },
        { text: 'Visualization', value: 'threedufActions', sortable: false, align: 'center' },
        { text: 'Status', value: 'status', sortable: false, align: 'end' },
      ],
    }
  },
  computed: {
    currentInputWeightSum () {
      const keys = ['area', 'compact', 'connectionLength', 'symmetry', 'bend', 'fragmentation']
      return keys.reduce((acc, key) => {
        const parsed = this.toFiniteNumber(this.evaluationWeightInputs[key])
        return acc + (parsed == null ? 0 : parsed)
      }, 0)
    },
    isCurrentInputWeightSumOne () {
      return Math.abs(this.currentInputWeightSum - 1) < 1e-6
    },
    displayRows () {
      // Read revision so Apply always invalidates this computed (and table :key).
      const weightsRevision = this.evaluationWeightsRevision
      const rows = []
      for (const ex of this.staticExampleRows) {
        rows.push(this.buildExampleRow(ex))
      }
      for (const job of this.jobs) {
        rows.push(this.buildJobRow(job))
      }
      // Recompute Total here from applied weights so Results stays in sync after Apply.
      return rows.map((row) => ({
        ...row,
        overallScore: this.computeWeightedTotal({
          areaScore: row.areaScore,
          compactScore: row.compactScore,
          connectionLengthScore: row.connectionLengthScore,
          bendScore: row.bendScore,
          symmetryScore: row.symmetryScore,
          fragmentationScore: row.fragmentationScore,
        }),
        weightsRevision,
      }))
    },
    jsonDialogTitle () {
      if (!this.jsonDialogRow) return 'Output JSON'
      return this.jsonDialogRow.outputFileName || 'Output JSON'
    },
    logDialogTitle () {
      if (!this.logDialogRow) return 'Compile log'
      return this.logDialogRow.logFileName || 'Compile log'
    },
  },
  mounted () {
    this.refreshResults()
  },
  methods: {
    rowClass (item) {
      const status = item && item.status === 'ongoing' ? 'processing' : (item && item.status) || 'processing'
      return `results-row results-row--${status}`
    },
    customTableSort (items, sortBy, sortDesc) {
      if (!sortBy) return items
      const sorted = [...items]
      const desc = !!sortDesc
      sorted.sort((a, b) => {
        let av
        let bv
        if (sortBy === 'lastUpdatedDisplay') {
          av = a.lastUpdatedSort || 0
          bv = b.lastUpdatedSort || 0
        } else {
          av = String(a[sortBy] || '').toLowerCase()
          bv = String(b[sortBy] || '').toLowerCase()
        }
        if (av < bv) return desc ? 1 : -1
        if (av > bv) return desc ? -1 : 1
        return 0
      })
      return sorted
    },
    toFiniteNumber (value) {
      const n = Number(value)
      return Number.isFinite(n) ? n : null
    },
    toPercentDisplay (value) {
      const n = this.toFiniteNumber(value)
      if (n == null) return '—'
      return n.toFixed(3)
    },
    formatWeightDisplay (value) {
      const n = this.toFiniteNumber(value)
      if (n == null) return '—'
      return n.toFixed(3)
    },
    computeWeightedTotal (metrics, weights = null) {
      if (!metrics) return null
      const parts = METRIC_KEYS.map((k) => this.toFiniteNumber(metrics[k]))
      if (parts.some(v => v == null)) return null
      const w = weights || this.evaluationWeights
      return (
        parts[0] * w.area +
        parts[1] * w.compact +
        parts[2] * w.connectionLength +
        parts[3] * w.bend +
        parts[4] * w.symmetry +
        parts[5] * w.fragmentation
      )
    },
    recomputeCachedOverallScores (weights) {
      const applied = weights || this.evaluationWeights
      Object.keys(this.computedMetricsByFileId || {}).forEach((fid) => {
        const cached = this.computedMetricsByFileId[fid]
        if (!cached || typeof cached !== 'object') return
        const nextTotal = this.computeWeightedTotal(cached, applied)
        this.$set(this.computedMetricsByFileId, fid, {
          ...cached,
          overallScore: nextTotal,
        })
      })
    },
    applyEvaluationWeights () {
      const nextWeights = {
        area: this.toFiniteNumber(this.evaluationWeightInputs.area),
        compact: this.toFiniteNumber(this.evaluationWeightInputs.compact),
        connectionLength: this.toFiniteNumber(this.evaluationWeightInputs.connectionLength),
        bend: this.toFiniteNumber(this.evaluationWeightInputs.bend),
        symmetry: this.toFiniteNumber(this.evaluationWeightInputs.symmetry),
        fragmentation: this.toFiniteNumber(this.evaluationWeightInputs.fragmentation),
      }
      const hasInvalid = Object.values(nextWeights).some(v => v == null)
      if (hasInvalid) return
      const sum = Object.values(nextWeights).reduce((acc, value) => acc + value, 0)
      if (Math.abs(sum - 1) >= 1e-6) {
        const shouldContinue = window.confirm(
          `Current weight sum is ${sum.toFixed(3)} (recommended 1.000). Continue applying anyway?`
        )
        if (!shouldContinue) return
      }
      // Apply weights, then refresh every Results-row Total with the new formula.
      this.evaluationWeights = nextWeights
      this.recomputeCachedOverallScores(nextWeights)
      this.evaluationWeightsRevision += 1
    },
    async refreshResults () {
      this.jobs = []
      this.jobobjects = {}
      this.fileNameById = {}
      this.fileDataById = {}
      this.workspaceNameById = {}
      this.computedMetricsByFileId = {}
      this.evaluationFetchStateByFileId = {}
      await this.loadExampleWorkspaceMeta()
      await this.prefetchWorkspaceNames()
      await this.getAllJobs()
      await this.computeAllEvaluationMetrics()
    },
    async loadExampleWorkspaceMeta () {
      const meta = {
        workspaceId: null,
        workspaceName: EXAMPLE_WORKSPACE_NAME,
        filesByName: {},
      }
      if (this.$store.getters.isGuest) {
        guestStore.ensureExampleWorkspace()
        const ws = guestStore.getWorkspaces().find(w => String(w.name || '').trim() === EXAMPLE_WORKSPACE_NAME)
        if (ws) {
          meta.workspaceId = ws._id
          meta.workspaceName = ws.name || EXAMPLE_WORKSPACE_NAME
          for (const f of guestStore.getFiles(ws._id)) {
            meta.filesByName[f.name] = {
              id: f.id,
              updated_at: f.updated_at || ws.updated_at,
            }
          }
        }
        this.exampleWorkspaceMeta = meta
        return
      }
      try {
        const config = { withCredentials: true, headers: { 'Content-Type': 'application/json' } }
        const listRes = await axios.get('/api/v1/workspaces', config)
        for (const wid of (listRes.data || [])) {
          const wRes = await axios.get('/api/v1/workspace', { params: { workspace_id: wid }, ...config })
          const w = wRes.data
          if (!w || String(w.name || '').trim() !== EXAMPLE_WORKSPACE_NAME) continue
          meta.workspaceId = w._id
          meta.workspaceName = w.name
          const filesRes = await axios.get('/api/v1/files', { params: { id: w._id }, ...config })
          for (const fid of (filesRes.data || [])) {
            const fRes = await axios.get('/api/v1/file', { params: { id: fid }, ...config })
            const f = fRes.data || {}
            const fname = f.name || f.filename
            if (fname) {
              meta.filesByName[fname] = {
                id: fid,
                updated_at: f.updated_at || w.updated_at,
              }
            }
          }
          break
        }
      } catch (_) {}
      this.exampleWorkspaceMeta = meta
    },
    async prefetchWorkspaceNames () {
      const names = {}
      if (this.$store.getters.isGuest) {
        guestStore.getWorkspaces().forEach((w) => {
          names[w._id] = w.name
        })
        this.workspaceNameById = names
        return
      }
      try {
        const config = { withCredentials: true, headers: { 'Content-Type': 'application/json' } }
        const listRes = await axios.get('/api/v1/workspaces', config)
        await Promise.all((listRes.data || []).map(async (wid) => {
          try {
            const wRes = await axios.get('/api/v1/workspace', { params: { workspace_id: wid }, ...config })
            if (wRes.data && wRes.data.name) names[wid] = wRes.data.name
          } catch (_) {}
        }))
      } catch (_) {}
      this.workspaceNameById = names
    },
    async computeAllEvaluationMetrics () {
      const fileIds = Object.keys(this.fileDataById || {})
      if (!fileIds.length) return
      await Promise.all(fileIds.map((fid) => this.ensureEvaluationMetricForFile(fid)))
    },
    async prefetchFileData (fileIds) {
      if (!Array.isArray(fileIds)) return
      const config = { withCredentials: true, headers: { 'Content-Type': 'application/json' } }
      const tasks = fileIds.map((fid) => {
        if (!fid || this.fileNameById[fid]) return null
        return axios.get('/api/v1/file', { params: { id: fid }, ...config })
          .then((response) => {
            const fileData = response.data || {}
            const resolvedName = fileData.name || fileData.filename || String(fid)
            this.$set(this.fileNameById, fid, resolvedName)
            this.$set(this.fileDataById, fid, fileData)
            const wid = fileData.workspaceid || fileData.workspace_id
            if (wid && !this.workspaceNameById[wid] && fileData.workspace_name) {
              this.$set(this.workspaceNameById, wid, fileData.workspace_name)
            }
          })
          .catch(() => {})
      })
      await Promise.all(tasks)
    },
    normalizeEvaluationMetrics (metrics) {
      if (!metrics || typeof metrics !== 'object') return null
      const areaScore = this.toFiniteNumber(metrics.area_score ?? metrics.areaScore)
      const compactScore = this.toFiniteNumber(metrics.compact_score ?? metrics.compactScore)
      const connectionLengthScore = this.toFiniteNumber(metrics.connection_length_score ?? metrics.connectionLengthScore)
      const symmetryScore = this.toFiniteNumber(metrics.symmetry_score ?? metrics.symmetryScore)
      const bendScore = this.toFiniteNumber(metrics.bend_score ?? metrics.bendScore)
      const fragmentationScore = this.toFiniteNumber(metrics.fragmentation_score ?? metrics.fragmentationScore)
      const values = [areaScore, compactScore, connectionLengthScore, symmetryScore, bendScore, fragmentationScore]
      if (values.some(v => v == null)) return null
      const componentScores = {
        areaScore,
        compactScore,
        connectionLengthScore,
        symmetryScore,
        bendScore,
        fragmentationScore,
      }
      return {
        ...componentScores,
        overallScore: this.computeWeightedTotal(componentScores),
        explanation: 'Backend evaluation metrics. Total uses applied formula weights.',
      }
    },
    async ensureEvaluationMetricForFile (fid) {
      if (!fid) return
      if (this.computedMetricsByFileId[fid]) return
      const currentState = this.evaluationFetchStateByFileId[fid]
      if (currentState === 'pending' || currentState === 'done') return

      const fileData = this.fileDataById[fid]
      const design = this.extractDesignJson(fileData)
      if (!design) return

      this.$set(this.evaluationFetchStateByFileId, fid, 'pending')
      try {
        const response = await axios.post('/api/v1/evaluationMetric', { design }, {
          withCredentials: true,
          headers: { 'Content-Type': 'application/json' },
        })
        const normalized = this.normalizeEvaluationMetrics(response && response.data && response.data.metrics)
        if (normalized) {
          this.$set(this.computedMetricsByFileId, fid, normalized)
          this.$set(this.evaluationFetchStateByFileId, fid, 'done')
          return
        }
        this.$set(this.evaluationFetchStateByFileId, fid, 'failed')
      } catch (_) {
        this.$set(this.evaluationFetchStateByFileId, fid, 'failed')
      }
    },
    buildExampleRow (row) {
      const meta = this.exampleWorkspaceMeta || {}
      const fileMeta = meta.filesByName[row.outputFile] || {}
      const workspaceId = meta.workspaceId
      const workspaceName = meta.workspaceName || EXAMPLE_WORKSPACE_NAME
      const updatedRaw = fileMeta.updated_at || null
      const componentScores = {
        areaScore: row.areaScore,
        compactScore: row.compactScore,
        connectionLengthScore: row.connectionLengthScore,
        bendScore: row.bendScore,
        symmetryScore: row.symmetryScore,
        fragmentationScore: row.fragmentationScore,
      }
      return {
        rowKey: `example-${row.outputFile}`,
        rowKind: 'example',
        inputFile: row.inputFile,
        lastUpdatedDisplay: updatedRaw ? Utils.getprettytimestamp(updatedRaw) : '—',
        lastUpdatedSort: updatedRaw ? new Date(updatedRaw).getTime() : 0,
        outputFileName: row.outputFile,
        workspaceId,
        workspaceName,
        fileId: fileMeta.id || null,
        jobRef: null,
        status: 'done',
        hasJson: !!row.jsonText,
        jsonText: row.jsonText,
        hasLog: false,
        logText: '',
        logFileName: '',
        metricExplanation: 'Static example scores from Neptune benchmark outputs.',
        ...componentScores,
        overallScore: this.computeWeightedTotal(componentScores),
      }
    },
    buildJobRow (job) {
      const status = this.getJobActionStatus(job)
      const failedOrProcessing = status === 'fail' || status === 'processing'
      const primaryFileId = this.getPrimaryOutputFileId(job)
      const fileData = primaryFileId ? this.fileDataById[primaryFileId] : null
      const outputFileName = job.outputFileName ||
        (primaryFileId ? (this.fileNameById[primaryFileId] || 'output.json') : '—')
      const workspaceId = job.workspaceId || job.workspace_id ||
        (fileData && (fileData.workspaceid || fileData.workspace_id)) || null
      const workspaceName = job.workspaceName ||
        (workspaceId && this.workspaceNameById[workspaceId]) ||
        (workspaceId ? `Workspace ${workspaceId}` : '—')
      const breakdown = failedOrProcessing
        ? {
          areaScore: null,
          compactScore: null,
          connectionLengthScore: null,
          bendScore: null,
          symmetryScore: null,
          fragmentationScore: null,
          overallScore: null,
          explanation: status === 'fail'
            ? 'Compile failed. See the log column for details.'
            : 'Compile is still running.',
        }
        : this.resolveEvaluationScoreBreakdown(job)
      const updatedRaw = job.created_at || job.updated_at || (fileData && fileData.updated_at) || null
      const logText = this.getJobLogText(job)
      return {
        rowKey: `job-${job.id || primaryFileId || Math.random()}`,
        rowKind: 'job',
        inputFile: this.getInputFileDisplay(job, outputFileName),
        lastUpdatedDisplay: updatedRaw ? Utils.getprettytimestamp(updatedRaw) : '—',
        lastUpdatedSort: updatedRaw ? new Date(updatedRaw).getTime() : 0,
        outputFileName,
        workspaceId,
        workspaceName,
        fileId: primaryFileId,
        jobRef: job,
        status,
        hasJson: !failedOrProcessing && !!(job.jsonText || primaryFileId),
        jsonText: failedOrProcessing ? null : (job.jsonText || null),
        hasLog: status !== 'processing' && (!!logText || status === 'fail'),
        logText,
        logFileName: job.logFileName || this.defaultLogFileName(job),
        metricExplanation: breakdown.explanation,
        areaScore: breakdown.areaScore,
        compactScore: breakdown.compactScore,
        connectionLengthScore: breakdown.connectionLengthScore,
        bendScore: breakdown.bendScore,
        symmetryScore: breakdown.symmetryScore,
        fragmentationScore: breakdown.fragmentationScore,
        overallScore: breakdown.overallScore,
      }
    },
    canShowResultActions (row) {
      if (!row) return false
      return row.status === 'done'
    },
    formatMetricCell (row, key) {
      if (!row || row.status === 'fail' || row.status === 'processing' || row.status === 'ongoing') return '-'
      return this.toPercentDisplay(row[key])
    },
    mapOutputToInputFile (outputFileName) {
      if (!outputFileName) return '—'
      const knownReplacements = [
        { suffix: '_PRfromLFR.json', replacement: '.lfr' },
        { suffix: '_fromLFR_PR.json', replacement: '.lfr' },
        { suffix: '_fromMINT_PR.json', replacement: '.mint' },
        { suffix: '_fromLFR.json', replacement: '.lfr' },
        { suffix: '_fromMINT.json', replacement: '.mint' },
        { suffix: '_PR.json', replacement: '.lfr' },
        { suffix: '.json', replacement: '.lfr' },
      ]
      for (const item of knownReplacements) {
        if (outputFileName.endsWith(item.suffix)) {
          return outputFileName.replace(item.suffix, item.replacement)
        }
      }
      return outputFileName
    },
    getInputFileDisplay (job, outputFileName) {
      if (job && job.sourceFilename) return job.sourceFilename
      if (!outputFileName || outputFileName === '—') return '—'
      return this.mapOutputToInputFile(outputFileName)
    },
    extractDesignJson (fileData) {
      const normalizeParsedDesign = (parsed) => {
        if (!parsed || typeof parsed !== 'object') return null
        if (parsed.components || parsed.connections || parsed.params) return parsed
        const nestedCandidates = [
          parsed.default, parsed.design, parsed.layout, parsed.payload,
          parsed.data, parsed.content, parsed.file_content, parsed.fileContent,
        ]
        for (const nested of nestedCandidates) {
          if (nested && typeof nested === 'object' && (nested.components || nested.connections || nested.params)) {
            return nested
          }
        }
        return null
      }
      const parseJsonLikeString = (raw) => {
        if (typeof raw !== 'string') return null
        let text = raw.trim()
        if (!text) return null
        try {
          const parsed = JSON.parse(text)
          if (typeof parsed === 'string') {
            try { return JSON.parse(parsed) } catch (_) { return null }
          }
          return parsed
        } catch (_) {
          return null
        }
      }
      if (!fileData || typeof fileData !== 'object') return null
      const candidates = [
        fileData.content, fileData.file_content, fileData.fileContent,
        fileData.json, fileData.jsonScript, fileData.design, fileData.layout,
        fileData.payload, fileData.text, fileData.data,
      ]
      for (const candidate of candidates) {
        if (!candidate) continue
        if (typeof candidate === 'object') {
          const normalizedObject = normalizeParsedDesign(candidate)
          if (normalizedObject) return normalizedObject
          continue
        }
        if (typeof candidate === 'string') {
          const parsed = parseJsonLikeString(candidate)
          const normalizedParsed = normalizeParsedDesign(parsed)
          if (normalizedParsed) return normalizedParsed
        }
      }
      return null
    },
    getPrimaryOutputFileId (job) {
      if (!job || !Array.isArray(job.files) || !job.files.length) return null
      const sorted = [...job.files].sort((a, b) => {
        const an = this.fileNameById[a] || ''
        const bn = this.fileNameById[b] || ''
        const aPriority = an.includes('_PR') ? 0 : 1
        const bPriority = bn.includes('_PR') ? 0 : 1
        return aPriority - bPriority
      })
      return sorted[0]
    },
    resolveMetricFromCandidates (sources, candidates) {
      for (const source of sources) {
        if (!source || typeof source !== 'object') continue
        for (const candidate of candidates) {
          const parsed = this.toFiniteNumber(source[candidate])
          if (parsed != null) return parsed
        }
      }
      return null
    },
    resolveEvaluationScoreBreakdown (job) {
      const empty = {
        areaScore: null,
        compactScore: null,
        connectionLengthScore: null,
        symmetryScore: null,
        bendScore: null,
        fragmentationScore: null,
        overallScore: null,
        explanation: 'No job data is available to compute this score.',
      }
      if (!job || typeof job !== 'object') return empty

      const evaluationObj = (job.evaluation && typeof job.evaluation === 'object' && job.evaluation) || null
      const metricsObj = (job.metrics && typeof job.metrics === 'object' && job.metrics) || null
      const backendSources = [evaluationObj, metricsObj, job]

      let areaScore = this.resolveMetricFromCandidates(backendSources, ['area_score', 'areaScore'])
      const connectionLengthScore = this.resolveMetricFromCandidates(backendSources, ['connection_length_score', 'connectionLengthScore'])
      let compactScore = this.resolveMetricFromCandidates(backendSources, ['compact_score', 'compactScore'])
      const symmetryScore = this.resolveMetricFromCandidates(backendSources, ['symmetry_score', 'symmetryScore'])
      const bendScore = this.resolveMetricFromCandidates(backendSources, ['bend_score', 'bendScore'])
      const fragmentationScore = this.resolveMetricFromCandidates(backendSources, ['fragmentation_score', 'fragmentationScore'])
      const backendComponents = [areaScore, connectionLengthScore, compactScore, symmetryScore, bendScore, fragmentationScore]
      const hasBackendComponents = backendComponents.every(v => v != null)

      if (hasBackendComponents) {
        const componentScores = {
          areaScore,
          compactScore,
          connectionLengthScore,
          symmetryScore,
          bendScore,
          fragmentationScore,
        }
        return {
          ...componentScores,
          overallScore: this.computeWeightedTotal(componentScores),
          explanation: 'Evaluation component scores from compile backend; Total uses applied weights.',
        }
      }

      const primaryFileId = this.getPrimaryOutputFileId(job)
      const computedFromJson = primaryFileId ? this.computedMetricsByFileId[primaryFileId] : null
      if (computedFromJson) {
        return {
          ...computedFromJson,
          overallScore: this.computeWeightedTotal(computedFromJson),
          explanation: 'Evaluation computed from output JSON via Neptune backend.',
        }
      }

      if (primaryFileId) {
        const state = this.evaluationFetchStateByFileId[primaryFileId]
        if (!state || state === 'pending') {
          this.ensureEvaluationMetricForFile(primaryFileId)
          return {
            ...empty,
            explanation: 'Evaluation metric is being calculated by Neptune backend...',
          }
        }
        if (state === 'failed') {
          return {
            ...empty,
            explanation: 'Backend evaluation metric failed for this output JSON.',
          }
        }
      }

      if (compactScore == null) compactScore = 0
      const partial = [areaScore, connectionLengthScore, compactScore, symmetryScore, bendScore, fragmentationScore]
      if (partial.every(v => v != null)) {
        const componentScores = {
          areaScore,
          compactScore,
          connectionLengthScore,
          symmetryScore,
          bendScore,
          fragmentationScore,
        }
        return {
          ...componentScores,
          overallScore: this.computeWeightedTotal(componentScores),
          explanation: 'Partial metrics from job record; Total uses applied weights.',
        }
      }

      return empty
    },
    getJobActionStatus (job) {
      const candidates = [
        job && job.status,
        job && job.state,
        job && job.job_status,
        job && job.result_status,
      ].filter(Boolean)
      const normalized = String(candidates[0] || '').toLowerCase()
      if (/fail|error/.test(normalized)) return 'fail'
      if (/ongoing|running|pending|progress|processing/.test(normalized)) return 'processing'
      if (/done|success|completed|complete/.test(normalized)) return 'done'
      if (job && (job.jsonText || job.evaluation)) return 'done'
      const fid = this.getPrimaryOutputFileId(job)
      if (fid && this.computedMetricsByFileId[fid]) return 'done'
      return 'processing'
    },
    formatStatusLabel (status) {
      const value = String(status || '').trim().toLowerCase()
      if (value === 'processing' || value === 'ongoing') return 'Processing'
      if (value === 'fail' || value === 'error') return 'Fail'
      if (value === 'done' || value === 'success') return 'Done'
      if (!value) return 'Unknown'
      return value.charAt(0).toUpperCase() + value.slice(1)
    },
    getJobLogText (job) {
      if (!job) return ''
      if (job.log && String(job.log).trim()) return String(job.log)
      const parts = []
      if (job.stdout) parts.push(String(job.stdout))
      if (job.stderr) parts.push(String(job.stderr))
      if (job.error) parts.push(String(job.error))
      return parts.join('\n\n').trim()
    },
    defaultLogFileName (job) {
      const src = (job && job.sourceFilename) || 'design'
      const stem = String(src).replace(/\.[^.]+$/, '') || 'design'
      const compileType = String((job && job.compileType) || '').toLowerCase()
      if (compileType === 'mint' || /\.mint$/i.test(src)) return `${stem}_fromMINT.log`
      return `${stem}_fromLFR.log`
    },
    formattimestamp (datestring) {
      return Utils.getprettytimestamp(datestring)
    },
    navigateToWorkspaceOutput (row) {
      if (!row || !row.workspaceId) return
      this.$router.push({
        path: '/dashboard',
        query: { workspace: row.workspaceId, expand: '1' },
      })
    },
    async openJsonDialog (row) {
      if (!row || !this.canShowResultActions(row)) return
      this.jsonDialogRow = row
      let text = row.jsonText || (row.jobRef && row.jobRef.jsonText) || ''
      if (!text && row.fileId) {
        text = await this.loadJsonTextForFile(row.fileId, row.workspaceId)
      }
      if (text && typeof text === 'object') {
        try { text = JSON.stringify(text, null, 2) } catch (_) { text = String(text) }
      }
      if (typeof text === 'string' && text.trim()) {
        try {
          this.jsonDialogText = JSON.stringify(JSON.parse(text), null, 2)
        } catch (_) {
          this.jsonDialogText = text
        }
      } else {
        this.jsonDialogText = ''
      }
      this.jsonDialogOpen = true
    },
    openLogDialog (row) {
      if (!row) return
      this.logDialogRow = row
      this.logDialogText = row.logText || this.getJobLogText(row.jobRef) || ''
      this.logDialogOpen = true
    },
    downloadLogDialog () {
      const row = this.logDialogRow
      if (!row) return
      const name = row.logFileName || 'compile.log'
      const blob = new Blob([this.logDialogText || ''], { type: 'text/plain;charset=utf-8' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', name)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    },
    async openRowIn3DuF (row) {
      if (!row || !this.canShowResultActions(row)) return
      let text = row.jsonText || (row.jobRef && row.jobRef.jsonText) || ''
      if (!text && row.fileId) {
        text = await this.loadJsonTextForFile(row.fileId, row.workspaceId)
      }
      let parsed = null
      if (text && typeof text === 'object') parsed = text
      else {
        try { parsed = JSON.parse(text || '') } catch (_) { parsed = null }
      }
      if (!parsed) {
        alert('Cannot open invalid JSON in 3DuF.')
        return
      }
      const result = openAndLoadDeviceIn3DuF(parsed)
      if (!result.ok) {
        if (result.reason === 'popup_blocked') {
          alert('Popup blocked. Please allow popups to open 3DuF.')
        } else {
          alert('Cannot open invalid JSON in 3DuF.')
        }
      }
    },
    async loadJsonTextForFile (fileId, workspaceId) {
      if (this.$store.getters.isGuest && workspaceId) {
        const f = guestStore.getFile(workspaceId, fileId)
        return (f && f.content != null) ? f.content : ''
      }
      try {
        const fsRes = await axios.get('/api/v1/fs', {
          params: { id: fileId },
          withCredentials: true,
          responseType: 'text',
        })
        if (fsRes.data && String(fsRes.data).trim()) return fsRes.data
      } catch (_) {}
      try {
        const res = await axios.get('/api/v1/file', {
          params: { id: fileId },
          withCredentials: true,
        })
        const data = res.data || {}
        return data.content != null ? data.content : ''
      } catch (_) {
        return ''
      }
    },
    downloadJsonDialog () {
      const row = this.jsonDialogRow
      if (!row) return
      const name = row.outputFileName || 'design.json'
      const blob = new Blob([this.jsonDialogText || ''], { type: 'application/json' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', name)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    },
    async importJsonDialogToLibrary () {
      const row = this.jsonDialogRow
      if (!row) return
      const fallbackName = String(row.outputFileName || 'component').replace(/\.json$/i, '')
      const customName = window.prompt(
        'Component name for the library (lowercase snake_case, e.g. droplet_generator):',
        fallbackName
      )
      if (!customName || !String(customName).trim()) return
      const check = validateAndNormalizeLfrName(customName)
      if (!check.valid) {
        alert(`Invalid component name: ${check.reason}`)
        return
      }
      let name = check.normalized
      if (check.needsNormalization) {
        const accepted = window.confirm(
          `Normalize name to "${check.normalized}"?`
        )
        if (!accepted) return
        name = check.normalized
      }
      const jsonText = this.jsonDialogText
      try {
        JSON.parse(jsonText)
      } catch (_) {
        alert('JSON in dialog is not valid.')
        return
      }
      try {
        if (this.$store.getters.isGuest || !row.fileId) {
          await axios.post('/api/v1/componentFiles/upload', { name, jsonText }, {
            withCredentials: true,
            headers: { 'Content-Type': 'application/json' },
          })
        } else {
          await axios.post('/api/v1/componentFiles/importWorkspaceJson', {
            fileid: row.fileId,
            name,
          }, {
            withCredentials: true,
            headers: { 'Content-Type': 'application/json' },
          })
        }
        alert(`Imported into Component Library as "${name}".`)
      } catch (err) {
        const msg = (err.response && err.response.data && (err.response.data.error || err.response.data.message)) || err.message
        alert('Import failed: ' + (msg || 'please try again.'))
      }
    },
    async openJsonDialogIn3DuF () {
      try {
        const parsed = JSON.parse(this.jsonDialogText || '')
        const result = openAndLoadDeviceIn3DuF(parsed)
        if (!result.ok) {
          if (result.reason === 'popup_blocked') {
            alert('Popup blocked. Please allow popups to open 3DuF.')
          } else {
            alert('Cannot open invalid JSON in 3DuF.')
          }
        }
      } catch (_) {
        alert('JSON in dialog is not valid.')
      }
    },
    async deleteJsonDialogFile () {
      const row = this.jsonDialogRow
      if (!row || !row.fileId || !row.workspaceId) return
      if (!window.confirm(`Delete "${row.outputFileName}" from workspace?`)) return
      if (this.$store.getters.isGuest) {
        guestStore.deleteFile(row.workspaceId, row.fileId)
        this.jsonDialogOpen = false
        await this.refreshResults()
        return
      }
      try {
        await axios.delete('/api/v1/file', {
          data: { fileid: row.fileId, workspaceid: row.workspaceId },
          withCredentials: true,
          headers: { 'Content-Type': 'application/json' },
        })
        this.jsonDialogOpen = false
        await this.refreshResults()
      } catch (err) {
        const msg = (err.response && err.response.data && err.response.data.error) || err.message
        alert('Delete failed: ' + (msg || 'please try again.'))
      }
    },
    async getAllJobs () {
      const config = {
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' },
      }
      try {
        const jobsResponse = await axios.get('/api/v1/jobs', config)
        const jobIds = Array.isArray(jobsResponse.data) ? jobsResponse.data : []
        const jobRequests = jobIds.map((jobid) =>
          axios.get('/api/v1/job', { params: { id: jobid }, ...config })
            .then((response) => {
              const data = response.data || {}
              return { ...data, id: data.id || jobid }
            })
            .catch(() => null)
        )
        const allJobs = (await Promise.all(jobRequests)).filter(Boolean)
        this.persistGuestJobOutputs(allJobs)
        this.jobs = allJobs
        this.jobobjects = {}
        allJobs.forEach((job) => {
          this.jobobjects[job.id] = job
        })
        const fileIdLists = allJobs.map(j => j.files).filter(Boolean)
        await Promise.all(fileIdLists.map((files) => this.prefetchFileData(files)))
        await Promise.all(allJobs.map((job) => {
          if (job && job.evaluation) return null
          if (this.getJobActionStatus(job) !== 'done') return null
          const fid = this.getPrimaryOutputFileId(job)
          return fid ? this.ensureEvaluationMetricForFile(fid) : null
        }))
      } catch (error) {
        console.log(error)
      }
    },
    persistGuestJobOutputs (jobs) {
      if (!this.$store.getters.isGuest || !Array.isArray(jobs)) return
      jobs.forEach((job) => {
        const workspaceId = job.workspaceId || job.workspace_id
        if (!workspaceId || !guestStore.getWorkspace(workspaceId)) return
        const status = this.getJobActionStatus(job)
        if (status === 'done' && job.jsonText && job.outputFileName) {
          guestStore.upsertFileByName(workspaceId, job.outputFileName, job.jsonText)
        }
        const logText = this.getJobLogText(job)
        if (logText && (status === 'done' || status === 'fail')) {
          guestStore.upsertFileByName(
            workspaceId,
            job.logFileName || this.defaultLogFileName(job),
            logText,
          )
        }
      })
    },
  },
}
</script>

<style lang="sass" scoped>
.solutions-page
  ::v-deep .v-card--material .card-title
    font-size: var(--neptune-fs-below-page-title) !important
    font-weight: 600 !important
    letter-spacing: -0.015em

  ::v-deep .solutions-jobs-table.component-library-table .v-data-table__wrapper table thead th
    font-size: var(--neptune-fs-label, 13.25pt) !important
    font-weight: 600 !important
    color: rgba(0, 0, 0, 0.75) !important
    border-bottom: thin solid rgba(0, 51, 73, 0.12) !important

  .theme--dark ::v-deep .solutions-jobs-table.component-library-table .v-data-table__wrapper table thead th
    color: rgba(255, 255, 255, 0.85) !important

  ::v-deep .solutions-jobs-table.component-library-table .v-data-table__wrapper table tbody td,
  ::v-deep .solutions-jobs-table.component-library-table .v-data-footer,
  ::v-deep .solutions-jobs-table.component-library-table .v-data-footer *
    font-size: var(--neptune-fs-body, 14pt) !important
    font-style: normal
    font-weight: 400

  ::v-deep .solutions-jobs-table.component-library-table tbody .v-btn,
  ::v-deep .solutions-jobs-table.component-library-table tbody .v-btn .v-btn__content
    font-size: var(--neptune-fs-body, 14pt) !important
    text-transform: none !important
    letter-spacing: normal !important

  ::v-deep .solutions-jobs-table.component-library-table .v-data-table__wrapper table tbody tr:hover
    background: rgba(0, 105, 148, 0.04) !important

  ::v-deep .solutions-jobs-table table
    border-collapse: collapse !important
    border: 1px solid rgba(0, 51, 73, 0.24) !important

  ::v-deep .solutions-jobs-table thead th,
  ::v-deep .solutions-jobs-table tbody td
    border: 1px solid rgba(0, 51, 73, 0.18) !important

  ::v-deep .solutions-jobs-table .results-row--done td
    background: rgba(76, 175, 80, 0.12)

  ::v-deep .solutions-jobs-table .results-row--fail td
    background: rgba(244, 67, 54, 0.12)

  ::v-deep .solutions-jobs-table .results-row--processing td,
  ::v-deep .solutions-jobs-table .results-row--ongoing td
    background: rgba(255, 152, 0, 0.18)

  .solutions-path-link
    background: none
    border: none
    padding: 0
    color: #006994
    text-decoration: underline
    cursor: pointer
    font: inherit
    text-align: left
    &:hover
      color: #004d6d

  .solutions-formula-panel
    background: rgba(76, 175, 80, 0.08)
    border-radius: 8px
    padding: 12px

  .solutions-formula-line
    font-size: var(--neptune-fs-body, 14pt) !important
    line-height: 1.55

  .solutions-formula-panel ::v-deep .v-text-field input,
  .solutions-formula-panel ::v-deep .v-label,
  .solutions-formula-panel ::v-deep .v-btn,
  .solutions-formula-panel ::v-deep .v-btn .v-btn__content
    font-size: var(--neptune-fs-body, 14pt) !important
    text-transform: none !important
    letter-spacing: normal !important

  .solutions-parameter-alert ::v-deep .v-alert__content
    font-size: var(--neptune-fs-body, 14pt) !important

  .solutions-parameter-hint-row
    display: flex
    align-items: center
    gap: 12px
    flex-wrap: wrap

  .solutions-formula-inputs
    display: flex
    flex-wrap: wrap
    gap: 8px

  .solutions-weight-input
    max-width: 120px

  .results-status
    display: inline-block
    min-width: 84px
    text-align: center
    border-radius: 999px
    padding: 2px 10px
    font-weight: 600

  .results-status--done
    background: rgba(76, 175, 80, 0.22)
    color: #1b5e20

  .results-status--fail
    background: rgba(244, 67, 54, 0.18)
    color: #b71c1c

  .results-status--processing,
  .results-status--ongoing
    background: rgba(255, 152, 0, 0.22)
    color: #e65100

  .solutions-json-dialog.component-library-file-dialog .v-card__text,
  .solutions-json-dialog.component-library-file-dialog .v-card__actions
    font-size: var(--neptune-fs-body, 14pt) !important

  .solutions-json-dialog.component-library-file-dialog .v-card__actions .v-btn
    text-transform: none !important
    letter-spacing: normal !important

  .solutions-json-dialog.component-library-file-dialog .v-card__actions .v-btn .v-btn__content
    text-transform: none !important
    letter-spacing: normal !important

  .solutions-json-dialog .component-library-dialog-title
    font-size: var(--neptune-fs-section, 1.1875rem) !important
    font-weight: 600 !important
    letter-spacing: -0.015em
    line-height: 1.35

  .solutions-json-dialog .readonly-file-textarea ::v-deep textarea
    font-family: var(--neptune-font-code), monospace
    font-size: var(--neptune-fs-body, 14pt) !important

  @media (max-width: 1280px)
    ::v-deep .solutions-jobs-table .v-data-table__wrapper
      overflow-x: auto
</style>
