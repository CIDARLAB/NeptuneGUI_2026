<template>
  <v-container id="landing" fluid class="fill-height landing-shell" tag="section">
    <v-slide-y-transition appear>
      <v-img
        :src="require('@/assets/Neptune2026_logo_white_text.png')"
        contain
        class="landing-top-right-logo"
      />
    </v-slide-y-transition>

    <v-row justify="center" align="center" class="fill-height landing-content-row">
      <v-col cols="12" md="9" lg="8" class="text-center">
        <p class="mt-2 landing-guest-text landing-main-disclaimer">
          Neptune runs in <strong>online guest mode only</strong>—there is no sign-up. We do not store your work for you: use <strong>Export</strong> to save workspaces and component library state you care about. <strong>Refreshing or opening this site again removes everything except the built-in examples and default component library.</strong> If you do not export, data loss is not our responsibility.
        </p>
      </v-col>
    </v-row>

    <div class="landing-bottom-cta d-flex justify-center align-center">
      <div class="landing-cta-stack text-center">
        <v-btn class="ma-2 landing-start-btn" color="success" large @click="continueAsGuest">
          <span class="landing-btn-text">Start now!</span>
        </v-btn>
        <p class="landing-guest-text landing-guest-text-secondary landing-cta-footnote">
          When you close this tab, refresh, or leave the site, your browser will ask you to confirm leaving—if you leave, the next time you open Neptune you only get the default files again unless you exported.
        </p>
      </div>
    </div>
  </v-container>
</template>

<style scoped>
.landing-shell {
  position: relative;
}

.landing-top-right-logo {
  position: absolute;
  top: -100pt;
  left: 16px;
  width: 260px;
  max-width: 38vw;
  z-index: 2;
}

.landing-content-row {
  transform: translateY(-50pt);
}

.landing-bottom-cta {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  /* CTA block; +40pt term: 10pt lower than previous +50pt */
  bottom: calc(28px - 500pt + 20pt + 40pt);
  z-index: 3;
  width: 100%;
  max-width: 960px;
  padding: 0 16px;
  box-sizing: border-box;
}

.landing-cta-stack {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

.landing-cta-footnote {
  margin-top: 12px;
  margin-bottom: 0;
  max-width: 52rem;
}

.landing-guest-text,
.landing-btn-text {
  font-size: 19pt;
}

.landing-btn-text {
  font-weight: 600;
}

.landing-bottom-cta .landing-start-btn {
  min-width: calc(12rem + 20pt);
  padding-left: calc(16px + 10pt) !important;
  padding-right: calc(16px + 10pt) !important;
}
.landing-guest-text-secondary {
  font-size: 15pt;
  opacity: 0.92;
}
.landing-main-disclaimer {
  transform: translateY(-20pt);
}

.landing-guest-text {
  max-width: 1280px;
  margin-left: auto;
  margin-right: auto;
  line-height: 1.45;
  white-space: normal;
  color: rgba(255, 255, 255, 0.95);
}
</style>

<script>
  import router from '../../router'

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
        this.$store.commit('setGuest')
        router.push('/dashboard')
      },
    },
  }
</script>
