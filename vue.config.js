module.exports = {
  // Disable ESLint during build to avoid eslint-plugin-vue / parser compatibility issues
  lintOnSave: false,

  // Deprecations: we fixed global built-ins (rgba→color) in our partials; import/legacy-js-api come from Vue CLI/Vuetify
  css: {
    loaderOptions: {
      sass: {
        sassOptions: {
          quietDeps: true,
          silenceDeprecations: ['import', 'legacy-js-api'],
        },
      },
      scss: {
        sassOptions: {
          quietDeps: true,
          silenceDeprecations: ['import', 'legacy-js-api'],
        },
      },
    },
  },

  configureWebpack: {
    devtool: 'source-map'
  },
  devServer: {
    port: 8081,
    disableHostCheck: true,
    // Proxy API and Socket to Neptune_2026 backend (run backend on port 8080 for local demo)
    proxy: {
      '/api': { target: 'http://localhost:8080', changeOrigin: true },
      '/socket.io': { target: 'http://localhost:3000', ws: true }
    }
  },

  transpileDependencies: ['vue-world-map', 'vuetify'],

  pluginOptions: {
    i18n: {
      locale: 'en',
      fallbackLocale: 'en',
      localeDir: 'locales',
      enableInSFC: false,
    },
  },
}
