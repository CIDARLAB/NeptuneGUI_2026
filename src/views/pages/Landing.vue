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
        <p class="mt-2 landing-guest-text">
          We do not provide online data storage. To keep your data across sessions, export your data (Workspaces + DIY components) using the Export button, then restore it later by importing that file.
        </p>
      </v-col>
    </v-row>

    <div class="landing-bottom-cta d-flex justify-center align-center">
      <v-btn class="ma-2 landing-start-btn" color="success" large @click="continueAsGuest">
        <span class="landing-btn-text">Start now!</span>
      </v-btn>
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
  transform: translateY(-40pt);
}

.landing-bottom-cta {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  bottom: calc(28px - 500pt + 20pt);
  z-index: 3;
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
