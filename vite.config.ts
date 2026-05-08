import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import webExtension from "vite-plugin-web-extension";

export default defineConfig({
  plugins: [
    react(),
    webExtension({
      manifest: "manifest.json",
      watchFilePaths: ["manifest.json"],
      additionalInputs: [
        "src/popup/index.html",
        "src/options/index.html"
      ],
    }),
  ],
  base: "./",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    minify: false,
    sourcemap: false,
  },
});
