<template>
  <v-container fluid tag="section" class="settings-page">
    <v-row justify="center">
      <v-col cols="12" md="8">
        <v-card outlined class="pa-6">
          <v-icon size="64" color="primary" class="mb-4 d-block text-center">mdi-cog-outline</v-icon>
          <v-card-title class="primary--text text-h5 justify-center settings-card-title">
            Settings
          </v-card-title>

          <v-card-text>
            <v-select
              v-model="fontSize"
              :items="fontSizeItems"
              item-text="text"
              item-value="value"
              label="Font size"
              outlined
              dense
              hide-details
              class="mb-4"
              @change="onFontSizeChange"
            />
          </v-card-text>

          <v-card-actions class="justify-center pt-0">
            <v-btn color="primary" :to="backRoute">
              Back to {{ backLabel }}
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
export default {
  name: 'SettingsPage',

  data () {
    return {
      fontSizeItems: [
        { value: 'large', text: 'LARGE' },
        { value: 'normal', text: 'NORMAL' },
        { value: 'small', text: 'SMALL' },
      ],
    }
  },

  computed: {
    backRoute () {
      return this.$store.getters.canAccessApp ? { name: 'Dashboard' } : { path: '/' }
    },
    backLabel () {
      return this.$store.getters.canAccessApp ? 'Dashboard' : 'Home'
    },
    fontSize: {
      get () {
        return this.$store.getters.fontSize || 'normal'
      },
      set (v) {
        this.$store.commit('SET_FONT_SIZE', v)
      },
    },
  },

  methods: {
    onFontSizeChange () {
      this.$store.commit('SET_FONT_SIZE', this.fontSize)
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
</style>
