import Vue from 'vue'
import Vuex from 'vuex'
import { buildJobAlertRecord, normalizeJobResultStatus } from '@/lib/jobAlerts'

Vue.use(Vuex)

function upsertJobAlert (state, job, status) {
  if (!job || !job.id) return
  const rec = buildJobAlertRecord(job, status)
  const idx = state.jobAlerts.findIndex((a) => String(a.jobId) === String(rec.jobId))
  if (idx >= 0) {
    Vue.set(state.jobAlerts, idx, rec)
  } else {
    state.jobAlerts.unshift(rec)
  }
  if (state.jobAlerts.length > 50) {
    state.jobAlerts.splice(50)
  }
}

export default new Vuex.Store({
  state: {
    // Drawer gradient (top → bottom), aligned with brand primary #006994
    barColor: 'rgba(0, 58, 82, 0.98), rgba(0, 32, 48, 1)',
    barImage: '',
    drawer: null,
    fontSize: 'normal',
    isLoggedIn: false,
    isGuest: false,
    userID: null,
    currentFile: null,
    currentWorkspace: null,
    currentUser: null,
    jobAlerts: [],
    jobStatusById: {},
    jobAlertsHydrated: false,
    highlightJobId: null,
  },
  mutations: {
    SET_BAR_IMAGE (state, payload) {
      state.barImage = payload
    },
    SET_DRAWER (state, payload) {
      state.drawer = payload
    },
    SET_SCRIM (state, payload) {
      state.barColor = payload
    },
    updateUser (state, payload) {
      state.userID = payload && (payload._id || payload.id) ? (payload._id || payload.id) : payload
      state.currentUser = payload && typeof payload === 'object' ? payload : null
      state.isLoggedIn = true
      state.isGuest = false
    },
    setGuest (state) {
      state.isGuest = true
      state.isLoggedIn = true
      state.currentUser = { email: 'guest@session', isGuest: true }
      state.userID = 'guest'
    },
    clearGuest (state) {
      state.isGuest = false
      if (state.currentUser && state.currentUser.isGuest) {
        state.isLoggedIn = false
        state.currentUser = null
        state.userID = null
        state.currentWorkspace = null
        state.currentFile = null
      }
      state.jobAlerts = []
      state.jobStatusById = {}
      state.jobAlertsHydrated = false
      state.highlightJobId = null
    },
    updateCurrentFile (state, fid) {
      state.currentFile = fid
    },
    SET_WORKSPACE (state, payload) {
      state.currentWorkspace = payload
    },
    SET_CURRENT_FILE (state, payload) {
      state.currentFile = payload
    },
    SET_CURRENT_USER (state, payload) {
      state.currentUser = payload
    },
    SET_FONT_SIZE (state, payload) {
      state.fontSize = (payload && ['large', 'normal', 'small'].includes(payload)) ? payload : 'normal'
    },
    ingestJobSnapshots (state, jobs) {
      const list = Array.isArray(jobs) ? jobs : []
      const seed = !state.jobAlertsHydrated
      list.forEach((job) => {
        if (!job || !job.id) return
        const next = normalizeJobResultStatus(job)
        const prev = state.jobStatusById[job.id]
        Vue.set(state.jobStatusById, job.id, next)
        if (seed) return
        if ((next === 'done' || next === 'fail') && prev === 'processing') {
          upsertJobAlert(state, job, next)
        }
      })
      state.jobAlertsHydrated = true
    },
    addJobResultAlert (state, job) {
      if (!job || !job.id) return
      const next = normalizeJobResultStatus(job)
      Vue.set(state.jobStatusById, job.id, next)
      if (next === 'done' || next === 'fail') {
        upsertJobAlert(state, job, next)
      }
      state.jobAlertsHydrated = true
    },
    markJobAlertsRead (state) {
      state.jobAlerts = state.jobAlerts.map((a) => ({ ...a, read: true }))
    },
    clearJobAlerts (state) {
      state.jobAlerts = []
    },
    removeJobAlert (state, jobId) {
      const id = String(jobId || '')
      if (!id) return
      state.jobAlerts = state.jobAlerts.filter((a) => String(a.jobId) !== id)
    },
    setHighlightJobId (state, jobId) {
      state.highlightJobId = jobId ? String(jobId) : null
    },
  },
  getters: {
    userID: state => state.userID,
    isLoggedIn: state => state.isLoggedIn,
    isGuest: state => state.isGuest,
    currentFile: state => state.currentFile,
    currentWorkspace: state => state.currentWorkspace,
    currentUser: state => state.currentUser,
    canAccessApp: state => state.isLoggedIn || state.isGuest,
    fontSize: state => state.fontSize,
    unreadJobAlertCount: state => state.jobAlerts.filter((a) => a && !a.read).length,
    jobAlertsNewestFirst: state =>
      [...state.jobAlerts].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)),
  },
  actions: {

  },
})
