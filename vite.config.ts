import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Lets the build read the Supabase values Vercel's integration provides
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
})
