#!/usr/bin/env node
/**
 * iskill-promo-page · init —— 把落地页骨架铺进目标技能目录
 *
 *   node scripts/init.mjs --target /path/to/iskill-xxx
 *                         [--out promo-page|docs|.]  ← 站点目录名，默认 promo-page
 *                                                      `.` = 直接铺进仓库根
 *                         [--branch-mode]           ← 工作流模板换成「推 gh-pages 分支」
 *                         [--no-workflow]           ← 完全不生成工作流
 *                         [--force]
 *
 * 做两件事：
 *   1) <target>/<out>/                             静态站点（自包含，整体可同步到 gh-pages）
 *   2) <target>/.github/workflows/promo-page.yml   部署工作流（--no-workflow 则跳过）
 *
 * ── 为什么要支持 --out .（仓库根） ─────────────────────────────────────
 * 有些技能的落地页**就是仓库首页**：页面是 index.html，旁边还躺着它要展示的
 * 其它产物（如 `usage.html` / `sponsors.html`），三者必须同目录，否则 iframe
 * 用 `../` 引用会在单独部署站点时断掉。这种就 `--out .`，配
 * 「Pages → Deploy from a branch → main /(root)」零工作流发布。
 *
 * 与 `--out promo-page` 的区别只在**怎么落盘**：根目录里已经有 SKILL.md、
 * scripts/ 这些绝不能被站点覆盖的东西，所以根模式**逐文件**铺、遇到同名文件
 * 默认跳过并列出（`--force` 才覆盖），而不是整目录 force 覆盖。
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
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILL = resolve(HERE, "..");
const TPL = join(SKILL, "templates");

const USAGE =
  "用法：node scripts/init.mjs --target /path/to/iskill-xxx " +
  "[--out promo-page|docs|.] [--branch-mode] [--no-workflow] [--force]";

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

// ── 站点目录名：一层普通目录名，或 `.`（仓库根，当 Pages 首页用） ────────
const rawOut = (args.out === true ? "" : String(args.out || "promo-page")).replace(/\/+$/, "");
if (!rawOut) {
  console.error("✗ --out 后面要跟一个目录名（或 . 表示仓库根）");
  process.exit(2);
}
const isRoot = rawOut === ".";
const outName = isRoot ? "." : rawOut;
if (!isRoot && (outName.includes("/") || outName === ".." || outName.startsWith("."))) {
  console.error(`✗ --out 只能是一层目录名（不能含 /、不能以 . 开头）：${outName}`);
  process.exit(2);
}
if (!isRoot && outName !== "promo-page" && outName !== "docs") {
  console.warn(
    `⚠ --out ${outName}：Pages 的「Deploy from a branch」只认 / 与 /docs；` +
      `这个名字只能走 Actions 产物模式或推 gh-pages。`
  );
}

const dest = isRoot ? target : join(target, outName);

/** 逐文件铺开（根目录模式专用）：同名文件默认**跳过**并列出，`--force` 才覆盖。
 *  为什么不直接 cpSync({force:true}) —— 仓库根里躺着 SKILL.md / scripts/ /
 *  已经生成好的页面，一次性整目录覆盖太危险；逐文件才有机会只碰该碰的。 */
function copyInto(srcDir, dstDir, force, log) {
  for (const name of readdirSync(srcDir)) {
    const s = join(srcDir, name);
    const d = join(dstDir, name);
    if (statSync(s).isDirectory()) {
      mkdirSync(d, { recursive: true });
      copyInto(s, d, force, log);
    } else if (existsSync(d) && !force) {
      log.push(["skip", d]);
    } else {
      cpSync(s, d);
      log.push(["copy", d]);
    }
  }
  return log;
}

if (isRoot) {
  const log = copyInto(join(TPL, "promo-page"), target, !!args.force, []);
  const copied = log.filter((x) => x[0] === "copy");
  const skipped = log.filter((x) => x[0] === "skip");
  console.log(`✓ 静态站点：${dest}   （根目录模式，逐文件铺）`);
  if (copied.length) console.log(`  · 写入 ${copied.length} 个：${copied.map((x) => relative(target, x[1])).join(", ")}`);
  if (skipped.length) {
    console.log(
      `  · 已存在、跳过 ${skipped.length} 个（要覆盖加 --force）：${skipped.map((x) => relative(target, x[1])).join(", ")}`
    );
  }
  const nj = join(target, ".nojekyll");
  if (!existsSync(nj)) {
    writeFileSync(nj, "");
    console.log("  · 补了一个 .nojekyll（根目录发布时阻止 Jekyll 处理，否则下划线开头的文件会被吞）");
  }
} else {
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
}

