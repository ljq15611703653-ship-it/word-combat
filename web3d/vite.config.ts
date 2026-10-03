import { defineConfig } from "vite";
import { resolve } from "node:path";

// 多页面：index.html 是单机原型，online.html 是局域网联机入口，campaign.html 是新手教程。
// 开发期（npm run dev:online）：Vite 热更新，/ws 代理到本机 8787 的联机服务（另开一个 npm run serve）。
export default defineConfig({
  server: { host: true, proxy: { "/ws": { target: "ws://localhost:8787", ws: true } } },
  build: {
    rollupOptions: {
      input: { main: resolve(__dirname, "index.html"), online: resolve(__dirname, "online.html"), campaign: resolve(__dirname, "campaign.html"), intro: resolve(__dirname, "intro.html") },
    },
  },
});
