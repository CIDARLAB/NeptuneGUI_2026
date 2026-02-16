<template>
  <v-footer
    id="pages-core-footer"
    absolute
    color="transparent"
    dark
  >
    <v-container>
      <v-row
        align="center"
        no-gutters
      >
        <v-col
          v-for="(link, i) in links"
          :key="i"
          class="text-center"
          cols="6"
          md="auto"
        >
          <router-link
            v-if="link.to"
            :to="link.to"
            class="mr-0 footer-link"
          >
            {{ link.text }}
          </router-link>
          <a
            v-else
            :href="link.href"
            class="mr-0 footer-link"
            rel="noopener"
            target="_blank"
            v-text="link.text"
          />
        </v-col>

        <v-spacer class="hidden-sm-and-down" />

        <v-col
          cols="12"
          md="auto"
        >
          <div class="body-1 font-weight-light pt-6 pt-md-0 text-center">
            &copy; 2026, CIDAR Lab
          </div>
        </v-col>
      </v-row>
    </v-container>
  </v-footer>
</template>

<script>
  export default {
    name: 'PagesCoreFooter',

    data: () => ({
      links: [
        { href: 'http://cidarlab.org', text: 'CIDAR Lab' },
        { href: 'https://github.com/CIDARLAB/Neptune_2026/blob/main/README.md', text: 'About' },
        { href: 'https://github.com/CIDARLAB/NeptuneGUI_2026', text: 'GitHub' },
        { to: '/license', text: 'Licenses' },
      ],
    }),
  }
</script>

<style lang="sass">
  #pages-core-footer
    a.footer-link, .footer-link
      color: #FFFFFF
      font-size: .825rem
      font-weight: 500
      text-decoration: none
      text-transform: uppercase
</style>
