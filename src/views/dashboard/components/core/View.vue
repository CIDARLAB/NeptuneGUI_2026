<template>
  <v-content class="dashboard-core-view-content">
    <v-container fluid class="pa-0 dashboard-core-view-layout">
      <v-row no-gutters>
        <v-col :cols="chatVisible ? 8 : 12" class="dashboard-main-col">
          <div class="dashboard-main-router">
            <router-view />
          </div>
        </v-col>

        <!-- Right-side Chat Agent (static demo UI, Claude-style) -->
        <v-col
          v-if="chatVisible"
          cols="4"
          class="agent-chat-col pa-0"
        >
          <v-card class="agent-chat-card d-flex flex-column" outlined>
            <v-card-title class="agent-chat-header">
              <div class="agent-chat-title">
                Neptune Agent
              </div>
              <div class="agent-chat-subtitle">
                Natural language → LFR/MINT suggestions
              </div>
            </v-card-title>

            <v-divider />

            <v-card-text class="agent-chat-body flex-grow-1">
              <div class="agent-chat-messages">
                <div
                  v-for="(m, idx) in messages"
                  :key="idx"
                  :class="['agent-chat-message', m.role]"
                >
                  <div :class="['agent-chat-message-role', m.role]">
                    {{ m.role === 'user' ? 'You' : 'Neptune Agent' }}
                  </div>
                  <div class="agent-chat-message-text">
                    {{ m.text }}
                  </div>
                  <div
                    v-if="m.role === 'agent' && m.text"
                    class="agent-chat-actions"
                  >
                    <v-btn
                      x-small
                      text
                      color="primary"
                      @click="insertIntoEditor(m, 'lfr')"
                    >
                      Insert into Editor as LFR
                    </v-btn>
                    <v-btn
                      x-small
                      text
                      color="primary"
                      @click="insertIntoEditor(m, 'mint')"
                    >
                      Insert into Editor as MINT
                    </v-btn>
                  </div>
                </div>
              </div>
            </v-card-text>

            <v-divider />

            <v-card-actions class="agent-chat-input-row">
              <div v-if="selectionAttachment" class="agent-chat-attachment">
                <v-btn
                  x-small
                  outlined
                  color="primary"
                  class="agent-chat-attachment-btn"
                  @click="selectionExpanded = !selectionExpanded"
                >
                  Selected code ({{ (selectionAttachment.language || 'lfr').toUpperCase() }})
                  <v-icon right x-small>{{ selectionExpanded ? 'mdi-chevron-down' : 'mdi-chevron-right' }}</v-icon>
                </v-btn>
                <v-btn
                  x-small
                  text
                  color="primary"
                  class="ml-1"
                  @click="clearSelectionAttachment"
                >
                  Clear
                </v-btn>
                <div v-if="selectionExpanded" class="agent-chat-attachment-preview mt-2">
                  <pre class="agent-chat-attachment-pre">{{ selectionAttachment.text }}</pre>
                </div>
              </div>
              <div class="agent-chat-input-line">
                <v-textarea
                  v-model="draft"
                  auto-grow
                  rows="1"
                  placeholder="Describe what you want to build in LFR, e.g. 'a 3-layer microfluidic mixer with two inputs and one output...'"
                  class="agent-chat-input"
                  hide-details
                  outlined
                  dense
                  @keydown.enter.exact.prevent="send"
                />
                <v-btn
                  color="primary"
                  class="ml-2 agent-chat-send-btn"
                  :disabled="!draft.trim()"
                  @click="send"
                >
                  Send
                </v-btn>
              </div>
            </v-card-actions>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </v-content>
</template>

