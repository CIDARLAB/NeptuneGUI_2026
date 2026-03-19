<template>
  <v-container
    id="user-profile"
    fluid
    tag="section"
  >
    <v-row justify="center">
      <v-col
        cols="12"
        md="8"
      >
        <base-material-card icon="mdi-account-outline">
          <template v-slot:after-heading>
            <div class="font-weight-light card-title mt-2">
              Edit Profile
              <span class="body-1">— Complete your profile</span>
            </div>
          </template>

          <v-form @submit.prevent="save">
            <v-container class="py-0">
              <v-row>
                <v-col
                  cols="12"
                  md="4"
                >
                  <v-text-field
                    v-model="form.username"
                    class="purple-input"
                    label="User Name"
                  />
                </v-col>

                <v-col
                  cols="12"
                  md="4"
                >
                  <v-text-field
                    v-model="form.email"
                    label="Email Address"
                    class="purple-input"
                  />
                </v-col>

                <v-col
                  cols="12"
                  md="6"
                >
                  <v-text-field
                    v-model="form.firstName"
                    label="First Name"
                    class="purple-input"
                  />
                </v-col>

                <v-col
                  cols="12"
                  md="6"
                >
                  <v-text-field
                    v-model="form.lastName"
                    label="Last Name"
                    class="purple-input"
                  />
                </v-col>

                <v-col cols="12">
                  <v-text-field
                    v-model="form.address"
                    label="Address"
                    class="purple-input"
                  />
                </v-col>

                <v-col
                  cols="12"
                  md="4"
                >
                  <v-text-field
                    v-model="form.city"
                    label="City"
                    class="purple-input"
                  />
                </v-col>

                <v-col
                  cols="12"
                  md="4"
                >
                  <v-text-field
                    v-model="form.country"
                    label="Country"
                    class="purple-input"
                  />
                </v-col>

                <v-col
                  cols="12"
                  md="4"
                >
                  <v-text-field
                    v-model="form.postalCode"
                    class="purple-input"
                    label="Postal Code"
                    type="number"
                  />
                </v-col>

                <v-col
                  cols="12"
                  class="text-right"
                >
                  <v-btn
                    type="submit"
                    color="success"
                    class="mr-0"
                    :loading="saving"
                  >
                    Update Profile
                  </v-btn>
                </v-col>
              </v-row>
            </v-container>
          </v-form>
        </base-material-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
  import axios from 'axios'

  export default {
    name: 'UserProfile',

    data () {
      return {
        form: {
          username: '',
          email: '',
          firstName: '',
          lastName: '',
          address: '',
          city: '',
          country: '',
          postalCode: '',
        },
        saving: false,
      }
    },

    computed: {
      currentUser () {
        return this.$store.getters.currentUser
      },
    },

    watch: {
      currentUser: {
        immediate: true,
        handler (user) {
          if (user && !user.isGuest) {
            this.form.username = user.username || ''
            this.form.firstName = this.form.firstName || ''
            this.form.lastName = this.form.lastName || ''
            this.form.address = this.form.address || ''
            this.form.city = this.form.city || ''
            this.form.country = this.form.country || ''
            this.form.postalCode = this.form.postalCode || ''
          }
        },
      },
    },

    mounted () {
      this.syncFormFromStore()
      this.fetchUser()
    },

    methods: {
      syncFormFromStore () {
        const u = this.$store.getters.currentUser
        if (u && !u.isGuest) {
          this.form.username = u.username || ''
        }
      },
      fetchUser () {
        if (this.$store.getters.isGuest) return
        axios.get('/api/v2/user', { withCredentials: true })
          .then((res) => {
            const u = res.data
            this.$store.commit('SET_CURRENT_USER', u)
            this.form.username = u.username || ''
          })
          .catch(() => {})
      },
      save () {
        if (this.$store.getters.isGuest) return
        this.saving = true
        axios.patch('/api/v2/user', { username: this.form.username.trim(), email: this.form.email.trim() }, { withCredentials: true })
          .then((res) => {
            this.$store.commit('updateUser', res.data)
          })
          .catch((err) => {
            const msg = (err.response && err.response.data && err.response.data.error) || err.message
            alert(msg)
          })
          .finally(() => { this.saving = false })
      },
    },
  }
</script>
