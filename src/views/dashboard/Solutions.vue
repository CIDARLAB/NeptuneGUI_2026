<template>
  <v-container fluid class="solutions-page">
    <v-row>
      <v-col
        cols="12"
        lg="12"
      >
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
              Use the spec to review exact computation steps for Global Utilization,
              Local Compactness, Connection Length, Bend, Symmetry, Fragmentation, and weighted total.
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
          <v-icon left small>
            mdi-refresh
          </v-icon>
          Refresh
        </v-btn>
      </div>
      <v-simple-table
        class="solutions-jobs-table"
        height="300px"
      >
        <thead>
          <tr>
            <th rowspan="2">Input File</th>
            <th rowspan="2">Last Updated</th>
            <th rowspan="2">Output File</th>
            <th colspan="7" class="text-center">Evaluation Score</th>
            <th rowspan="2" class="text-right">
              Action
            </th>
          </tr>
          <tr>
            <th>Global Util.</th>
            <th>Local Compact.</th>
            <th>Conn Length</th>
            <th>Bend</th>
            <th>Symmetry</th>
            <th>Fragment.</th>
            <th>Total</th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="exampleResult in exampleResults"
            :key="exampleResult.outputFile"
            class="results-example-row"
          >
            <td>{{ exampleResult.inputFile }}</td>
            <td>{{ exampleResult.lastUpdated || '—' }}</td>
            <td>{{ exampleResult.outputFile }}</td>
            <td>{{ toPercentDisplay(exampleResult.areaScore) }}</td>
            <td>{{ toPercentDisplay(exampleResult.compactScore) }}</td>
            <td>{{ toPercentDisplay(exampleResult.connectionLengthScore) }}</td>
            <td>{{ toPercentDisplay(exampleResult.bendScore) }}</td>
            <td>{{ toPercentDisplay(exampleResult.symmetryScore) }}</td>
            <td>{{ toPercentDisplay(exampleResult.fragmentationScore) }}</td>
            <td>{{ toPercentDisplay(exampleResult.overallScore) }}</td>
            <td class="text-right">Done</td>
          </tr>


          <tr
            v-for="(job, ijk) in jobs" 
            :key="ijk"
          >
            <td>{{ getInputFileDisplay(job) }}</td>
            <td>{{ formattimestamp(job.created_at) }}</td>
            <td>{{ getOutputFileDisplay(job) }}</td>
            <td>{{ getEvaluationScoreBreakdownValue(job, 'areaScore') }}</td>
            <td>{{ getEvaluationScoreBreakdownValue(job, 'compactScore') }}</td>
            <td>{{ getEvaluationScoreBreakdownValue(job, 'connectionLengthScore') }}</td>
            <td>{{ getEvaluationScoreBreakdownValue(job, 'bendScore') }}</td>
            <td>{{ getEvaluationScoreBreakdownValue(job, 'symmetryScore') }}</td>
            <td>{{ getEvaluationScoreBreakdownValue(job, 'fragmentationScore') }}</td>
            <td>
              <v-tooltip bottom>
                <template v-slot:activator="{ on, attrs }">
                  <span
                    class="solutions-metric-value"
                    v-bind="attrs"
                    v-on="on"
                  >
                    {{ getEvaluationScoreBreakdownValue(job, 'overallScore') }}
                  </span>
                </template>
                <span>{{ getEvaluationScoreTooltip(job) }}</span>
              </v-tooltip>
            </td>
            <td class="text-right">
              <span :class="['results-status', `results-status--${getJobActionStatus(job)}`]">
                {{ getJobActionStatus(job) }}
              </span>
            </td>
          </tr>
          <tr v-if="jobs.length === 0 && exampleResults.length === 0">
            <td colspan="11" class="text-center grey--text text--darken-1 py-4">
              No jobs found for current session.
            </td>
          </tr>

        </tbody>
      </v-simple-table>
    </base-material-card>

      </v-col>
      
      <v-col
        col="12"
        sm="6"
        v-for="(file, i) in files" 
        :key="i"
        >
        <base-material-card
          color="success"
          icon="mdi-file"
          :title="file.name"
          class="px-4 py-3"
        >
          <v-divider class="ma-3" />

          <div class="px-3">
            <div class="body-2 text-uppercase grey--text font-weight-bold mb-3">
              Actions
            </div>

            <v-row
              align="center"
              class="ma-0"
            >
              <v-btn
                color="green"
                class="ml-1"
                fab
                icon
                x-small
                @click="downloadfile(file)"
              >
                <v-icon
                  small
                >
                mdi-download
              </v-icon>
              </v-btn>
              <v-btn
                color="blue"
                class="ml-1"
                fab
                icon
                x-small
                @click="openpreview(file.id)"
              >
                <v-icon
                  small
                >
                mdi-open-in-new
                </v-icon>
              </v-btn>
            </v-row>
          </div>
        </base-material-card>

      </v-col>

    </v-row>
  </v-container>