// ── 顶栏品牌名占位 → 目标名 ───────────────────────────────────────────
// 骨架里那句 <span>ISKILL-EXAMPLE</span> 是模板占位，**必须换掉**：
// 漏改就会顶着 "ISKILL-EXAMPLE" 上线（script-launcher 就中过一次）。
// 运行时还有一道保险：app.js 的 renderBrand() 每次渲染都用 content.js 的 name 覆盖它。
// 这里做的是静态兜底 —— JS 没跑 / 被缓存时也不至于露出占位名。
{
  const dirName = resolve(target).split("/").pop() || "";
  const brandName = /^iskill-/i.test(dirName) ? dirName.toUpperCase() : "";
  const idxPath = join(dest, "index.html");
  if (brandName && existsSync(idxPath)) {
    const s = readFileSync(idxPath, "utf8");
    if (s.includes("ISKILL-EXAMPLE")) {
      writeFileSync(idxPath, s.split("ISKILL-EXAMPLE").join(brandName));
      console.log(`✓ 顶栏品牌名：ISKILL-EXAMPLE → ${brandName}`);
    }
  }
}

// ── 工作流 ────────────────────────────────────────────────────────────
// --out docs / --out . + 没显式要求工作流 → 默认不生成：这两个位置本身就是
// 「Deploy from a branch」的发布源，再挂个工作流纯属多余（两者同时开是官方明说的坑）。
const workflowImplicitOff = (outName === "docs" || isRoot) && !args["branch-mode"] && args.workflow !== true;
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
    `· 未生成工作流（--out ${isRoot ? "." : outName} 默认免工作流）：` +
      `${isRoot ? "仓库根" : "docs/"}本身就是「Deploy from a branch」的发布源。\n` +
      "  确实想用 Actions 产物模式再加 --workflow。"
  );
}

// ── 收尾提示（按模式给对应的话术，别给互相矛盾的两套） ────────────────
const branchMode = (outName === "docs" || isRoot) && !wantWorkflow;
/* 站点在根时，产物路径前面不带目录名 —— 提示语里得照实写，不然抄过去就错 */
const site = isRoot ? "" : outName + "/";
let deploy;
if (isRoot && branchMode) {
  deploy = `部署（根目录 = 站点根，零工作流）：
     1. 把仓库推上去（站点文件已经在根上了）
     2. 仓库 Settings → Pages → Source: **Deploy from a branch**
        → Branch: main   Folder: **/(root)**
     ⚠️ 这样**仓库根整个变成网站根**：SKILL.md、scripts/ 也会被静态服务公开。
        本仓库本来就是公开的话无所谓；介意就把站点挪进 docs/（--out docs）。
     3. 一条命令版：bash ${SKILL}/scripts/pages.sh root <owner/repo> --apply`;
} else if (branchMode) {
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
  1. 改 ${site}assets/content.js —— 品牌色、仓库地址、中英文案
     （安装提示词不用写：由 repo 自动推导成「请帮我安装 Skill：<repo>，并告诉我它的用法」）
  2. 改 ${site}index.html 顶部 8 行 meta（title / description / og:*）与 <html> 里的名称
  3. 装/配槽位（可选）：content.js 的 slots.hero —— 往 Hero 按钮下方插本技能特有的东西，
     可写一段 html，也可嵌一个自包含页面（如 usage.html）。不配就是没有，不留空行。
  4. 放图标与截图：${site}assets/favicon.svg、apple-touch-icon.png、shot-*.png
  5. 本地自查（可选）：
       cd ${dest} && python3 -m http.server 8899
  6. 截图验收（若装了 iskill-ui-verify）：
       node <ui-verify>/scripts/ui.mjs shots --url http://127.0.0.1:8899/ --out /tmp/promo \\
         --matrix "theme=light,dark" --matrix "lang=zh,en"

${deploy}

四种部署模式对比见 ${SKILL}/references/deploy-modes.md
`);
