<template>
  <div class="app-font-size-wrap">
    <router-view />
  </div>
</template>

<script>
  const FONT_SIZE_CLASSES = ['font-size-large', 'font-size-normal', 'font-size-small']

  export default {
    name: 'App',
    computed: {
      fontSize () {
        return this.$store.getters.fontSize || 'normal'
      },
    },
    watch: {
      fontSize: {
        immediate: true,
        handler (size) {
          const html = document.documentElement
          FONT_SIZE_CLASSES.forEach(c => html.classList.remove(c))
          html.classList.add(`font-size-${size}`)
        },
      },
    },
  }
</script>
