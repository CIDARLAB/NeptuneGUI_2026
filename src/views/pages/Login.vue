<template>
  <v-container
    id="login"
    class="fill-height justify-center"
    tag="section"
  >
    <v-row justify="center">
      <v-slide-y-transition appear>
        <base-material-card
          color="primary"
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
            <v-alert
              v-if="loginError"
              type="error"
              dense
              class="mb-3 text-left"
            >
              {{ loginError }}
            </v-alert>
            <div class="text-center body-1 font-weight-light mb-2 login-secondary-text">
              Or <router-link to="/register">Register</router-link>
            </div>
            <v-btn
              small
              class="mb-3"
              color="silverGrey"
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
              class="mb-4"
              color="secondary"
              label="Password..."
              prepend-icon="mdi-lock-outline"
              type="password"
              v-model="password"
            />
            <div class="text-left mb-3">
              <a href="#" class="login-forgot-link" @click.prevent="openForgotDialog">Forgot password</a>
            </div>

            <pages-btn
              large
              color="primary"
              depressed
              v-on:click="login"
            >
              Let's Go
            </pages-btn>
          </v-card-text>
        </base-material-card>
      </v-slide-y-transition>
    </v-row>

    <v-dialog v-model="forgotDialog" max-width="420" persistent>
      <v-card>
        <v-card-title class="primary--text">Forgot password</v-card-title>
        <v-card-text>
          <v-alert v-if="forgotMessage" :type="forgotStep === 'done' ? 'success' : 'info'" dense class="mb-3">
            {{ forgotMessage }}
          </v-alert>
          <template v-if="forgotStep === 'email'">
            <p class="body-2 mb-2">Enter your username or registered email to receive a verification code.</p>
            <v-text-field
              v-model="forgotEmail"
              label="Username or email"
              outlined
              dense
              autofocus
            />
          </template>
          <template v-else-if="forgotStep === 'code'">
            <p class="body-2 mb-2">Enter the verification code you received and set a new password.</p>
            <v-text-field v-model="forgotCode" label="Verification code" outlined dense />
            <v-text-field v-model="forgotNewPassword" label="New password" type="password" outlined dense />
            <v-text-field v-model="forgotConfirmPassword" label="Confirm new password" type="password" outlined dense />
          </template>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text @click="closeForgotDialog">Cancel</v-btn>
          <v-btn v-if="forgotStep === 'email'" color="primary" :loading="forgotSending" @click="sendResetCode">Send code</v-btn>
          <v-btn v-else-if="forgotStep === 'code'" color="primary" :loading="forgotResetting" @click="submitResetPassword">Reset password</v-btn>
          <v-btn v-else color="primary" @click="closeForgotDialog">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
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

    watch: {
      username () { this.loginError = '' },
      password () { this.loginError = '' },
    },

    data: () => ({
      username: '',
      password: '',
      loginError: '',
      forgotDialog: false,
      forgotStep: 'email',
      forgotEmail: '',
      forgotCode: '',
      forgotNewPassword: '',
      forgotConfirmPassword: '',
      forgotMessage: '',
      forgotSending: false,
      forgotResetting: false,
    }),

    methods: {
      login (event) {
        event.preventDefault()
        this.loginError = ''
        const data = { username: this.username.trim(), password: this.password }

        if (process.env.VUE_APP_USE_LOCAL_AUTH === 'true') {
          localAuth.login({ email: data.username, password: data.password })
            .then((res) => {
              this.$store.commit('updateUser', res.user)
              router.push('/dashboard')
            })
            .catch((e) => {
              this.loginError = 'Invalid username or password. Please try again.'
            })
          return
        }

        axios.post('/api/v2/login', data, { withCredentials: true })
          .then((response) => {
            this.$store.commit('updateUser', response.data.user)
            router.push('/dashboard')
          })
          .catch((err) => {
            const msg = (err.response && err.response.data && err.response.data.error) || err.message
            if (err.response && err.response.status === 401) {
              this.loginError = 'Invalid username or password. Please try again.'
            } else {
              this.loginError = msg || 'Invalid username or password. Please try again.'
            }
          })
      },
      openForgotDialog () {
        this.forgotDialog = true
        this.forgotStep = 'email'
        this.forgotEmail = this.username.trim()
        this.forgotCode = ''
        this.forgotNewPassword = ''
        this.forgotConfirmPassword = ''
        this.forgotMessage = ''
      },
      closeForgotDialog () {
        this.forgotDialog = false
        this.forgotMessage = ''
      },
      sendResetCode () {
        const email = (this.forgotEmail || '').trim()
        if (!email) {
          this.forgotMessage = 'Please enter your username or registered email.'
          return
        }
        this.forgotSending = true
        this.forgotMessage = ''
        axios.post('/api/v2/forgotPassword', { username: email }, { withCredentials: true })
          .then((res) => {
            this.forgotStep = 'code'
            this.forgotMessage = (res.data && res.data.message) || 'If the account exists, a code has been sent. Check your email or contact an administrator.'
          })
          .catch((err) => {
            const data = err.response && err.response.data
            this.forgotMessage = (data && data.error) || 'Failed to send. Please check username/email and try again.'
          })
          .finally(() => { this.forgotSending = false })
      },
      submitResetPassword () {
        const code = (this.forgotCode || '').trim()
        const newPwd = this.forgotNewPassword
        const confirm = this.forgotConfirmPassword
        if (!code) {
          this.forgotMessage = 'Please enter the verification code.'
          return
        }
        if (!newPwd || newPwd.length < 6) {
          this.forgotMessage = 'New password must be at least 6 characters.'
          return
        }
        if (newPwd !== confirm) {
          this.forgotMessage = 'The two passwords do not match.'
          return
        }
        this.forgotResetting = true
        this.forgotMessage = ''
        const username = (this.forgotEmail || '').trim()
        axios.post('/api/v2/resetPassword', { username, code, newPassword: newPwd }, { withCredentials: true })
          .then(() => {
            this.forgotMessage = 'Password has been reset. Please log in with your new password.'
            this.forgotStep = 'done'
          })
          .catch((err) => {
            const data = err.response && err.response.data
            this.forgotMessage = (data && data.error) || 'Reset failed. Code is invalid or expired. Please request a new code.'
          })
          .finally(() => { this.forgotResetting = false })
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

<style scoped>
/* Login: body/heading 12pt, button text 14pt; username/password 14pt */
#login {
  font-size: 12pt;
}
#login .display-2 {
  font-size: 20pt !important;
}
#login .login-secondary-text {
  font-size: 14pt !important;
}
#login .v-card__text {
  font-size: 12pt !important;
}
#login .v-btn {
  font-size: 14pt !important;
}
</style>
<style lang="scss" scoped>
/* ::v-deep so styles apply inside Vuetify components */
#login::v-deep .v-text-field input,
#login::v-deep .v-text-field .v-label {
  font-size: 14pt !important;
}
#login::v-deep .v-btn {
  font-size: 14pt !important;
}
.login-forgot-link {
  font-size: 12pt;
  color: #006994;
}
</style>
