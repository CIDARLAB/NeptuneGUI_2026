<template>
  <base-material-card
    class="v-card--material-chart"
    v-bind="$attrs"
    v-on="$listeners"
    :icon="icon"
  >
    <template v-slot:heading>
      <div
        class="workspace-chart-heading-name font-weight-light"
        :title="name"
      >
        {{ name || 'Workspace' }}
      </div>
    </template>

    <slot />

    <slot
      slot="actions"
      name="actions"
    />
  </base-material-card>
</template>

<script>
  export default {
    name: 'MaterialChartCard',

    inheritAttrs: false,

    props: {
      data: {
        type: Object,
        default: () => ({}),
      },
      eventHandlers: {
        type: Array,
        default: () => ([]),
      },
      options: {
        type: Object,
        default: () => ({}),
      },
      ratio: {
        type: String,
        default: undefined,
      },
      responsiveOptions: {
        type: Array,
        default: () => ([]),
      },
      type: {
        type: String,
        required: true,
        validator: v => ['Bar', 'Line', 'Pie'].includes(v),
      },
      name: {
        type: String,
        default: undefined,
      },
      id: {
        type: String,
        default: undefined
      },
      icon: {
        type: String,
        required: false,
      },
    },
  }
</script>

<style lang="sass">
  .v-card--material-chart
    p
      color: #999

    .workspace-chart-heading-name
      display: block
      width: 100%
      box-sizing: border-box
      min-height: 64px
      padding: 12px 14px
      font-size: calc(1rem + 2pt + 5pt + 2pt)
      line-height: 1.4
      word-break: break-word
      overflow-wrap: anywhere
      text-align: left
      overflow: visible

    .v-card--material__heading
      max-height: none !important
      min-height: 72px
      height: auto !important
      overflow: visible !important

      .ct-label
        color: inherit
        opacity: .7
        font-size: 0.975rem
        font-weight: 100

      .ct-grid
        stroke: rgba(255, 255, 255, 0.2)

      .ct-series-a .ct-point,
      .ct-series-a .ct-line,
      .ct-series-a .ct-bar,
      .ct-series-a .ct-slice-donut
          stroke: rgba(255,255,255,.8)

      .ct-series-a .ct-slice-pie,
      .ct-series-a .ct-area
          fill: rgba(255,255,255,.4)
</style>
