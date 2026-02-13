<template>
  <v-container
    id="grid"
    fluid
    tag="section"
  >
    <v-row>

      <v-col
        cols="12"
        sm="9"
        class="pt-0"
      >
        <v-btn color="success" v-on:click="savefile"><v-icon small left light>mdi-content-save</v-icon> Save</v-btn>
        <v-btn color="info" v-on:click="savefile(), compiledialog = true"><v-icon small left light>mdi-play</v-icon> Save and Compile</v-btn>
        <v-btn color="error" v-on:click="deletefile"><v-icon small left light>mdi-delete</v-icon> Delete</v-btn>
        <v-btn color="secondary" v-on:click="downloadfile"><v-icon small left light>mdi-cloud-download</v-icon> Download</v-btn>
        <v-btn color="secondary" v-on:click="uploadfile"><v-icon small left light>mdi-cloud-upload</v-icon> Upload</v-btn>
            
      </v-col>
    </v-row>

    <v-row>

      <v-col
        cols="12"
        sm="8"
        class="pt-0"
      >
        <v-card class="mt-0">
          <v-progress-linear
            :indeterminate="isloading"
            :hidden="!isloading"
            color="blue darken-2"
          ></v-progress-linear>
          <v-list-item three-line>
            <v-list-item-content>
              <v-list-item-title class="headline mb-1" > <span v-text="fileobject.name"></span> </v-list-item-title>
              <v-list-item-subtitle>Workspace: <span v-text="currentworkspace.name"></span></v-list-item-subtitle>
            </v-list-item-content>

            <!-- <v-list-item-avatar
              tile
              size="80"
              color="grey"
            ></v-list-item-avatar> -->
          </v-list-item>
          <v-card-text class="red--text text--darken-4">
            <MonacoEditor class="editor" v-model="code" language="javascript" />
          </v-card-text>
        </v-card>

      </v-col>
      <v-col
        cols="12"
        sm="4"
        class="pt-0"
      >
        <v-card class="mt-0">
          <v-card-text class="subtitle-1">
            Neptune Console
            <div id="terminal"></div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

  <v-dialog
          v-model="compiledialog"
          max-width="500px"
        >
        <v-card>
          <v-card-title>
            Compile
          </v-card-title>
          <v-card-text>
            <v-select
              :items="configfiles"
              label="Select Confg File"
              item-value="id"
              item-text="name"
              v-model="selectedconfig"
              :return-object="true"
            ></v-select>
          </v-card-text>
          <v-card-actions>
            <v-btn
              color="primary"
              text
              @click="compiledialog = false"
            >
              Close
            </v-btn>
            <v-btn
              color="info"
              text
              @click="compilefile"
            >
              Compile
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

  </v-container>

</template>      

<script>
import MonacoEditor from 'vue-monaco'
import VueTerminal from 'vue-terminal-ui'
import axios from 'axios'
import { Terminal } from 'xterm'
import router from '../../router'
import guestStore from '@/lib/guestStore'

const term = new Terminal();

