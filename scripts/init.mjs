#!/usr/bin/env node
/**
 * iskill-promo-page · init —— 把落地页骨架铺进目标技能目录
 *
 *   node scripts/init.mjs --target /path/to/iskill-xxx
 *                         [--out promo-page|docs]   ← 站点目录名，默认 promo-page
 *                         [--branch-mode]           ← 工作流模板换成「推 gh-pages 分支」
 *                         [--no-workflow]           ← 完全不生成工作流
 *                         [--force]
 *
 * 做两件事：
 *   1) <target>/<out>/                             静态站点（自包含，整体可同步到 gh-pages）
 *   2) <target>/.github/workflows/promo-page.yml   部署工作流（--no-workflow 则跳过）
 *
 * ── 为什么会有 --out docs ─────────────────────────────────────────────
 * GitHub Pages 的「Deploy from a branch」**只认 `/`（根）与 `/docs` 两个目录**，
 * 官方原文：the source folder can either be the root of the repository (`/`)
 * on the source branch or a `/docs` folder on the source branch.
 *
 * 也就是说：**你无法把 Pages 指向 main 分支的 promo-page/ 目录**。
 * 不想用工作流的人，唯一「保留子目录」的走法就是把站点目录命名成 docs/：
 *
 *   node scripts/init.mjs --target /path/to/iskill-xxx --out docs --no-workflow
 *   → Settings → Pages → Deploy from a branch → main / docs     ✧ 零工作流 ✧
 *
 * 目录内容完全一样（同样自包含），只是换了个名字，所以推 gh-pages 的玩法照旧。
 */

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILL = resolve(HERE, "..");
const TPL = join(SKILL, "templates");

const USAGE =
  "用法：node scripts/init.mjs --target /path/to/iskill-xxx " +
  "[--out promo-page|docs] [--branch-mode] [--no-workflow] [--force]";

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
  console.error(USAGE);
  process.exit(2);
}

const target = resolve(String(args.target));
if (!existsSync(target) || !statSync(target).isDirectory()) {
  console.error(`✗ 目标目录不存在：${target}`);
  process.exit(2);
}

// ── 站点目录名：必须是一层普通目录名 ──────────────────────────────────
const outName = String(args.out || "promo-page").replace(/\/+$/, "");
if (outName.includes("/") || outName === "." || outName === ".." || outName.startsWith(".")) {
  console.error(`✗ --out 只能是一层目录名（不能含 /、不能以 . 开头）：${outName}`);
  process.exit(2);
}
if (outName !== "promo-page" && outName !== "docs") {
  console.warn(
    `⚠ --out ${outName}：Pages 的「Deploy from a branch」只认 / 与 /docs；` +
      `这个名字只能走 Actions 产物模式或推 gh-pages。`
  );
}

const dest = join(target, outName);
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

// ── 工作流 ────────────────────────────────────────────────────────────
// --out docs + 没显式要求工作流 → 默认不生成：docs 目录本身就是分支模式的发布源，
// 再挂个工作流纯属多余（而且两者同时开是官方明说的坑）。
const workflowImplicitOff = outName === "docs" && !args["branch-mode"] && args.workflow !== true;
const wantWorkflow = !args["no-workflow"] && !workflowImplicitOff;

if (wantWorkflow) {
  const wfDir = join(target, ".github", "workflows");
  mkdirSync(wfDir, { recursive: true });
  const srcName = args["branch-mode"] ? "promo-page-branch.yml" : "promo-page.yml";
  const wfDest = join(wfDir, "promo-page.yml");
  if (existsSync(wfDest) && !args.force) {
    console.log(`· 工作流已存在，跳过：${wfDest}（要覆盖加 --force）`);
  } else {
    // 模板里的 __SITE_DIR__ 换成真实目录名（模板因此可同时服务 promo-page 与 docs）
    const body = readFileSync(join(TPL, srcName), "utf8").split("__SITE_DIR__").join(outName);
    writeFileSync(wfDest, body);
    console.log(`✓ 工作流：${wfDest}  （模板：${srcName}，站点目录：${outName}/）`);
  }
} else if (workflowImplicitOff && !args["no-workflow"]) {
  console.log(
    "· 未生成工作流（--out docs 默认免工作流）：docs/ 本身就是分支模式发布源。\n" +
      "  确实想用 Actions 产物模式再加 --workflow。"
  );
}

// ── 收尾提示（按模式给对应的话术，别给互相矛盾的两套） ────────────────
const branchMode = outName === "docs" && !wantWorkflow;
let deploy;
if (branchMode) {
  deploy = `部署（零工作流）：
     1. 把 ${outName}/ 提交并推送
     2. 仓库 Settings → Pages → Source: **Deploy from a branch**
        → Branch: main   Folder: **/docs**   （Pages 只认 / 和 /docs，这个目录名是必须的）
     3. 一条命令版：bash ${SKILL}/scripts/pages.sh docs <owner/repo> --apply`;
} else if (args["branch-mode"]) {
  deploy = `部署（推 gh-pages 分支）：
     站点目录自带 .nojekyll，直接推成分支根即可。一条命令：
       bash ${SKILL}/scripts/deploy.sh <目标目录>            # 建本地 gh-pages + 尽力 push
       bash ${SKILL}/scripts/deploy.sh <目标目录> --set-pages # 顺带把 Pages 指向 gh-pages
     或走工作流：推 main 后由 promo-page.yml 自动强推到 gh-pages。`;
} else {
  deploy = `部署（Actions 产物）：
     仓库 Settings → Pages → Source: **GitHub Actions**
     推送后工作流自动发布 ${outName}/。
     （不想用工作流：改成 --out docs --no-workflow，见 references/deploy-modes.md）`;
}

console.log(`
下一步（逐技能唯一要做的事）：
  1. 改 ${outName}/assets/content.js —— 品牌色、仓库地址、install 命令、中英文案
  2. 改 ${outName}/index.html 顶部 8 行 meta（title / description / og:*）与 <html> 里的名称
  3. 放图标与截图：${outName}/assets/favicon.svg、apple-touch-icon.png、shot-*.png
  4. 本地自查（可选）：
       cd ${dest} && python3 -m http.server 8899
  5. 截图验收（若装了 iskill-ui-verify）：
       node <ui-verify>/scripts/ui.mjs shots --url http://127.0.0.1:8899/ --out /tmp/promo \\
         --matrix "theme=light,dark" --matrix "lang=zh,en"

${deploy}

四种部署模式对比见 ${SKILL}/references/deploy-modes.md
`);
