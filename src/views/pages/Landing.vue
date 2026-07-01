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
          <v-card-actions class="landing-notice-actions px-0 pt-4 pb-0">
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
  min-height: 100vh;
  --logo-bottom-gap: 150px;
  --about-button-gap: 110px;
  --landing-safe-gap: 12px;
}

.landing-main-row {
  min-height: 100vh;
}

.landing-right-panel {
  position: relative;
  min-height: 100vh;
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
  position: absolute;
  top: calc(var(--logo-bottom-gap) + var(--landing-safe-gap));
  right: 30pt;
  bottom: calc(var(--about-button-gap) + var(--landing-safe-gap));
  width: 100%;
  max-width: 29.5rem;
  min-height: 0;
  height: auto;
  max-height: none;
  margin-top: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
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
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
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

.landing-notice-actions {
  background: transparent;
}

@media (max-width: 960px) {
  .landing-shell {
    --logo-bottom-gap: calc(8pt + min(170px, 55vw) + 12pt);
    --about-button-gap: 120px;
    --landing-safe-gap: 10px;
  }

  .landing-right-panel {
    min-height: 100vh;
    padding-right: 0;
    justify-content: flex-end;
  }

  .landing-logo {
    width: 170px;
    max-width: 55vw;
    top: 8pt;
    left: 8pt;
  }

  .landing-notice-card {
    right: 0.75rem;
    left: 0.75rem;
    max-width: 100%;
  }

  .landing-notice-title {
    margin-bottom: 6pt;
    font-size: 1.15rem;
  }

  .landing-notice-text {
    font-size: 0.92rem;
    line-height: 1.45;
  }

  .landing-notice-actions {
    position: sticky;
    bottom: 0;
    padding-bottom: 0.25rem !important;
    background: linear-gradient(
      to top,
      rgba(14, 28, 45, 0.98) 70%,
      rgba(14, 28, 45, 0.2) 100%
    );
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
