import { defineConfig } from "vite";
import { resolve } from "node:path";

// 多页面：index.html 是单机原型，online.html 是局域网联机入口，campaign.html 是新手教程，side.html 是横�?3v3 布局原型�?
// 开发期（npm run dev:online）：Vite 热更新，/ws 代理到本�?8787 的联机服务（另开一�?npm run serve）�?
// 版本�?= 构建时间（北京时间），主菜单底部显示，用来分辨新旧版�?
const BUILD = new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 16).replace("T", " ");
export default defineConfig({
  define: { "import.meta.env.VITE_BUILD": JSON.stringify(BUILD) },
  server: { host: true, proxy: { "/ws": { target: "ws://localhost:8787", ws: true } } },
  build: {
    rollupOptions: {
      input: { main: resolve(__dirname, "index.html"), online: resolve(__dirname, "online.html"), campaign: resolve(__dirname, "campaign.html"), intro: resolve(__dirname, "intro.html"), side: resolve(__dirname, "side.html"), duanju: resolve(__dirname, "duanju.html"), duanjuStory: resolve(__dirname, "duanju-story.html"), duanjuTrain: resolve(__dirname, "duanju-train.html"), duanjuRig: resolve(__dirname, "duanju-rig.html") },
    },
  },
});
