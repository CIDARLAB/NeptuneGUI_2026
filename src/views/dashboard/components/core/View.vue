<template>
  <v-content class="dashboard-core-view-content">
    <v-container fluid class="pa-0 dashboard-core-view-layout">
      <v-row no-gutters>
        <v-col :cols="chatVisible ? 8 : 12" class="dashboard-main-col">
          <div class="dashboard-main-router">
            <router-view />
          </div>
        </v-col>

        <v-col
          v-if="chatVisible"
          cols="4"
          class="agent-panel-col pa-0"
        >
          <div class="agent-panel-stack d-flex flex-column">
            <div class="agent-panel-header pa-4 pb-2">
              <div class="agent-panel-title neptune-page-title-match">
                LLM prompts
              </div>
              <div class="agent-panel-subtitle">
                <span class="agent-panel-subtitle-text">
                  Download the prompt pack, paste
                  <code>en2lfr_system.txt</code>
                  (or the System section in the
                  <code>.md</code>
                  pack) into your LLM once, describe your device in chat, then paste the generated
                  <span class="agent-panel-keep-together">LFR</span>
                  into the
                  <span class="agent-panel-keep-together">Editor</span>.
                </span>
              </div>
            </div>

            <v-divider class="agent-panel-divider" />

            <div class="agent-panel-body flex-grow-1 pa-4 pt-3">
              <v-select
                v-model="selectedModel"
                :items="llmModels"
                item-text="label"
                return-object
                outlined
                hide-details
                label="Model"
                color="primary"
                class="mb-3 agent-panel-model-select"
                :menu-props="{ contentClass: 'agent-panel-model-select-menu' }"
              />

              <v-alert
                v-if="usesMarkdownExport"
                dense
                outlined
                type="info"
                class="agent-panel-format-alert mb-3"
              >
                <strong>{{ selectedModel.label }}</strong>
                does not accept
                <code>.zip</code>
                uploads. Neptune exports this prompt package as a single
                <strong>.md</strong>
                file instead.
              </v-alert>

              <ol class="agent-panel-steps mb-3 pl-0">
                <li>
                  <strong>Export</strong>
                  the prompt package as
                  <strong>{{ exportFormatLabel }}</strong>
                  for your model
                  <template v-if="usesMarkdownExport">
                    (one Markdown file you can upload or open and copy from).
                  </template>
                  <template v-else>
                    (includes
                    <code>START_HERE.md</code>).
                  </template>
                </li>
                <li>
                  <strong>One-time setup:</strong>
                  paste
                  <code>en2lfr_system</code>
                  into that LLM’s system / custom instructions. No need to edit template files.
                </li>
                <li>
                  <strong>Chat:</strong>
                  write your design requirement in plain English in the message.
                </li>
                <li>
                  <strong>Paste</strong>
                  the returned
                  <code>```lfr</code>
                  block here and
                  <strong>Compile</strong>.
                </li>
              </ol>

              <p class="agent-panel-hint mb-3">
                Full guide:
                <router-link
                  :to="{ name: 'PromptSteps' }"
                  class="agent-panel-steps-link"
                >Prompt user guide</router-link>.
                LFR/MINT syntax references:
                <router-link
                  :to="{ name: 'References' }"
                  class="agent-panel-steps-link"
                >References</router-link>.
              </p>

              <div class="agent-panel-actions d-flex flex-column align-stretch">
                <v-btn
                  color="success"
                  depressed
                  small
                  block
                  class="agent-panel-export-btn mb-2"
                  :loading="packDownloading"
                  :disabled="packDownloading"
                  @click="exportPromptPackage"
                >
                  <v-icon
                    left
                    small
                    color="white"
                  >
                    mdi-download
                  </v-icon>
                  <span>{{ exportButtonLabel }}</span>
                </v-btn>

                <v-btn
                  color="primary"
                  depressed
                  small
                  block
                  class="agent-panel-export-btn mb-2"
                  @click="openExternalAgent"
                >
                  <v-icon left small>mdi-open-in-new</v-icon>
                  <span>Open {{ selectedModel.label }} chat</span>
                </v-btn>

              </div>
            </div>
          </div>
        </v-col>
      </v-row>
    </v-container>
  </v-content>
</template>

<script>
  import JSZip from 'jszip'

  const PROMPT_FILE_NAMES = [
    'manifest.json',
    'en2lfr_system.txt',
    'en2lfr_user_template.txt',
    'lfr2en_system.txt',
    'lfr2en_user_template.txt',
    'README.txt',
  ]

  const SUPPORT_DOC_FILE_NAMES = [
    'LFR_SYNTAX_MANUAL.txt',
    'MINT_SYNTAX_MANUAL.txt',
    'DEVELOPER_ENTRY_POINTS.txt',
    'START_HERE.md',
  ]

  /* Alphabetical by label.
   * exportFormat: 'zip' for providers that accept archives;
   * 'md' for Qwen/DeepSeek (chat UIs do not support .zip uploads). */
  const LLM_MODELS = [
    { id: 'claude', label: 'Claude', folder: 'anthropic', agentUrl: 'https://claude.ai/', exportFormat: 'zip' },
    { id: 'deepseek', label: 'DeepSeek', folder: 'deepseek', agentUrl: 'https://chat.deepseek.com/', exportFormat: 'md' },
    { id: 'gemini', label: 'Gemini', folder: 'google_gemini', agentUrl: 'https://gemini.google.com/', exportFormat: 'zip' },
    { id: 'gpt', label: 'GPT', folder: 'openai', agentUrl: 'https://chatgpt.com/', exportFormat: 'zip' },
    { id: 'qwen', label: 'Qwen', folder: 'alibaba_qwen', agentUrl: 'https://chat.qwen.ai/', exportFormat: 'md' },
  ]

  export default {
    name: 'DashboardCoreView',

    components: {
      DashboardCoreFooter: () => import('./Footer'),
    },

    data () {
      return {
        llmModels: LLM_MODELS,
        selectedModel: LLM_MODELS[0], /* Claude — first alphabetically */
        packDownloading: false,
      }
    },

    computed: {
      chatVisible () {
        return this.$route && this.$route.name === 'Editor'
      },
      usesMarkdownExport () {
        return this.selectedModel && this.selectedModel.exportFormat === 'md'
      },
      exportFormatLabel () {
        return this.usesMarkdownExport ? '.md' : '.zip'
      },
      exportButtonLabel () {
        if (this.packDownloading) {
          return this.usesMarkdownExport ? 'Preparing Markdown…' : 'Preparing zip…'
        }
        return this.usesMarkdownExport
          ? 'Export prompt package (.md)'
          : 'Export prompt package (.zip)'
      },
    },

    methods: {
      promptBasePath () {
        const base = (process.env.BASE_URL || '/').replace(/\/?$/, '/')
        return `${base}prompt`
      },
      async fetchText (url) {
        const res = await fetch(url)
        if (!res.ok) return null
        return res.text()
      },
      async fetchGuideForZip (root) {
        const guideCandidates = ['USER_GUIDE.md', 'Steps.md']
        for (const name of guideCandidates) {
          const text = await this.fetchText(`${root}/${name}`)
          if (text != null) {
            return { name: 'USER_GUIDE.md', text }
          }
        }
        return null
      },
      downloadBlob (blob, filename) {
        const objectUrl = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = objectUrl
        a.download = filename
        a.rel = 'noopener'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(objectUrl)
      },
      async exportPromptPackage () {
        const folder = this.selectedModel && this.selectedModel.folder
        if (!folder || this.packDownloading) return
        this.packDownloading = true
        try {
          if (this.usesMarkdownExport) {
            await this.exportPromptMarkdown(folder)
          } else {
            await this.exportPromptZip(folder)
          }
        } catch (err) {
          console.error(err)
          window.alert(
            err && err.message
              ? err.message
              : 'Failed to build the prompt package. Rebuild the app and ensure src/Prompt files are present.'
          )
        } finally {
          this.packDownloading = false
        }
      },
      async exportPromptZip (folder) {
        const zip = new JSZip()
        const root = this.promptBasePath()
        for (const name of PROMPT_FILE_NAMES) {
          const text = await this.fetchText(`${root}/${folder}/${name}`)
          if (text == null) {
            throw new Error(`Could not load ${folder}/${name}`)
          }
          zip.file(`${folder}/${name}`, text)
        }
        for (const name of SUPPORT_DOC_FILE_NAMES) {
          const text = await this.fetchText(`${root}/${name}`)
          if (text == null) continue
          zip.file(name, text)
        }
        const guideFile = await this.fetchGuideForZip(root)
        if (guideFile) {
          zip.file(guideFile.name, guideFile.text)
        }
        const blob = await zip.generateAsync({ type: 'blob' })
        this.downloadBlob(blob, `${folder}-neptune-prompts.zip`)
      },
      async exportPromptMarkdown (folder) {
        const root = this.promptBasePath()
        const label = this.selectedModel.label
        const required = [
          ['en2lfr_system.txt', 'System instructions — English → LFR (paste into system / custom instructions)'],
          ['lfr2en_system.txt', 'System instructions — LFR → English (optional)'],
          ['README.txt', 'Provider setup note'],
          ['en2lfr_user_template.txt', 'Optional example only — English → LFR (do not edit to use the package)'],
          ['lfr2en_user_template.txt', 'Optional example only — LFR → English (do not edit to use the package)'],
        ]
        const optional = [
          ['LFR_SYNTAX_MANUAL.txt', 'LFR syntax manual'],
          ['MINT_SYNTAX_MANUAL.txt', 'MINT syntax manual'],
          ['DEVELOPER_ENTRY_POINTS.txt', 'Developer entry points'],
          ['START_HERE.md', 'Start here'],
          ['USER_GUIDE.md', 'User guide'],
        ]

        const parts = []
        parts.push(`# Neptune Prompt Package — ${label}`)
        parts.push('')
        parts.push(`> **Why Markdown?** ${label} chat does not accept \`.zip\` uploads.`)
        parts.push('> This single \`.md\` file is the full prompt package for this provider.')
        parts.push('')
        parts.push('## How to use')
        parts.push('')
        parts.push('1. Upload this Markdown file to your chat (if the product accepts `.md`), **or** open it and copy sections.')
        parts.push('2. Paste the **English → LFR** system section into system / custom / project instructions.')
        parts.push('3. In chat, write your design requirement in plain English — do not edit template placeholders.')
        parts.push('4. Copy the returned ` ```lfr ` block into Neptune Editor and Compile.')
        parts.push('')
        parts.push('Source folder in this repo: `' + folder + '/`.')
        parts.push('')

        for (const [name, title] of required) {
          const text = await this.fetchText(`${root}/${folder}/${name}`)
          if (text == null) {
            throw new Error(`Could not load ${folder}/${name}`)
          }
          parts.push(`## ${title}`)
          parts.push('')
          parts.push(`<!-- source: ${folder}/${name} -->`)
          parts.push('')
          parts.push('```text')
          parts.push(text.replace(/\r\n/g, '\n').replace(/\s+$/, ''))
          parts.push('```')
          parts.push('')
        }

        const sharedNames = new Set([
          'LFR_SYNTAX_MANUAL.txt',
          'MINT_SYNTAX_MANUAL.txt',
          'DEVELOPER_ENTRY_POINTS.txt',
          'START_HERE.md',
          'USER_GUIDE.md',
        ])
        for (const [name, title] of optional) {
          const url = sharedNames.has(name) ? `${root}/${name}` : `${root}/${folder}/${name}`
          const text = await this.fetchText(url)
          if (text == null) continue
          parts.push(`## ${title}`)
          parts.push('')
          parts.push(`<!-- source: ${name} -->`)
          parts.push('')
          parts.push('```text')
          parts.push(text.replace(/\r\n/g, '\n').replace(/\s+$/, ''))
          parts.push('```')
          parts.push('')
        }

        const markdown = parts.join('\n')
        const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
        this.downloadBlob(blob, `${folder}-neptune-prompts.md`)
      },
      openExternalAgent () {
        const url = this.selectedModel && this.selectedModel.agentUrl
        if (!url) return
        window.open(url, '_blank', 'noopener,noreferrer')
      },
    },
  }
