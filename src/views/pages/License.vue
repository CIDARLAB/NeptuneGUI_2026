<template>
  <v-container
    id="license"
    class="fill-height justify-center"
    tag="section"
  >
    <v-row justify="center" align="center">
      <v-col cols="12" md="8" class="text-center">
        <v-slide-y-transition appear>
          <v-img
            :src="require('@/assets/Neptune2026_logo_black_text.png')"
            height="120px"
            contain
            class="mx-auto mb-6"
          />
        </v-slide-y-transition>
        <h1 class="text-h4 font-weight-light mb-4">License</h1>
        <p class="text-h6 font-weight-regular mb-2">BSD-3-Clause</p>
        <p class="body-1 grey--text text--darken-1">
          Copyright (c) 2026, CIDAR LAB<br>
          All rights reserved.
        </p>
        <v-btn
          color="primary"
          class="mt-6"
          to="/"
        >
          Back to Home
        </v-btn>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
  export default {
    name: 'License',
  }
</script>
