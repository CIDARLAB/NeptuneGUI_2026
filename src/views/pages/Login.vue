<template>
  <v-container
    id="login"
    class="fill-height justify-center"
    tag="section"
  >
    <v-row justify="center">
      <v-slide-y-transition appear>
        <base-material-card
          color="success"
          light
          max-width="100%"
          width="400"
          class="px-5 py-3"
        >
          <template v-slot:heading>
            <div class="text-center">
              <h1 class="display-2 font-weight-bold mb-2">
                Login
              </h1>
              <!-- <v-btn
                v-for="(social, i) in socials"
                :key="i"
                :href="social.href"
                class="ma-1"
                icon
                rel="noopener"
                target="_blank"
              >
                <v-icon
                  v-text="social.icon"
                />
              </v-btn> -->
            </div>
          </template>

          <v-card-text class="text-center">
            <div class="text-center grey--text body-1 font-weight-light mb-2">
              Or <router-link to="/register">Register</router-link>
            </div>
            <v-btn
              outlined
              small
              class="mb-3"
              @click="continueAsGuest"
            >
              Continue as Guest
            </v-btn>

            <v-text-field
              color="secondary"
              label="Username..."
              prepend-icon="mdi-account"
              v-model="username"
            />

            <v-text-field
              class="mb-8"
              color="secondary"
              label="Password..."
              prepend-icon="mdi-lock-outline"
              type="password"
              v-model="password"
            />

            <pages-btn
              large
              color=""
              depressed
              class="v-btn--text success--text"
              v-on:click="login"
            >
              Let's Go
            </pages-btn>
          </v-card-text>
        </base-material-card>
      </v-slide-y-transition>
    </v-row>
  </v-container>
</template>

<script>
  import router from '../../router'
  import axios from 'axios'
  import * as localAuth from '@/lib/localAuth'

  export default {
    name: 'PagesLogin',

    components: {
      PagesBtn: () => import('./components/Btn'),
    },

    data: () => ({
      username: '',
      password: '',
    }),

    methods: {
      login (event) {
        event.preventDefault()
        const data = { username: this.username.trim(), password: this.password }

        if (process.env.VUE_APP_USE_LOCAL_AUTH === 'true') {
          localAuth.login({ email: data.username, password: data.password })
            .then((res) => {
              this.$store.commit('updateUser', res.user)
              router.push('/dashboard')
            })
            .catch((e) => { console.error('Cannot log in', e.message) })
          return
        }

        axios.post('/api/v2/login', data, { withCredentials: true })
          .then((response) => {
            this.$store.commit('updateUser', response.data.user)
            router.push('/dashboard')
          })
          .catch((errors) => { console.error('Cannot log in', errors) })
      },
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