</script>

<style scoped>
.dashboard-core-view-content {
  flex: 1 1 auto;
  min-width: 0;
  width: 100%;
}

.dashboard-core-view-layout {
  height: 100%;
}

.dashboard-main-col,
.dashboard-main-router {
  height: 100%;
}

.agent-panel-col {
  padding-top: 0 !important;
}

.agent-panel-stack {
  height: 100%;
  min-height: 0;
  background: transparent;
  border-left: 1px solid rgba(0, 51, 73, 0.12);
}

.agent-panel-divider {
  opacity: 0.55;
}

.agent-panel-header {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.agent-panel-title {
  margin-bottom: 6px;
}

.agent-panel-subtitle {
  font-size: var(--neptune-fs-label, 13.25pt);
  opacity: 0.88;
  line-height: 1.45;
  font-weight: 500;
}

.agent-panel-subtitle code {
  font-size: 0.92em;
  padding: 0.05em 0.25em;
  border-radius: 3px;
  background: rgba(0, 0, 0, 0.06);
}

.theme--dark .agent-panel-subtitle code {
  background: rgba(255, 255, 255, 0.08);
}

.agent-panel-format-alert {
  font-size: var(--neptune-fs-label, 13.25pt) !important;
  line-height: 1.4;
}

.agent-panel-format-alert code {
  font-size: 0.92em;
}

.agent-panel-steps {
  list-style: none;
  counter-reset: agent-step;
  margin: 0;
}

.agent-panel-steps li {
  counter-increment: agent-step;
  position: relative;
  padding-left: 1.75rem;
  margin-bottom: 0.55rem;
  font-size: var(--neptune-fs-body, 14pt);
  font-weight: 500;
  line-height: 1.45;
  color: rgba(0, 0, 0, 0.87);
}

.theme--dark .agent-panel-steps li {
  color: rgba(255, 255, 255, 0.87);
}

.agent-panel-steps li::before {
  content: counter(agent-step);
  position: absolute;
  left: 0;
  top: 0.05em;
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 50%;
  background: rgba(0, 105, 148, 0.12);
  color: #006994;
  font-size: 0.75em;
  font-weight: 700;
  line-height: 1.25rem;
  text-align: center;
}

.theme--dark .agent-panel-steps li::before {
  background: rgba(0, 172, 193, 0.2);
  color: #00acc1;
}

.agent-panel-steps code {
  font-size: 0.92em;
  padding: 0.05em 0.25em;
  border-radius: 3px;
  background: rgba(0, 0, 0, 0.06);
}

.theme--dark .agent-panel-steps code {
  background: rgba(255, 255, 255, 0.08);
}

/* Avoid breaking words mid-token; keep “LFR” / “Editor” intact */
.agent-panel-subtitle-text {
  word-break: normal;
  overflow-wrap: break-word;
  hyphens: manual;
}

.agent-panel-keep-together {
  white-space: nowrap;
}

.agent-panel-body {
  overflow-y: auto;
  min-height: 0;
}

.agent-panel-hint {
  font-size: var(--neptune-fs-body, 14pt) !important;
  font-weight: 500;
  line-height: 1.45;
  color: rgba(0, 0, 0, 0.87) !important;
  margin: 0;
}

.theme--dark .agent-panel-hint {
  color: rgba(255, 255, 255, 0.87) !important;
}

.agent-panel-hint strong {
  font-weight: 600;
}

.agent-panel-hint code {
  font-size: 0.95em;
  color: rgba(0, 0, 0, 0.87);
  background: rgba(0, 0, 0, 0.06);
  padding: 0.05em 0.25em;
  border-radius: 3px;
}

.theme--dark .agent-panel-hint code {
  color: rgba(255, 255, 255, 0.9);
  background: rgba(255, 255, 255, 0.08);
}

.agent-panel-steps-link {
  text-decoration: underline;
  color: rgba(0, 0, 0, 0.87) !important;
  font-weight: 600;
}

.theme--dark .agent-panel-steps-link {
  color: rgba(255, 255, 255, 0.87) !important;
}

/* Match sidebar Export: 14pt, normal case (see Drawer.vue .drawer-export-rect-btn) */
.agent-panel-export-btn {
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.18) !important;
  font-size: var(--neptune-fs-body, 14pt) !important;
  font-weight: 500 !important;
  text-transform: none !important;
  letter-spacing: normal !important;
}

