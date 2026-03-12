import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // Tailwind CSS v4 Vite plugin
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'), // Path alias for cleaner imports
    },
  },
})
