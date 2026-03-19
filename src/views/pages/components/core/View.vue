<template>
  <v-content
    id="pages"
    :class="$vuetify.theme.dark ? undefined : 'grey lighten-3'"
  >
    <v-img
      :class="{
        'v-image--sm': this.$vuetify.breakpoint.smAndDown,
        'v-image--md': this.$vuetify.breakpoint.mdAndDown
      }"
      :src="require(`@/assets/${src || 'cidar_uF.png'}`)"
      gradient="to top, rgba(0, 0, 0, .5), rgba(0, 0, 0, .5)"
      min-height="100%"
      max-height="100vh"
    >
      <v-responsive
        :style="styles"
        class="d-flex align-start pages-view-responsive"
      >
        <router-view />
      </v-responsive>
    </v-img>
  </v-content>
</template>

<script>
  export default {
    name: 'PagesCoreView',

    data: () => ({
      srcs: {
        '/': 'cidar_uF.png',
        '/login': 'cidar_uF.png',
        '/register': 'cidar_uF_2.png',
      },
    }),

    computed: {
      src () {
        return this.srcs[this.$route.path]
      },
      styles () {
        const paddingBottom = this.$vuetify.breakpoint.mdAndUp ? 80 : 60
        return {
          height: '100vh',
          boxSizing: 'border-box',
          padding: '15vh 0 ' + paddingBottom + 'px 0',
        }
      },
    },
  }
</script>
