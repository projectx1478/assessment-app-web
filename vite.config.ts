import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/analyzeAssignment": "http://localhost:8787",
      "/updateCriteria": "http://localhost:8787",
      "/importFile": "http://localhost:8787",
      "/grade": "http://localhost:8787",
      "/analyzeClass": "http://localhost:8787",
      "/usage": "http://localhost:8787",
    },
  },
});