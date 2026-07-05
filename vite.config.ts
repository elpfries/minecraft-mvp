import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  // Sous-chemin du dépôt sur GitHub Pages : https://elpfries.github.io/minecraft-mvp/
  // Sans ça, les assets seraient cherchés à la racine du domaine → page blanche.
  base: "/minecraft-mvp/",
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
});
