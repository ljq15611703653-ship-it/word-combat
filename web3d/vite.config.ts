import { defineConfig } from "vite";
// 多页面：原型 index.html + 新手教程 campaign.html
export default defineConfig({
  build: { rollupOptions: { input: { main: "index.html", campaign: "campaign.html" } } },
});
