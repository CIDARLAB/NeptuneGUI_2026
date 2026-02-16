<template>
  <v-container fluid tag="section" class="profile-page">
    <v-row justify="center">
      <v-col cols="12" md="8">
        <v-card outlined class="pa-4">
          <v-card-title class="primary--text text-h5 profile-card-title">
            Profile
          </v-card-title>
          <v-card-subtitle class="mb-4 profile-card-subtitle">
            Manage your account
          </v-card-subtitle>

          <v-form>
            <v-text-field
              v-model="form.username"
              label="Username"
              outlined
              hide-details
              class="mb-3"
              color="primary"
            />
            <v-text-field
              v-model="form.email"
              label="Email"
              type="email"
              outlined
              hide-details
              class="mb-3"
              color="primary"
            />
            <v-text-field
              v-model="form.password"
              label="Password"
              type="password"
              outlined
              hide-details
              class="mb-3"
              color="primary"
              placeholder="Leave blank to keep current"
              persistent-placeholder
            />
            <v-text-field
              v-model="form.displayName"
              label="Display name"
              outlined
              hide-details
              class="mb-3"
              color="primary"
            />

            <div class="d-flex flex-wrap align-center mt-4">
              <v-btn color="primary" class="mr-3" @click="save">
                Save
              </v-btn>
              <v-btn outlined color="primary" :to="backRoute">
                Back to {{ backLabel }}
              </v-btn>
            </div>
          </v-form>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
export default {
  name: 'Profile',

  data () {
    return {
      form: {
        username: '',
        email: '',
        password: '',
        displayName: '',
      },
    }
  },

  computed: {
    backRoute () {
      return { name: 'Dashboard' }
    },
    backLabel () {
      return 'Dashboard'
    },
  },

  methods: {
    save () {
      this.$emit('save', this.form)
    },
  },
}
</script>

<style scoped>
.profile-page {
  padding-top: 1rem;
}
.profile-card-title {
  margin-bottom: 1rem;
}
.profile-card-subtitle {
  margin-top: 0;
}
</style>
