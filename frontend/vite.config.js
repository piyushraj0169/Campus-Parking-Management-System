import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const envPath = path.resolve(process.cwd(), '.env');
  let apiKey = '';

  if (fs.existsSync(envPath)) {
    const fileContent = fs.readFileSync(envPath, 'utf-8');
    const match = fileContent.match(/VITE_RAZORPAY_KEY_ID=(.*)/);
    if (match) {
      apiKey = match[1].trim();
    }
  }

  // Debug Removed - Assuming clean file now

  return {
    plugins: [react()],
    server: {
      host: true
    },
    define: {
      'import.meta.env.VITE_RAZORPAY_KEY_ID': JSON.stringify(apiKey || process.env.VITE_RAZORPAY_KEY_ID || '')
    }
  }
})
