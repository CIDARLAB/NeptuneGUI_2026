<template>
  <v-container fluid tag="section" class="settings-page">
    <v-row justify="center">
      <v-col cols="12" md="8">
        <v-card outlined class="pa-6 text-center">
          <v-icon size="64" color="primary" class="mb-4">mdi-cog-outline</v-icon>
          <v-card-title class="primary--text text-h5 justify-center settings-card-title">
            Settings
          </v-card-title>
          <v-card-subtitle class="mb-4 settings-card-subtitle">
            Coming soon
          </v-card-subtitle>
          <p class="grey--text mb-4">
            Application settings will be available in a future release.
          </p>
          <v-btn color="primary" :to="backRoute">
            Back to {{ backLabel }}
          </v-btn>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
export default {
  name: 'SettingsPage',

  computed: {
    backRoute () {
      return { name: 'Dashboard' }
    },
    backLabel () {
      return 'Dashboard'
    },
  },
}
</script>

<style scoped>
.settings-page {
  padding-top: 1rem;
}
.settings-card-title {
  margin-bottom: 1rem;
}
.settings-card-subtitle {
  margin-top: 0;
}
</style>