<script>
  export default {
    name: 'DashboardCoreView',

    components: {
      DashboardCoreFooter: () => import('./Footer'),
    },

    data () {
      return {
        draft: '',
        selectionAttachment: null,
        selectionExpanded: false,
        messages: [
          {
            role: 'agent',
            text: 'Hi, I’m your Neptune Agent. Describe the fluidic behavior or module you want (in plain English), and I’ll suggest an LFR or MINT snippet you can paste into the Editor.',
          },
          {
            role: 'agent',
            text: 'For example: “Create a 3-layer device with finput A/B, mix for 10 cycles, then route to foutput OUT in LFR, or generate an equivalent MINT flow.”',
          },
        ],
      }
    },

    mounted () {
      this.$root.$on('agent-set-selection', this.onAgentSelection)
    },
    beforeDestroy () {
      this.$root.$off('agent-set-selection', this.onAgentSelection)
    },

    computed: {
      chatVisible () {
        // For now, show the agent sidebar only on the Editor page (name defined in router.js)
        return this.$route && this.$route.name === 'Editor'
      },
    },

    methods: {
      onAgentSelection (payload) {
        if (!payload || !payload.text) return
        this.selectionAttachment = {
          text: String(payload.text),
          language: payload.language || 'lfr',
        }
        this.selectionExpanded = false
      },
      clearSelectionAttachment () {
        this.selectionAttachment = null
        this.selectionExpanded = false
        this.$root.$emit('agent-clear-selection')
      },
      insertIntoEditor (message, language) {
        if (!message || !message.text) return
        const payload = {
          code: message.text,
          language: language || 'lfr',
        }
        this.$root.$emit('agent-insert-into-editor', payload)
      },
      send () {
        const text = this.draft.trim()
        if (!text) return

        // Push user message
        this.messages.push({
          role: 'user',
          text,
        })
        this.draft = ''
        this.selectionAttachment = null
        this.selectionExpanded = false

        // Demo agent reply: placeholder until wired to real Qwen endpoint
        const demoReply = [
          'This is a demo reply. In your real setup, Neptune Agent would send this request to your local Qwen2.5-coder model,',
          'then return an LFR script that implements the behavior you described. You can then paste it into the Editor.',
        ].join(' ')

        this.messages.push({
          role: 'agent',
          text: demoReply,
        })
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

.agent-chat-col {
  padding-top: 0 !important;
}

.agent-chat-card {
  height: 100%;
  border-radius: 0;
  border-left: 1px solid rgba(0, 0, 0, 0.08);
}

.agent-chat-header {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.agent-chat-title {
  font-size: 20px;
  font-weight: 600;
}

.agent-chat-subtitle {
  font-size: 15px;
  opacity: 0.8;
}

.agent-chat-body {
  overflow-y: auto;
  padding-top: 8px;
}

.agent-chat-messages {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-right: 4px;
}

.agent-chat-message {
  max-width: 75%;
  padding: 8px 10px;
  border-radius: 10px;
  background-color: #f5f5f7;
}

.agent-chat-message.user {
  align-self: flex-end;
  background-color: #e3f2fd;
}

.agent-chat-message.agent {
  align-self: flex-start;
}

.agent-chat-message-role {
  font-size: 15px;
  font-weight: 600;
  opacity: 0.75;
  margin-bottom: 2px;
}

.agent-chat-message-role.agent {
  font-size: 17px;
  color: #0b3d91;
  opacity: 1;
}

.agent-chat-message-text {
  font-size: 15px;
  white-space: pre-wrap;
  line-height: 1.4;
}

.agent-chat-actions {
  margin-top: 4px;
}

.agent-chat-input-row {
  padding: 8px 12px;
  flex-direction: column;
  align-items: stretch;
}

.agent-chat-input {
  flex: 1 1 auto;
}

.agent-chat-input-line {
  display: flex;
  width: 100%;
  align-items: flex-end;
}

.agent-chat-send-btn {
  align-self: flex-end;
}

/* Match chat input readability to primary action button scale */
.agent-chat-input ::v-deep textarea {
  font-size: 15px;
  line-height: 1.4;
}

.agent-chat-attachment {
  margin-bottom: 8px;
}
.agent-chat-attachment-preview {
  background: #f5f5f7;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 8px;
  padding: 8px;
  max-height: 180px;
  overflow: auto;
}
.agent-chat-attachment-pre {
  margin: 0;
  font-size: 15px;
  line-height: 1.35;
  white-space: pre-wrap;
}

.agent-chat-actions ::v-deep .v-btn__content,
.agent-chat-attachment ::v-deep .v-btn__content,
.agent-chat-send-btn ::v-deep .v-btn__content {
  font-size: 15px;
}
</style>
