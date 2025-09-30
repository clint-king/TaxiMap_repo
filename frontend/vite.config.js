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
        'route-suggestion': resolve(__dirname, 'route-suggestion.html'),
        admin: resolve(__dirname, 'admin.html'),
        'admin-reports': resolve(__dirname, 'admin-reports.html'),
        'admin-pending': resolve(__dirname, 'admin-pending.html'),
        'admin-contributors': resolve(__dirname, 'admin-contributors.html'),
        'admin-feedback': resolve(__dirname, 'admin-feedback.html'),
        profile: resolve(__dirname, 'profile.html'),
        help: resolve(__dirname, 'help.html'),
        feedback: resolve(__dirname, 'feedback.html'),
        'booking-trip-info': resolve(__dirname, 'booking-trip-info.html'),
        'booking-select-transport': resolve(__dirname, 'booking-select-transport.html'),
        'owner-dashboard': resolve(__dirname, 'owner-dashboard.html'),
        'owner-vehicle-post': resolve(__dirname, 'owner-vehicle-post.html'),
        'owner-portal': resolve(__dirname, 'owner-portal.html'),
        'owner-booking-notification': resolve(__dirname, 'owner-booking-notification.html'),
        'owner-analytics': resolve(__dirname, 'owner-analytics.html'),
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

