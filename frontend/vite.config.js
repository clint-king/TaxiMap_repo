import { defineConfig } from 'vite';

export default defineConfig({
    build: {
        rollupOptions: {
            input: {
                main: 'client.html' // Change this to your desired file
            }
        }
    },
    server: {
        open: '/client.html'
    }
});
