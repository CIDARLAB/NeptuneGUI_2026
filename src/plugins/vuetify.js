import Vue from 'vue'
import Vuetify from 'vuetify/lib'
import i18n from '@/i18n'
import '@/sass/overrides.sass'

Vue.use(Vuetify)

// Neptune-style teal/blue
const theme = {
  primary: '#006994',
  secondary: '#00838F',
  accent: '#00ACC1',
  info: '#00CAE3',
  success: '#50C878',
  green: '#50C878', // align Material `green` with app accent green
  silverGrey: '#8d99a0', // cool silver grey to pair with primary
}

export default new Vuetify({
  lang: {
    t: (key, ...params) => i18n.t(key, params),
  },
  theme: {
    themes: {
      dark: theme,
      light: theme,
    },
  },
})
