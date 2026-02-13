import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

export default new Vuex.Store({
  state: {
    barColor: 'rgba(0, 0, 0, .8), rgba(0, 0, 0, .8)',
    barImage: './images/CNCpic.png',
    drawer: null,
    isLoggedIn: false,
    isGuest: false,
    isGuestViaServer: false,
    userID: null,
    currentFile: null,
    currentWorkspace: null,
    currentUser: null,
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
      state.isGuestViaServer = false
      state.isLoggedIn = true
      state.currentUser = { email: 'guest@session', isGuest: true }
      state.userID = 'guest'
    },
    setGuestViaServer (state, user) {
      state.isGuest = true
      state.isGuestViaServer = true
      state.isLoggedIn = true
      state.currentUser = user || { email: 'guest@session', isGuest: true }
      state.userID = (user && user._id) || 'guest'
    },
    clearGuest (state) {
      state.isGuest = false
      state.isGuestViaServer = false
      if (state.currentUser && state.currentUser.isGuest) {
        state.isLoggedIn = false
        state.currentUser = null
        state.userID = null
        state.currentWorkspace = null
        state.currentFile = null
      }
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
    }
  },
  getters: {
    userID: state => state.userID,
    isLoggedIn: state => state.isLoggedIn,
    isGuest: state => state.isGuest,
    isGuestViaServer: state => state.isGuestViaServer,
    currentFile: state => state.currentFile,
    currentWorkspace: state => state.currentWorkspace,
    currentUser: state => state.currentUser,
    canAccessApp: state => state.isLoggedIn || state.isGuest,
  },
  actions: {

  },
})