</template>

<script>
  import axios from 'axios'
  import * as Utils from '../../utils'
  import dx2JsonText from '!!raw-loader!../../../Data/example/dx/dx2_PRfromLFR.json'
  import dx3JsonText from '!!raw-loader!../../../Data/example/dx/dx3_PRfromLFR.json'
  import { EVALUATION_METRIC_SPEC_URL } from '@/lib/evaluationMetricSpec'
  
  export default {
    data () {
      return {
        selectedjobid: '',
        jobs : [],
        files:[],
        jobobjects: {},
        fileNameById: {},
        fileDataById: {},
        computedMetricsByFileId: {},
        evaluationFetchStateByFileId: {},
        staticExampleRows: [
          {
            inputFile: 'dx2.lfr',
            outputFile: 'dx2_PRfromLFR.json',
            jsonText: dx2JsonText,
          },
          {
            inputFile: 'dx3.lfr',
            outputFile: 'dx3_PRfromLFR.json',
            jsonText: dx3JsonText,
          },
        ],
        exampleResults: [],
        evaluationWeights: {
          area: 0.2,
          connectionLength: 0.2,
          compact: 0.2,
          bend: 0.2,
          symmetry: 0.1,
          fragmentation: 0.1,
        },
        evaluationWeightInputs: {
          area: '0.2',
          connectionLength: '0.2',
          compact: '0.2',
          bend: '0.2',
          symmetry: '0.1',
          fragmentation: '0.1',
        },
        evaluationMetricSpecUrl: EVALUATION_METRIC_SPEC_URL,
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
    },
    mounted: function(){
      this.refreshResults()
    },
    methods: {
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
        this.evaluationWeights = nextWeights
        // Keep metric components; only recompute weighted totals in UI.
        this.refreshExampleResults()
      },
      async refreshResults () {
        this.jobs = []
        this.jobobjects = {}
        this.fileNameById = {}
        this.fileDataById = {}
        this.computedMetricsByFileId = {}
        this.evaluationFetchStateByFileId = {}
        await this.getAllJobs()
        await this.computeAllEvaluationMetrics()
        await this.refreshExampleResults()
      },
      async computeAllEvaluationMetrics () {
        const fileIds = Object.keys(this.fileDataById || {})
        if (!fileIds.length) return
        await Promise.all(fileIds.map((fid) => this.ensureEvaluationMetricForFile(fid)))
      },
      async prefetchFileData (fileIds) {
        if (!Array.isArray(fileIds)) return
        const tasks = fileIds.map((fid) => {
          if (!fid) return
          if (this.fileNameById[fid]) return
          return axios.get('/api/v1/file', {
            params: { id: fid }
          })
            .then((response) => {
              const fileData = response.data || {}
              const resolvedName = fileData.name || fileData.filename || String(fid)
              this.$set(this.fileNameById, fid, resolvedName)
              this.$set(this.fileDataById, fid, fileData)
              this.ensureEvaluationMetricForFile(fid)
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
        const overallScore =
          areaScore * this.evaluationWeights.area +
          compactScore * this.evaluationWeights.compact +
          connectionLengthScore * this.evaluationWeights.connectionLength +
          bendScore * this.evaluationWeights.bend +
          symmetryScore * this.evaluationWeights.symmetry +
          fragmentationScore * this.evaluationWeights.fragmentation
        return {
          areaScore,
          compactScore,
          connectionLengthScore,
          symmetryScore,
          bendScore,
          fragmentationScore,
          overallScore,
          explanation: 'Backend metrics computed with Neptune_2026 definition. Total is recomputed using applied weights.',
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
            this.refreshExampleResults()
            return
          }
          this.$set(this.evaluationFetchStateByFileId, fid, 'failed')
        } catch (_) {
          this.$set(this.evaluationFetchStateByFileId, fid, 'failed')
        }
      },
      mapOutputToInputFile (outputFileName) {
        if (!outputFileName) return '—'
        const knownReplacements = [
          { suffix: '_PRfromLFR.json', replacement: '.lfr' },
          { suffix: '_PR.json', replacement: '.lfr' },
          { suffix: '_fromLFR.json', replacement: '.lfr' },
          { suffix: '.json', replacement: '.lfr' },
        ]
        for (const item of knownReplacements) {
          if (outputFileName.endsWith(item.suffix)) {
            return outputFileName.replace(item.suffix, item.replacement)
          }
        }
        return outputFileName
      },
      getInputFileDisplay (job) {
        const output = this.getOutputFileDisplay(job)
        if (!output || output === '—' || output.includes('(+')) return '—'
        return this.mapOutputToInputFile(output)
      },
      getOutputFileDisplay (job) {
        if (!job || !Array.isArray(job.files) || job.files.length === 0) return '—'
        const labels = job.files.map((fid) => this.fileNameById[fid] || fid).filter(Boolean)
        if (!labels.length) return '—'
        if (labels.length === 1) return labels[0]
        return `${labels[0]} (+${labels.length - 1})`
      },
      extractDesignJson (fileData) {
        const normalizeParsedDesign = (parsed) => {
          if (!parsed || typeof parsed !== 'object') return null
          if (parsed.components || parsed.connections || parsed.params) return parsed
          const nestedCandidates = [
            parsed.default,
            parsed.design,
            parsed.layout,
            parsed.payload,
            parsed.data,
            parsed.content,
            parsed.file_content,
            parsed.fileContent,
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
          let text = raw
          if (text.charCodeAt(0) === 65279) text = text.slice(1)
          text = text.trim()
          if (!text) return null
          const tryParse = (value) => {
            try {
              const parsed = JSON.parse(value)
              if (typeof parsed === 'string') {
                try { return JSON.parse(parsed) } catch (_) { return null }
              }
              return parsed
            } catch (_) {
              return null
            }
          }
          const direct = tryParse(text)
          if (direct) return direct

          const noLineComments = text
            .split('\n')
            .filter(line => !line.trim().startsWith('//'))
            .join('\n')
            .trim()
          const commented = tryParse(noLineComments)
          if (commented) return commented

          const firstBrace = noLineComments.indexOf('{')
          const lastBrace = noLineComments.lastIndexOf('}')
          if (firstBrace >= 0 && lastBrace > firstBrace) {
            const sliced = tryParse(noLineComments.slice(firstBrace, lastBrace + 1))
            if (sliced) return sliced
          }
          return null
        }
        if (!fileData || typeof fileData !== 'object') return null
        const candidates = [
          fileData.content,
          fileData.file_content,
          fileData.fileContent,
          fileData.json,
          fileData.jsonScript,
          fileData.design,
          fileData.layout,
          fileData.payload,
          fileData.text,
          fileData.data,
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
      async computeEvaluationMetricForDesign (design) {
        if (!design || typeof design !== 'object') return null
        try {
          const response = await axios.post('/api/v1/evaluationMetric', { design }, {
            withCredentials: true,
            headers: { 'Content-Type': 'application/json' },
          })
          return this.normalizeEvaluationMetrics(response && response.data && response.data.metrics)
        } catch (_) {
          return null
        }
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
      getComputedMetricsFromJob (job) {
        const fid = this.getPrimaryOutputFileId(job)
        if (!fid) return null
        if (this.computedMetricsByFileId[fid]) return this.computedMetricsByFileId[fid]
        this.ensureEvaluationMetricForFile(fid)
        return null
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
        if (!job || typeof job !== 'object') {
          return {
            areaScore: null,
            compactScore: null,
            connectionLengthScore: null,
            symmetryScore: null,
            bendScore: null,
            fragmentationScore: null,
            overallScore: null,
            explanation: 'No job data is available to compute this score.',
          }
        }

        const primaryFileId = this.getPrimaryOutputFileId(job)
        const computedFromJson = this.getComputedMetricsFromJob(job)
        if (computedFromJson) {
          const weightedOverall =
            computedFromJson.areaScore * this.evaluationWeights.area +
            computedFromJson.compactScore * this.evaluationWeights.compact +
            computedFromJson.connectionLengthScore * this.evaluationWeights.connectionLength +
            computedFromJson.bendScore * this.evaluationWeights.bend +
            computedFromJson.symmetryScore * this.evaluationWeights.symmetry +
            computedFromJson.fragmentationScore * this.evaluationWeights.fragmentation
          return {
            ...computedFromJson,
            overallScore: weightedOverall,
            explanation: 'Computed by backend. Total is recalculated in GUI using applied weights.',
          }
        }
        if (primaryFileId) {
          const state = this.evaluationFetchStateByFileId[primaryFileId]
          if (!state || state === 'pending') {
            this.ensureEvaluationMetricForFile(primaryFileId)
            return {
              areaScore: null,
              compactScore: null,
              connectionLengthScore: null,
              symmetryScore: null,
              bendScore: null,
              fragmentationScore: null,
              overallScore: null,
              explanation: 'Evaluation metric is being calculated by Neptune_2026 backend...',
            }
          }
          if (state === 'failed') {
            return {
              areaScore: null,
              compactScore: null,
              connectionLengthScore: null,
              symmetryScore: null,
              bendScore: null,
              fragmentationScore: null,
              overallScore: null,
              explanation: 'Backend evaluation metric failed for this output JSON.',
            }
          }
        }

        const evaluationObj = (job.evaluation && typeof job.evaluation === 'object' && job.evaluation) || null
        const metricsObj = (job.metrics && typeof job.metrics === 'object' && job.metrics) || null
        const sources = [job, evaluationObj, metricsObj]

        let areaScore = this.resolveMetricFromCandidates(sources, ['area_score', 'areaScore'])
        const connectionLengthScore = this.resolveMetricFromCandidates(sources, ['connection_length_score', 'connectionLengthScore'])
        let compactScore = this.resolveMetricFromCandidates(sources, ['compact_score', 'compactScore'])
        const symmetryScore = this.resolveMetricFromCandidates(sources, ['symmetry_score', 'symmetryScore'])
        const bendScore = this.resolveMetricFromCandidates(sources, ['bend_score', 'bendScore'])
        const fragmentationScore = this.resolveMetricFromCandidates(sources, ['fragmentation_score', 'fragmentationScore'])
        if (compactScore == null) compactScore = 0
        const components = [areaScore, connectionLengthScore, compactScore, symmetryScore, bendScore, fragmentationScore]
        const hasAllComponents = components.every(v => v != null)

        let overallScore = this.resolveMetricFromCandidates(sources, [
          'overall_score',
          'overallScore',
          'evaluation_score',
          'evaluationScore',
          'evaluation_metric_value',
          'evaluationMetricValue',
          'metric_value',
          'metricValue',
          'score',
        ])
        let explanation = 'The total score comes directly from backend output.'

        if (hasAllComponents) {
          overallScore =
            areaScore * this.evaluationWeights.area +
            compactScore * this.evaluationWeights.compact +
            connectionLengthScore * this.evaluationWeights.connectionLength +
            bendScore * this.evaluationWeights.bend +
            symmetryScore * this.evaluationWeights.symmetry +
            fragmentationScore * this.evaluationWeights.fragmentation
          explanation = 'The total score is computed from Neptune_2026 weighted formula using the applied weights.'
        }

        return {
          areaScore,
          compactScore,
          connectionLengthScore,
          symmetryScore,
          bendScore,
          fragmentationScore,
          overallScore,
          explanation,
        }
      },
      getJobActionStatus (job) {
        const candidates = [
          job && job.status,
          job && job.state,
          job && job.job_status,
          job && job.result_status,
          job && job.evaluation_status,
          job && job.evaluation && job.evaluation.status,
          job && job.metrics && job.metrics.status,
        ].filter(Boolean)
        const normalized = String(candidates[0] || '').toLowerCase()
        if (/fail|error/.test(normalized)) return 'fail'
        if (/ongoing|running|pending|progress/.test(normalized)) return 'ongoing'
        if (/done|success|completed|complete/.test(normalized)) return 'done'
        return this.getComputedMetricsFromJob(job) ? 'done' : 'ongoing'
      },
      async refreshExampleResults () {
        const results = await Promise.all(this.staticExampleRows.map(async (row) => {
          const designFromJsonText = row.jsonText
            ? this.extractDesignJson({ content: row.jsonText })
            : null
          const computed = await this.computeEvaluationMetricForDesign(designFromJsonText)
          return {
            inputFile: row.inputFile,
            outputFile: row.outputFile,
            lastUpdated: 'Static Example',
            areaScore: this.toFiniteNumber(computed && computed.areaScore),
            compactScore: this.toFiniteNumber(computed && computed.compactScore),
            connectionLengthScore: this.toFiniteNumber(computed && computed.connectionLengthScore),
            symmetryScore: this.toFiniteNumber(computed && computed.symmetryScore),
            bendScore: this.toFiniteNumber(computed && computed.bendScore),
            fragmentationScore: this.toFiniteNumber(computed && computed.fragmentationScore),
            overallScore: this.toFiniteNumber(computed && computed.overallScore),
          }
        }))
        this.exampleResults = results
      },
      getEvaluationScoreBreakdownValue (job, key) {
        const resolved = this.resolveEvaluationScoreBreakdown(job)
        return this.toPercentDisplay(resolved[key])
      },
      getEvaluationScoreTooltip (job) {
        return this.resolveEvaluationScoreBreakdown(job).explanation
      },
      formattimestamp(datestring){
        return Utils.getprettytimestamp(datestring)
      },
      downloadfile(file){
        var fileurl = new URL("/api/v1/downloadFile?id=" + file.id, document.baseURI);
        console.log('downloading file: ',file.id);
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
            link.setAttribute('download', file.name) //or any other extension
            document.body.appendChild(link)
            link.click()
        })
      },
      openpreview(fid){
        alert(fid)
      },
      deletejob (jid){
        alert(jid)
      },
      viewjobfiles(jid){
        this.selectedjobid = jid
        this.files = []
        for (let fid of this.jobobjects[jid].files){
          axios.get('/api/v1/file', {
            params: {
              id: fid
            }
          })
          .then((response) => {
            console.log(response.data)
            this.files.push(response.data)
          })
          .catch((error) => {
            console.log(error)
          })

        }
      },
      downloadjobfiles(jid){
        // alert(jid);
        for (let fid of this.jobobjects[jid].files){
          axios.get('/api/v1/file', {
            params: {
              id: fid
            }
          })
          .then((response) => {
            var fileData = response.data;
            console.log(fileData)
            this.downloadfile(fileData);
          })
          .catch((error) => {
            console.log(error)
          })

        }
      },
      openWorkspace (job) {
        if (!job || !job.files || !job.files.length) return
        const firstFileId = job.files[0]
        axios.get('/api/v1/file', { params: { id: firstFileId } })
          .then((response) => {
            const wid = response.data.workspaceid || response.data.workspace_id
            if (!wid) return
            this.$router.push({ path: '/dashboard', query: { workspace: wid } })
          })
          .catch((error) => {
            console.log(error)
          })
      },
      complete (index) {
        this.list[index] = !this.list[index]
      },
      async getAllJobs () {
            // $.get('/api/v1/jobs',function (response) {
            //     self.jobIDs.removeAll();
            //     self.jobs.removeAll();
            //     for(var i = 0 ; i<response.length;i++){
            //         self.addJob(response[i]);
            //         self.jobIDs.push(response[i]);
            //     }
            //     console.log("Jobs Found:", self.jobIDs());
            // })
        let config = {
          withCredentials: true,
          crossorigin: true,
          headers: {
          'Content-Type': 'application/json' //,
          // 'Access-Control-Allow-Origin': 'http://localhost:8080',
          // 'Access-Control-Allow-Headers': 'Content-Type,Authorization',
          // 'Access-Control-Allow-Methods': 'GET,PUT,POST,DELETE,OPTIONS',
          // 'Access-Control-Allow-Credentials': 'true'
          },
        }

        try {
          const jobsResponse = await axios.get('/api/v1/jobs', config)
          const jobIds = Array.isArray(jobsResponse.data) ? jobsResponse.data : []
          const jobRequests = jobIds.map((jobid) =>
            axios.get('/api/v1/job', { params: { job_id: jobid } })
              .then((response) => response.data)
              .catch((error) => {
                console.log(error)
                return null
              })
          )
          const allJobs = (await Promise.all(jobRequests)).filter(Boolean)
          this.jobs = allJobs
          this.jobobjects = {}
          allJobs.forEach((job) => {
            this.jobobjects[job.id] = job
          })
          await Promise.all(allJobs.map((job) => this.prefetchFileData(job.files)))
        } catch (error) {
          console.log(error)
        }
      }
    },
  }
</script>

<style lang="sass" scoped>
/* Jobs + file name card titles: page title minus 4pt, bold to match Dashboard "Workspaces" */
.solutions-page
  ::v-deep .v-card--material .card-title
    font-size: var(--neptune-fs-below-page-title) !important
    font-weight: 600 !important
    letter-spacing: -0.015em

  /* Jobs table: match Component Library .component-library-table (14pt) */
  ::v-deep .solutions-jobs-table
    table,
    thead th,
    tbody td
      font-size: 14pt !important

  ::v-deep .solutions-jobs-table table
    border-collapse: collapse !important
    border: 1px solid rgba(0, 51, 73, 0.24) !important

  ::v-deep .solutions-jobs-table thead th,
  ::v-deep .solutions-jobs-table tbody td
    border: 1px solid rgba(0, 51, 73, 0.18) !important

  ::v-deep .solutions-jobs-table thead tr:first-child th
    border-bottom: 1px solid rgba(0, 51, 73, 0.24) !important

  /* File card “Actions” label — same scale as library table */
  .body-2
    font-size: 14pt !important

  .solutions-formula-panel
    background: rgba(76, 175, 80, 0.08)
    border-radius: 8px
    padding: 12px

  .solutions-formula-line
    font-size: var(--neptune-fs-body, 14pt) !important
    line-height: 1.55

  .solutions-formula-panel ::v-deep .v-text-field input
    font-size: var(--neptune-fs-body, 14pt) !important

  .solutions-formula-panel ::v-deep .v-label
    font-size: var(--neptune-fs-body, 14pt) !important

  .solutions-formula-panel ::v-deep .v-btn,
  .solutions-formula-panel ::v-deep .v-btn .v-btn__content
    font-size: var(--neptune-fs-body, 14pt) !important
    text-transform: none !important
    letter-spacing: normal !important

  .solutions-parameter-alert
    font-size: inherit

  .solutions-parameter-alert.v-alert--outlined
    border-color: rgba(0, 105, 148, 0.45) !important
    background: rgba(0, 105, 148, 0.04) !important

  .solutions-parameter-alert ::v-deep .v-alert__icon
    color: #006994 !important

  .solutions-parameter-alert ::v-deep .v-alert__content
    font-size: var(--neptune-fs-body, 14pt) !important
    line-height: 1.55
    color: rgba(0, 0, 0, 0.87) !important

  .theme--dark .solutions-parameter-alert ::v-deep .v-alert__content
    color: rgba(255, 255, 255, 0.9) !important

  .solutions-parameter-hint-row
    display: flex
    align-items: center
    gap: 12px
    flex-wrap: wrap

  .solutions-parameter-hint-text
    flex: 1 1 320px
    min-width: 0

  .solutions-parameter-hint-text strong
    color: #006994 !important
    font-weight: 600

  .solutions-parameter-spec-btn
    text-transform: none !important
    letter-spacing: normal !important
    flex: 0 0 auto

  .solutions-parameter-spec-btn ::v-deep .v-btn__content
    text-transform: none !important
    letter-spacing: normal !important

  .solutions-formula-inputs
    display: flex
    flex-wrap: wrap
    gap: 8px

  .solutions-weight-input
    max-width: 120px

  .solutions-weight-input ::v-deep .v-label
    font-size: calc(var(--neptune-fs-body, 14pt) + 2pt) !important

  .solutions-apply-btn
    align-self: center

  .results-example-row
    td
      background: rgba(76, 175, 80, 0.18)
      color: #1b5e20
      font-style: italic
      font-weight: 600

  .results-status
    display: inline-block
    min-width: 84px
    text-align: center
    border-radius: 999px
    padding: 2px 10px
    font-weight: 600
    text-transform: lowercase

  .results-status--done
    background: rgba(76, 175, 80, 0.22)
    color: #1b5e20

  .results-status--fail
    background: rgba(244, 67, 54, 0.18)
    color: #b71c1c

  .results-status--ongoing
    background: rgba(255, 193, 7, 0.22)
    color: #795548
</style>
<style lang="sass">
  #coloured-line
    .ct-series-a .ct-line,
    .ct-series-a .ct-point
      stroke: #00cae3 !important

  #multiple-bar
    .ct-series-a .ct-bar
      stroke: #00cae3 !important

    .ct-series-b .ct-bar
      stroke: #f44336 !important

  #pie
    .ct-series-a .ct-slice-pie
      fill: #00cae3 !important

    .ct-series-b .ct-slice-pie
      fill: #f44336 !important
</style>
