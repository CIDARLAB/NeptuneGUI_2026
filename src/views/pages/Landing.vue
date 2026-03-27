<template>
  <v-container id="landing" class="fill-height landing-shell" tag="section">
    <v-slide-y-transition appear>
      <v-img
        :src="require('@/assets/Neptune2026_logo_white_text.png')"
        contain
        class="landing-top-right-logo"
      />
    </v-slide-y-transition>

    <v-row justify="center" align="center" class="fill-height landing-content-row">
      <v-col cols="12" md="9" lg="8" class="text-center">
        <div class="mt-4 d-flex justify-center align-center landing-buttons">
          <v-btn class="ma-2" color="success" large @click="continueAsGuest">
            <span class="landing-btn-text">Start Now!</span>
          </v-btn>
        </div>
        <p class="mt-2 landing-guest-text">
          Local mode only: no account is required. To keep your data across sessions, export your workspaces to a zip file and later restore by importing that file.
        </p>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
.landing-shell {
  position: relative;
}

.landing-top-right-logo {
  position: absolute;
  top: -80pt;
  left: 0;
  width: 260px;
  max-width: 38vw;
  z-index: 2;
}

.landing-content-row {
  transform: translateY(-100pt);
}

.landing-btn-text {
  font-size: 1.125rem; /* +2pt from 1rem */
  font-weight: 500;
}
.landing-guest-text {
  font-size: 18pt;
  max-width: 900px;
  margin-left: auto;
  margin-right: auto;
  color: rgba(255, 255, 255, 0.95);
}
</style>

<script>
  import router from '../../router'
  import axios from 'axios'

  export default {
    name: 'Landing',

    data: () => ({
      socials: [
        { href: '#', icon: 'mdi-facebook-box' },
        { href: '#', icon: 'mdi-twitter' },
        { href: '#', icon: 'mdi-github-box' },
      ],
    }),

    methods: {
      continueAsGuest () {
        axios.post('/api/v2/guest', {}, { withCredentials: true })
          .then((res) => {
            this.$store.commit('setGuestViaServer', res.data.user)
            router.push('/dashboard')
          })
          .catch(() => {
            this.$store.commit('setGuest')
            router.push('/dashboard')
          })
      },
    },
  }
</script>
