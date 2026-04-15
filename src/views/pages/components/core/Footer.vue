<template>
  <v-footer
    id="pages-core-footer"
    absolute
    color="transparent"
    dark
  >
    <v-container
      fluid
      class="footer-container"
    >
      <v-row
        align="center"
        justify="start"
        no-gutters
        class="footer-row"
      >
        <v-col
          v-for="(link, i) in links"
          :key="i"
          class="text-left footer-link-col"
          cols="auto"
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
          <div class="body-1 font-weight-light pt-6 pt-md-0 text-left text-md-right footer-copyright">
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
    width: 100%
    box-sizing: border-box
    padding-left: 20pt
    padding-right: 20pt
    .footer-container
      max-width: 1280px
      margin-left: auto
      margin-right: auto
      width: 100%
    .footer-row
      width: 100%
      justify-content: flex-start
    .footer-link-col
      padding-right: 16px
    a, a.footer-link, .footer-link
      color: #FFFFFF !important
      font-size: 12pt !important
      font-weight: 500
      text-decoration: none
      text-transform: uppercase
    .body-1, .footer-copyright
      font-size: 12pt !important
</style>
