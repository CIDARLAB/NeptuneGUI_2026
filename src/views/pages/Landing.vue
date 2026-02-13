<template>
  <v-container
    id="landing"
    class="fill-height justify-center"
    tag="section"
  >
    <v-row justify="center" align="center">
      <v-col cols="12" class="text-center">
        <v-slide-y-transition appear>
          <v-img
            :src="require(`@/assets/neptune_logo.svg`)"
            height="300px"
            contain
            class="mx-auto"
          />
        </v-slide-y-transition>
        <div class="mt-6 d-flex flex-wrap justify-center align-center">
          <v-btn
            color="primary"
            class="ma-2"
            to="/login"
          >
            Login
          </v-btn>
          <v-btn
            color="secondary"
            class="ma-2"
            to="/register"
          >
            Register
          </v-btn>
          <v-btn
            outlined
            class="ma-2"
            @click="continueAsGuest"
          >
            Continue as Guest
          </v-btn>
        </div>
        <p class="mt-4 grey--text body-2">
          Guest: try the app without an account. Your data is temporary and will be cleared when you close the tab.
        </p>
      </v-col>
    </v-row>
  </v-container>
</template>

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
