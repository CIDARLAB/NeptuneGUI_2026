<template>
  <v-container
    id="landing"
    class="fill-height justify-center align-start"
    tag="section"
  >
    <v-row justify="center" align="start">
      <v-col cols="12" class="text-center">
        <v-slide-y-transition appear>
          <v-img
            :src="require('@/assets/Neptune2026_logo.png')"
            height="160"
            max-height="28vh"
            contain
            class="mx-auto"
          />
        </v-slide-y-transition>
        <div class="mt-4 d-flex flex-wrap justify-center align-center landing-buttons">
          <v-btn
            color="primary"
            class="ma-2"
            large
            to="/login"
          >
            <span class="landing-btn-text">Login</span>
          </v-btn>
          <v-btn
            color="secondary"
            class="ma-2"
            large
            to="/register"
          >
            <span class="landing-btn-text">Register</span>
          </v-btn>
          <v-btn
            outlined
            class="ma-2"
            large
            @click="continueAsGuest"
          >
            <span class="landing-btn-text">Continue as Guest</span>
          </v-btn>
        </div>
        <p class="mt-3 grey--text landing-guest-text">
          Guest: try the app without an account. Your data is temporary and will be cleared when you close the tab.
        </p>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
.landing-btn-text {
  font-size: 1rem;
  font-weight: 500;
}
.landing-guest-text {
  font-size: 1.125rem;
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
