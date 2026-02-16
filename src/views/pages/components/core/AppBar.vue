<template>
  <v-app-bar
    absolute
    color="transparent"
    flat
    height="85"
  >
    <v-container class="px-0 d-flex align-center">
      <v-toolbar-title
        v-if="title"
        class="font-weight-light hidden-xs-only"
        v-text="title"
      />
      <v-spacer />
    </v-container>
  </v-app-bar>
</template>

<script>
  export default {
    name: 'PagesCoreAppBar',

    data: () => ({
      titles: {
        '/': '',
        '/login': '',
        '/register': 'Register',
        '/license': 'License',
      },
    }),

    computed: {
      title () {
        const path = this.$route.path
        return path in this.titles ? this.titles[path] : 'Neptune'
      },
    },
  }
</script>