export default {
  name: "Editor",
  components: {
    MonacoEditor,
    VueTerminal,
  },
  mounted: function () {
    term.open(document.getElementById('terminal'))
    term.setOption('fontSize', 10)

    let currentfile = this.$store.getters.currentFile
    this.currentworkspace = this.$store.getters.currentWorkspace
    if (currentfile == null || currentfile === '') return

    let self = this
    self.isloading = true

    if (this.$store.getters.isGuest && !this.$store.getters.isGuestViaServer) {
      const wid = this.currentworkspace && this.currentworkspace._id
      if (!wid) { self.isloading = false; return }
      const file = guestStore.getFile(wid, currentfile)
      if (file) {
        this.fileobject = { id: file.id, name: file.name, ext: file.ext }
        this.code = file.content || ''
      }
      self.isloading = false
      this.downloadconfigfiles()
      return
    }

    axios.get('/api/v1/file', { params: { id: currentfile } })
      .then((response) => { this.fileobject = response.data })
      .catch((error) => { console.log(error) })

    axios.get('/api/v1/fs', { params: { id: currentfile } })
      .then((response) => {
        self.isloading = false
        if (typeof response.data !== 'string') {
          alert('Cannot open file in default editor')
        } else {
          this.code = response.data
        }
      })
      .catch((error) => { console.log(error) })
           
            
    this.downloadconfigfiles()
    // axios.get('/api/v1/fs', config)
    //   .then((response) => {
    //     console.log(response)
    //     this.code = JSON.stringify(response.data)
    //   })
    //   .error((error) => {
    //     console.log(error)
    //   })
  },
  data() {
    return {
      isloading: false,
      selectedconfig: '',
      compiledialog: false,
      currentworkspace: {
        name:''
      },
      code: '',
      fileobject: {
        name: '',
        id: ''
      },
      configfiles: [],
      dialog: false,
      dialog2: false,
      dialog3: false,
      notifications: false,
      sound: true,
      widgets: false,
      select: [
        "State 1",
        "State 2",
        "State 3",
        "State 4",
        "State 5",
        "State 6",
        "State 7"
      ]
    };
  },
  sockets: {
    // //This signals the end of the output
    // socket.on('EOP', function(data){
    //     //TODO: Figure out how to close the monitoring
    //     editorViewModel.updateJobs();
    //     setTimeout(function() {
    //         //self.jobs()[0]
    //         editorViewModel.setAsCurrentJob(editorViewModel.currentJob());
    //     },1000);
    // });
    stdout: function(data){
      //console.log(data)
      term.write(data.replace(/\n/g, '\n\r'))

    },
  
    EOP: function(data){
      console.log(data)
      this.isloading = false
    }

  },
  methods: {
    downloadconfigfiles (event) {
      this.configfiles = []
      const ws = this.$store.getters.currentWorkspace
      if (!ws || !ws._id) return
      if (this.$store.getters.isGuest && !this.$store.getters.isGuestViaServer) {
        const files = guestStore.getFiles(ws._id) || []
        files.forEach(f => {
          const ext = (f.ext || '').toLowerCase()
          if (ext === '.ini' || ext === '.json') this.configfiles.push(f)
        })
        return
      }
      const config = {
        withCredentials: true,
        crossorigin: true,
        headers: { 'Content-Type': 'application/json' },
        params: { id: ws._id },
      }
      let self = this
      axios.get('/api/v1/files', config)
        .then((response) => {
          (response.data || []).forEach((fid) => {
            axios.get('/api/v1/file', { params: { id: fid }, withCredentials: true, headers: { 'Content-Type': 'application/json' } })
              .then((res) => {
                const ext = (res.data.ext || '').toLowerCase()
                if (ext === '.ini' || ext === '.json') self.configfiles.push(res.data)
              })
              .catch((error) => { console.log(error) })
          })
        })
        .catch((error) => { console.error(error) })
    },
    createfile: function(event) {
      console.log("TEST");
    },
    savefile () {
      let self = this
      if (this.$store.getters.isGuest && !this.$store.getters.isGuestViaServer) {
        const ws = this.$store.getters.currentWorkspace
        if (ws && ws._id && this.fileobject && this.fileobject.id) {
          guestStore.updateFile(ws._id, this.fileobject.id, this.code)
        }
        return
      }
      self.isloading = true
      const config = {
        withCredentials: true,
        crossorigin: true,
        headers: { 'Content-Type': 'application/json' },
      }
      axios.put('/api/v1/file', {
        fileid: this.fileobject.id,
        name: this.fileobject.name,
        text: this.code,
      }, config)
        .then(() => { self.isloading = false })
        .catch((error) => { console.log(error) })
    },
    compilefile (event) {
      if (this.$store.getters.isGuest) {
        alert('Compiling requires a registered account. Please log in to run the compiler.')
        return
      }
      let self = this
      self.isloading = true
      this.compiledialog = false
      const config = {
        withCredentials: true,
        crossorigin: true,
        headers: { 'Content-Type': 'application/json' },
      }
      const data = {
        sourcefileid: this.fileobject.id,
        sourcefilename: this.fileobject.name,
        configfileid: this.selectedconfig.id,
        configfilename: this.selectedconfig.name,
        workspace: this.$store.getters.currentWorkspace._id,
        user: this.$store.getters.currentUser.email,
      }
      const ext = this.fileobject.name.match(/\.[0-9a-z]+$/i) ? this.fileobject.name.match(/\.[0-9a-z]+$/i)[0] : ''
      let endpoint = ''
      if (ext === '.uf' || ext === '.mint') endpoint = '/api/v1/fluigi'
      else if (ext === '.lfr' || ext === '.v') endpoint = '/api/v1/mushroommapper'
      else { alert('Unknown File Type !'); return }
      axios.post(endpoint, data, config)
        .then((response) => {
          const jobid = response.data
          self.$socket.emit('monitor', jobid)
        })
        .catch((error) => { console.error(error) })
    },
    deletefile (event) {
      const fid = this.fileobject.id
      const wid = this.$store.getters.currentWorkspace && this.$store.getters.currentWorkspace._id
      if (this.$store.getters.isGuest && !this.$store.getters.isGuestViaServer) {
        if (wid) guestStore.deleteFile(wid, fid)
        router.push('/dashboard')
        return
      }
      const config = {
        data: { fileid: fid, workspaceid: wid },
        withCredentials: true,
        crossorigin: true,
        headers: { 'Content-Type': 'application/json' },
      }
      axios.delete('/api/v1/file', config)
        .then(() => { router.push('/dashboard') })
        .catch((error) => { console.log(error) })
    },
    downloadfile: function(event) {
      console.log("download the file");
      var fileurl = new URL("/api/v1/downloadFile?id=" + this.fileobject.id, document.baseURI);
      console.log('currentfile: ',this.fileobject.id);
      // window.open(fileurl, '_blank');
      let self = this
      axios({
        method: 'get',
        url: fileurl,
        responseType: 'arraybuffer'
      })
        .then(function(response) {
          //response.data.pipe(fs.createWriteStream('ada_lovelace.jpg'))
          const url = window.URL.createObjectURL(new Blob([response.data]))
          const link = document.createElement('a')
          link.href = url
          link.setAttribute('download', self.fileobject.name) //or any other extension
          document.body.appendChild(link)
          link.click()
      })
    },
    uploadfile: function(event){
      alert("Feature not yet implemented !")
    }
  }
}
</script>

<style>
.editor {
  height: 385px;
  width: 100%;
}

.terminal {
  width: 300px;
  height: 500px;
}

.fab-container {
  position: fixed;
  bottom: 0;
  right: 0;
}
</style>