.agent-panel-export-btn ::v-deep .v-btn__content {
  font-size: var(--neptune-fs-body, 14pt) !important;
  font-weight: 500 !important;
  letter-spacing: normal !important;
}

.agent-panel-model-select ::v-deep label {
  font-size: var(--neptune-fs-label, 13.25pt) !important;
  font-weight: 600 !important;
  color: #9e9e9e !important;
}

.agent-panel-model-select ::v-deep .v-select__selection,
.agent-panel-model-select ::v-deep .v-select__selection--comma,
.agent-panel-model-select ::v-deep .v-input__slot input {
  font-size: var(--neptune-fs-body, 14pt) !important;
  font-weight: 600 !important;
  color: #006994 !important;
  line-height: 1.35 !important;
}

.theme--dark .agent-panel-model-select ::v-deep .v-select__selection,
.theme--dark .agent-panel-model-select ::v-deep .v-select__selection--comma,
.theme--dark .agent-panel-model-select ::v-deep .v-input__slot input {
  color: #00acc1 !important;
}
</style>

<style>
/* Menu is portaled; match Editor script-language dropdown */
.agent-panel-model-select-menu .v-list-item,
.agent-panel-model-select-menu .v-list-item__title {
  font-size: var(--neptune-fs-body, 14pt) !important;
  font-weight: 600 !important;
  color: #006994 !important;
}

.theme--dark .agent-panel-model-select-menu .v-list-item,
.theme--dark .agent-panel-model-select-menu .v-list-item__title {
  color: #00acc1 !important;
}
</style>
