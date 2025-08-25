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
        profile: resolve(__dirname, 'profile.html'),
        help: resolve(__dirname, 'help.html'),
        'verify-email': resolve(__dirname, 'verify-email.html'),
        'reset-password': resolve(__dirname, 'reset-password.html'),
        // Pages directory
        contributors: resolve(__dirname, 'pages/contributors.html'),
        terms: resolve(__dirname, 'pages/terms.html'),
        privacy: resolve(__dirname, 'pages/privacy.html'),
        'data-protection': resolve(__dirname, 'pages/data-protection.html'),
        cookies: resolve(__dirname, 'pages/cookies.html'),
      },
    },
  },
})

