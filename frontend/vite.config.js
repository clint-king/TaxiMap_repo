import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        // Home pages
        main: resolve(__dirname, 'index.html'),
        preview: resolve(__dirname, 'pages/home/preview.html'),
        
        // Authentication pages
        login: resolve(__dirname, 'pages/authentication/login.html'),
        signup: resolve(__dirname, 'pages/authentication/signup.html'),
        'verify-email': resolve(__dirname, 'pages/authentication/verify-email.html'),
        'reset-password': resolve(__dirname, 'pages/authentication/reset-password.html'),
        profile: resolve(__dirname, 'pages/authentication/profile.html'),
        'route-suggestion': resolve(__dirname, 'pages/customer/route-suggestion.html'),
        
        // Customer pages
        client: resolve(__dirname, 'pages/customer/client.html'),
        'clientCrowdSource': resolve(__dirname, 'pages/customer/clientCrowdSource.html'),
        help: resolve(__dirname, 'pages/customer/help.html'),
        feedback: resolve(__dirname, 'pages/customer/feedback.html'),
        'booking-trip-info': resolve(__dirname, 'pages/customer/booking-trip-info.html'),
        'booking-select-transport': resolve(__dirname, 'pages/customer/booking-select-transport.html'),
        'booking-confirmation': resolve(__dirname, 'pages/customer/booking-confirmation.html'),
        'booking-edit-locations': resolve(__dirname, 'pages/customer/booking-edit-locations.html'),
        'booking-passenger-info': resolve(__dirname, 'pages/customer/booking-passenger-info.html'),
        'booking-passenger-management': resolve(__dirname, 'pages/customer/booking-passenger-management.html'),
        'booking-payment': resolve(__dirname, 'pages/customer/booking-payment.html'),
        'booking-view-locations': resolve(__dirname, 'pages/customer/booking-view-locations.html'),
        'booking-type-selection': resolve(__dirname, 'pages/customer/booking-type-selection.html'),
        'booking-public': resolve(__dirname, 'pages/customer/booking-public.html'),
        'payment-link': resolve(__dirname, 'pages/customer/payment-link.html'),
        
        // Admin pages
        admin: resolve(__dirname, 'pages/admin/admin.html'),
        'admin-reports': resolve(__dirname, 'pages/admin/admin-reports.html'),
        'admin-pending': resolve(__dirname, 'pages/admin/admin-pending.html'),
        'admin-contributors': resolve(__dirname, 'pages/admin/admin-contributors.html'),
        'admin-feedback': resolve(__dirname, 'pages/admin/admin-feedback.html'),
        
        // Owner pages
        'owner-dashboard': resolve(__dirname, 'pages/Owner/owner-dashboard.html'),
        'owner-vehicle-post': resolve(__dirname, 'pages/Owner/owner-vehicle-post.html'),
        'owner-portal': resolve(__dirname, 'pages/Owner/owner-portal.html'),
        'owner-booking-notification': resolve(__dirname, 'pages/Owner/owner-booking-notification.html'),
        'owner-analytics': resolve(__dirname, 'pages/Owner/owner-analytics.html'),
        
        // Other pages
        popup: resolve(__dirname, 'popup.html'),
        contributors: resolve(__dirname, 'pages/home/contributors.html'),
        terms: resolve(__dirname, 'pages/home/terms.html'),
        privacy: resolve(__dirname, 'pages/home/privacy.html'),
        'data-protection': resolve(__dirname, 'pages/home/data-protection.html'),
        cookies: resolve(__dirname, 'pages/home/cookies.html'),
      },
    },
  },
})

