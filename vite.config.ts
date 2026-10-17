import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Lets the build read the Supabase values Vercel's integration provides
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
  build: {
    rolldownOptions: {
      output: {
        // The big libraries go in files of their own. They rarely change, so a returning player's browser keeps
        // them cached and only downloads the game's own (much smaller) code after an update.
        codeSplitting: {
          groups: [
            { name: 'three', test: /node_modules[\\/](three|three-stdlib|@react-three|troika|camera-controls|maath|meshline|stats)/ },
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler|motion|framer-motion|motion-dom|motion-utils)[\\/]/ },
            { name: 'supabase', test: /node_modules[\\/]@supabase/ },
            { name: 'vendor', test: /node_modules/ },
          ],
        },
      },
    },
  },
})
