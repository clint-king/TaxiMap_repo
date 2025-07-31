import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        login: resolve(__dirname, 'login.html'),
        signup: resolve(__dirname, 'signup.html'),
        route: resolve(__dirname, 'route.html'),
        popup: resolve(__dirname, 'popup.html'),
        clientCrowdSource: resolve(__dirname, 'clientCrowdSource.html'),
        client: resolve(__dirname, 'client.html'),
        admin: resolve(__dirname, 'admin.html'),
      },
    },
  },
})

