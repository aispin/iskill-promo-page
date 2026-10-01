#!/usr/bin/env node
/**
 * iskill-promo-page · init —— 把落地页骨架铺进目标技能目录
 *
 *   node scripts/init.mjs --target /path/to/iskill-xxx [--branch-mode] [--no-workflow] [--force]
 *
 * 做两件事：
 *   1) <target>/promo-page/            静态站点（自包含，整体可同步到 gh-pages）
 *   2) <target>/.github/workflows/promo-page.yml   部署工作流
 *
 * 铺完骨架后，**逐技能只需要改 promo-page/assets/content.js**
 * （外加 index.html 顶部那 8 行 meta）。
 */

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILL = resolve(HERE, "..");
const TPL = join(SKILL, "templates");

function parse(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const k = a.slice(2);
    const v = argv[i + 1] !== undefined && !argv[i + 1].startsWith("--") ? argv[++i] : true;
    out[k] = v;
  }
  return out;
}

const args = parse(process.argv.slice(2));
if (!args.target || args.target === true) {
  console.error("用法：node scripts/init.mjs --target /path/to/iskill-xxx [--branch-mode] [--no-workflow] [--force]");
  process.exit(2);
}

const target = resolve(String(args.target));
if (!existsSync(target) || !statSync(target).isDirectory()) {
  console.error(`✗ 目标目录不存在：${target}`);
  process.exit(2);
}

const dest = join(target, "promo-page");
if (existsSync(dest) && !args.force) {
  const files = readdirSync(dest);
  if (files.length) {
    console.error(`✗ ${dest} 已存在且有内容（${files.length} 项）。要覆盖请加 --force。`);
    process.exit(2);
  }
}

mkdirSync(dest, { recursive: true });
cpSync(join(TPL, "promo-page"), dest, { recursive: true, force: true });
console.log(`✓ 静态站点：${dest}`);

if (!args["no-workflow"]) {
  const wfDir = join(target, ".github", "workflows");
  mkdirSync(wfDir, { recursive: true });
  const src = args["branch-mode"] ? "promo-page-branch.yml" : "promo-page.yml";
  const wfDest = join(wfDir, "promo-page.yml");
  if (existsSync(wfDest) && !args.force) {
    console.log(`· 工作流已存在，跳过：${wfDest}（要覆盖加 --force）`);
  } else {
    cpSync(join(TPL, src), wfDest);
    writeFileSync(join(dest, ".nojekyll"), "");
    console.log(`✓ 工作流：${wfDest}  （模板：${src}）`);
  }
}

console.log(`
下一步（逐技能唯一要做的事）：
  1. 改 promo-page/assets/content.js —— 品牌色、仓库地址、install 命令、中英文案
  2. 改 promo-page/index.html 顶部 8 行 meta（title / description / og:*）与 <html> 里的名称
  3. 放图标与截图：promo-page/assets/favicon.svg、apple-touch-icon.png、shot-*.png
  4. 本地自查（可选，会自动开临时静态服务器？不会——直接双击 index.html 也行）：
       cd ${dest} && python3 -m http.server 8899
  5. 截图验收（若装了 iskill-ui-verify）：
       node <ui-verify>/scripts/ui.mjs shots --url http://127.0.0.1:8899/ --out /tmp/promo \\
         --matrix "theme=light,dark" --matrix "lang=zh,en"

部署：把 promo-page/ 整个提交，推送后工作流自动发布；
     仓库 Settings → Pages → Source 需设为 "GitHub Actions"。
`);
