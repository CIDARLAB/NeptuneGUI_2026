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
            class="ma-2"
            color="silverGrey"
            large
            @click="continueAsGuest"
          >
            <span class="landing-btn-text">Guest Mode</span>
          </v-btn>
        </div>
        <p class="mt-3 landing-guest-text">
          GUEST MODE: use without an account. Data is stored in this browser; you can export to a file (any path) and later restore by importing that file.
        </p>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
.landing-btn-text {
  font-size: 1.125rem; /* +2pt from 1rem */
  font-weight: 500;
}
.landing-guest-text {
  font-size: 16pt;
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
