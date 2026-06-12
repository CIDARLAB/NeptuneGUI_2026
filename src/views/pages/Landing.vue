<template>
  <v-container id="landing" fluid class="fill-height landing-shell pa-0" tag="section">
    <v-img
      :src="require('@/assets/Neptune2026_logo_white_text.png')"
      contain
      class="landing-logo"
    />
    <v-row class="fill-height ma-0 landing-main-row" align="start" justify="end" no-gutters>
      <v-col cols="12" md="7" lg="6" class="landing-right-panel d-flex align-start">
        <v-card class="landing-notice-card pa-4 pa-sm-6" outlined>
          <v-card-title class="landing-notice-title px-0 pt-0 pb-0">
            User Notice
          </v-card-title>
          <v-card-text class="landing-notice-text px-0 pt-0 pb-0">
            <p>
              Neptune runs in <strong>online guest mode only</strong>; there is no sign-up.
              <strong>To protect data privacy, we do not provide online data storage.</strong>
              Please save your data to your local computer to avoid loss.
            </p>
            <p>
              Use <strong>Export</strong> to save workspaces and component library state you care about.
              <strong>Refreshing or opening this site again removes everything except the built-in examples and default component library.</strong>
              If you do not export, data loss is not our responsibility.
            </p>
            <p class="mb-0">
              When you close this tab, refresh, or leave the site, your browser will ask you to confirm leaving.
              If you leave, the next time you open Neptune you only get the default files again unless you exported.
            </p>
          </v-card-text>
          <v-checkbox
            v-model="hasAcknowledgedNoOnlineStorage"
            class="landing-ack-checkbox mt-3 mb-0"
            color="success"
            hide-details
            label="I understand that Neptune does not save my data online."
          />
          <v-card-actions class="px-0 pt-4 pb-0">
            <v-spacer />
            <v-btn color="success" large :disabled="!hasAcknowledgedNoOnlineStorage" @click="continueAsGuest">
              Enter Dashboard
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
.landing-shell {
  position: relative;
  min-height: 100%;
}

.landing-main-row {
  min-height: 100%;
}

.landing-right-panel {
  min-height: 100%;
  justify-content: flex-end;
  padding-right: 30pt;
}

.landing-logo {
  position: absolute;
  top: 10pt;
  left: 10pt;
  z-index: 3;
  width: 260px;
  max-width: 38vw;
}

.landing-notice-card {
  width: 100%;
  max-width: 29.5rem;
  min-height: 40rem;
  margin-top: 30pt;
  display: flex;
  flex-direction: column;
  border-color: rgba(255, 255, 255, 0.22) !important;
  background: linear-gradient(
    140deg,
    rgba(6, 30, 39, 0.95) 0%,
    rgba(11, 49, 63, 0.9) 45%,
    rgba(14, 28, 45, 0.95) 100%
  );
  color: #fff;
  box-shadow: 0 14px 38px rgba(0, 0, 0, 0.32);
}

.landing-notice-title {
  justify-content: center;
  text-align: center;
  margin-bottom: 10pt;
  font-size: 1.55rem;
  font-weight: 700;
  color: #fff;
}

.landing-notice-text {
  flex: 1 1 auto;
  font-size: 1.02rem;
  line-height: 1.6;
  color: #fff;
}

.landing-ack-checkbox {
  color: #fff;
}

.landing-ack-checkbox ::v-deep .v-label {
  color: #fff !important;
}

@media (max-width: 960px) {
  .landing-right-panel {
    min-height: auto;
    padding-right: 30pt;
    padding-left: 10pt;
  }

  .landing-logo {
    width: 230px;
    max-width: 62vw;
  }

  .landing-notice-card {
    margin-top: 30pt;
    min-height: 34rem;
  }
}
</style>

<script>
  import router from '../../router'

  export default {
    name: 'Landing',
    data: () => ({
      hasAcknowledgedNoOnlineStorage: false,
    }),
    methods: {
      continueAsGuest () {
        this.$store.commit('setGuest')
        router.push('/dashboard')
      },
    },
  }
</script>
