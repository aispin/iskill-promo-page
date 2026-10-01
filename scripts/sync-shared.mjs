#!/usr/bin/env node
/* ============================================================================
 * iskill-promo-page · 把模板里那几个「共享文件」同步到已有的落地页
 *
 * 背景：init.mjs 铺出来的每个落地页都是**自包含**的（各自的 assets/ 里都有
 * app.js / style.css / icons.js 的副本）。好处是不依赖模板也能跑；代价是
 * **模板改了渲染逻辑，老页面不会自动跟上**。这个脚本就是补这一步：
 *
 *   node scripts/sync-shared.mjs ~/work/iskill-foo/promo-page ~/work/iskill-bar
 *
 * 只同步这三个「与内容无关、纯引擎」的文件：
 *   app.js    渲染逻辑（新段位、徽章、槽位…都在这里）
 *   style.css 样式
 *   icons.js  内联图标集
 *
 * **绝不动** content.js（那是每个技能自己的文案）与 index.html（改过 meta 和
 * 品牌名）—— 所以这个脚本是安全的，可反复跑。
 *
 * 用法：
 *   node scripts/sync-shared.mjs <落地页目录> [更多目录...] [--dry-run]
 *   （落地页目录 = 含 index.html 与 assets/ 的那个目录）
 * ==========================================================================*/

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TPL_ASSETS = path.resolve(HERE, "..", "templates", "promo-page", "assets");

/** 引擎文件：与文案无关，可安全覆盖 */
const SHARED = ["app.js", "style.css", "icons.js"];

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const targets = args.filter((a) => !a.startsWith("--"));

if (!targets.length) {
  console.error(`同步共享引擎文件到已有落地页（不动 content.js / index.html）

用法:
  node scripts/sync-shared.mjs <落地页目录> [更多目录...] [--dry-run]

  落地页目录 = 含 index.html 与 assets/ 的那个目录，例如
    ~/work/iskill-foo/promo-page      （--out promo-page）
    ~/work/iskill-bar                 （--out . 铺在仓库根）`);
  process.exit(2);
}

let changedTotal = 0;
let skipped = 0;

for (const t of targets) {
  const dir = path.resolve(t.replace(/^~(?=\/|$)/, process.env.HOME || "~"));
  const label = path.basename(dir) === "promo-page" ? `${path.basename(path.dirname(dir))}/promo-page` : path.basename(dir);
  const idx = path.join(dir, "index.html");
  const assets = path.join(dir, "assets");

  console.log(`\n── ${label}   ${dir}`);
  if (!fs.existsSync(idx) || !fs.existsSync(assets)) {
    console.log("   [!] 跳过：不是落地页目录（缺 index.html 或 assets/）");
    skipped++;
    continue;
  }

  for (const f of SHARED) {
    const src = path.join(TPL_ASSETS, f);
    const dst = path.join(assets, f);
    if (!fs.existsSync(src)) {
      console.log(`   [!] 模板里没有 ${f}，跳过`);
      continue;
    }
    const same = fs.existsSync(dst) && Buffer.compare(fs.readFileSync(src), fs.readFileSync(dst)) === 0;
    if (same) {
      console.log(`   [=] ${f}  已是最新`);
      continue;
    }
    const verb = fs.existsSync(dst) ? "更新" : "新增";
    if (dryRun) {
      console.log(`   [~] ${f}  待${verb}（--dry-run，未写盘）`);
    } else {
      fs.mkdirSync(path.dirname(dst), { recursive: true });
      fs.copyFileSync(src, dst);
      console.log(`   [✓] ${f}  已${verb}`);
    }
    changedTotal++;
  }

  console.log("   [·] content.js 与 index.html **原样未动**（那是该技能自己的文案与 meta）");
}

console.log(`\n${dryRun ? "（dry-run）" : "完成"}：${changedTotal} 个文件${dryRun ? "待处理" : "已同步"}，${skipped} 个目录被跳过。`);
if (!dryRun && changedTotal) {
  console.log(`
提醒：引擎更新后，别忘给该落地页的 content.js 顶层补上平台标签（新能力之一）：
    platform: "mac-windows"   // 或 "macos" / "windows" / "linux" / "all" / ""
  不写 = 不显示该标签，页面视觉零变化（向后兼容）。`);
}
