<template>
  <v-content class="dashboard-core-view-content">
    <v-container fluid class="pa-0 dashboard-core-view-layout">
      <v-row no-gutters>
        <v-col :cols="chatVisible ? 8 : 12">
          <router-view />
        </v-col>

        <!-- Right-side Chat Agent (static demo UI, Claude-style) -->
        <v-col
          v-if="chatVisible"
          cols="4"
          class="agent-chat-col"
        >
          <v-card class="agent-chat-card d-flex flex-column" outlined>
            <v-card-title class="agent-chat-header">
              <div class="agent-chat-title">
                Neptune Agent
              </div>
              <div class="agent-chat-subtitle">
                Natural language → LFR suggestions
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
                  <div class="agent-chat-message-role">
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
                class="ml-2"
                :disabled="!draft.trim()"
                @click="send"
              >
                Send
              </v-btn>
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
        messages: [
          {
            role: 'agent',
            text: 'Hi, I’m your Neptune Agent. Describe the fluidic behavior or module you want (in plain English), and I’ll suggest an LFR snippet you can paste into the Editor.',
          },
          {
            role: 'agent',
            text: 'For example: “Create a 3-layer device with finput A/B, mix for 10 cycles, then route to foutput OUT.”',
          },
        ],
      }
    },

    computed: {
      chatVisible () {
        // For now, show the agent sidebar only on the Editor page (name defined in router.js)
        return this.$route && this.$route.name === 'Editor'
      },
    },

    methods: {
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

.agent-chat-col {
  border-left: 1px solid rgba(0, 0, 0, 0.08);
}

.agent-chat-card {
  height: 100%;
  border-radius: 0;
}

.agent-chat-header {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.agent-chat-title {
  font-size: 16px;
  font-weight: 600;
}

.agent-chat-subtitle {
  font-size: 12px;
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
  font-size: 11px;
  font-weight: 600;
  opacity: 0.75;
  margin-bottom: 2px;
}

.agent-chat-message-text {
  font-size: 13px;
  white-space: pre-wrap;
  line-height: 1.4;
}

.agent-chat-actions {
  margin-top: 4px;
}

.agent-chat-input-row {
  align-items: flex-end;
  padding: 8px 12px;
}

.agent-chat-input {
  flex: 1 1 auto;
}
</style>
