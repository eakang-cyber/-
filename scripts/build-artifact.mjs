// Next 빌드의 Tailwind CSS + esbuild 번들 JS → dist/destiny-os.html (단일 파일 미리보기)
// 사용: npm run build && npm run build:artifact
import { build } from "esbuild";
import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const walk = (d) => readdirSync(d).flatMap((f) => { const p = path.join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const cssFiles = walk(path.join(root, ".next/static")).filter((f) => f.endsWith(".css"));
if (!cssFiles.length) throw new Error("먼저 `npm run build` 를 실행하세요 (Tailwind CSS 필요)");
const css = cssFiles.map((f) => readFileSync(f, "utf8")).join("\n");

const res = await build({
  entryPoints: [path.join(root, "src/artifact-entry.tsx")],
  bundle: true, minify: true, format: "iife", write: false, target: "es2020",
  jsx: "automatic", alias: { "@": path.join(root, "src") },
  define: { "process.env.NODE_ENV": '"production"' }, legalComments: "none",
});
const js = res.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");

const html = `<title>운명OS · DESTINY OS</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="theme-color" content="#101827">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@400;500;600&family=Noto+Serif+KR:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>${css}
:root{color-scheme:dark}html,body{background:#101827;color:#f6f2ea}</style>
<div id="root"></div>
<script>${js}</script>
`;
mkdirSync(path.join(root, "dist"), { recursive: true });
const out = path.join(root, "dist/destiny-os.html");
writeFileSync(out, html);
console.log(`wrote ${out} (${(html.length / 1024).toFixed(0)} KB)`);
