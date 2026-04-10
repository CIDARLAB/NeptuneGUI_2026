<template>
  <v-container fluid class="prompt-steps-page pa-6">
    <div class="prompt-steps-toolbar mb-4">
      <v-btn
        text
        class="prompt-steps-back"
        @click="goBack"
      >
        <v-icon left>mdi-arrow-left</v-icon>
        Back
      </v-btn>
    </div>

    <v-alert
      v-if="loadError"
      type="error"
      dense
      outlined
      class="mb-4"
    >
      {{ loadError }}
    </v-alert>

    <v-progress-linear
      v-else-if="loading"
      indeterminate
      color="primary"
      class="mb-4"
    />

    <v-card
      v-else
      class="prompt-steps-card pa-6"
      outlined
    >
      <div
        class="prompt-steps-markdown"
        v-html="html"
      />
    </v-card>
  </v-container>
</template>

<script>
  import { marked } from 'marked'
  /* Bundled at compile time — avoids dev-server SPA fallback serving index.html for /prompt/Steps.md */
  import stepsMarkdownRaw from '!!raw-loader!../../Prompt/Steps.md'

  export default {
    name: 'PromptStepsPage',

    data () {
      return {
        html: '',
        loading: true,
        loadError: '',
      }
    },

    created () {
      this.renderBundledGuide()
    },

    methods: {
      stepsMarkdownString () {
        const r = stepsMarkdownRaw
        if (typeof r === 'string') return r
        return (r && r.default) ? r.default : ''
      },
      renderBundledGuide () {
        this.loading = true
        this.loadError = ''
        try {
          const md = this.stepsMarkdownString()
          if (!md || !String(md).trim()) {
            throw new Error('Steps.md is empty.')
          }
          this.html = marked.parse(String(md))
        } catch (e) {
          console.error(e)
          this.loadError = (e && e.message) ? e.message : 'Failed to render the guide.'
          this.html = ''
        } finally {
          this.loading = false
        }
      },
      goBack () {
        if (window.history.length > 1) {
          this.$router.go(-1)
          return
        }
        this.$router.push({ name: 'Editor' }).catch(() => {})
      },
    },
  }
</script>

<style scoped>
.prompt-steps-page {
  max-width: 920px;
  margin: 0 auto;
}

.prompt-steps-back {
  text-transform: none;
  letter-spacing: normal;
  font-size: 12pt;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.87) !important;
}

.theme--dark .prompt-steps-back {
  color: rgba(255, 255, 255, 0.87) !important;
}

.prompt-steps-card {
  background: #fff;
}

.theme--dark .prompt-steps-card {
  background: rgba(255, 255, 255, 0.05);
}
</style>

<style scoped>
/* Markdown body: readable defaults; body text black / light on dark */
.prompt-steps-markdown ::v-deep h1 {
  font-size: 1.75rem;
  font-weight: 600;
  margin: 0 0 1rem;
  color: rgba(0, 0, 0, 0.87);
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  padding-bottom: 0.5rem;
}

.prompt-steps-markdown ::v-deep h2 {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 1.5rem 0 0.75rem;
  color: rgba(0, 0, 0, 0.87);
}

.prompt-steps-markdown ::v-deep p,
.prompt-steps-markdown ::v-deep li {
  font-size: 12pt;
  line-height: 1.5;
  color: rgba(0, 0, 0, 0.87);
}

.prompt-steps-markdown ::v-deep ul,
.prompt-steps-markdown ::v-deep ol {
  margin: 0.5rem 0 1rem 1.25rem;
}

.prompt-steps-markdown ::v-deep code {
  font-size: 0.95em;
  padding: 0.1em 0.35em;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.06);
  color: rgba(0, 0, 0, 0.87);
}

.prompt-steps-markdown ::v-deep pre {
  padding: 12px 14px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.06);
  overflow: auto;
  margin: 0.75rem 0 1rem;
}

.prompt-steps-markdown ::v-deep pre code {
  padding: 0;
  background: transparent;
  font-size: 11pt;
  line-height: 1.45;
}

.prompt-steps-markdown ::v-deep a {
  color: #006994;
  text-decoration: underline;
}

.prompt-steps-markdown ::v-deep strong {
  font-weight: 600;
}

.theme--dark .prompt-steps-markdown ::v-deep h1,
.theme--dark .prompt-steps-markdown ::v-deep h2,
.theme--dark .prompt-steps-markdown ::v-deep p,
.theme--dark .prompt-steps-markdown ::v-deep li {
  color: rgba(255, 255, 255, 0.87);
}

.theme--dark .prompt-steps-markdown ::v-deep h1 {
  border-bottom-color: rgba(255, 255, 255, 0.12);
}

.theme--dark .prompt-steps-markdown ::v-deep code {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.9);
}

.theme--dark .prompt-steps-markdown ::v-deep pre {
  background: rgba(255, 255, 255, 0.08);
}

.theme--dark .prompt-steps-markdown ::v-deep a {
  color: #4dd0e1;
}
</style>
