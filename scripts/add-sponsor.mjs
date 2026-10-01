#!/usr/bin/env node
/**
 * iskill-promo-page · add-sponsor —— 给**已经生成好的**落地页加一个「赞助」按钮（可选模块）
 *
 *   node scripts/add-sponsor.mjs --page ./promo-page \
 *        --qr "支付宝=~/码/alipay.jpg" --qr "微信=~/码/wechat.jpg" \
 *        --paypal https://paypal.me/xxx --name ZEO
 *
 *   node scripts/add-sponsor.mjs --page ./promo-page --remove      # 撤掉
 *
 * ── 为什么是「另一个脚本」而不是模板里内置 ───────────────────────────────
 * 默认的落地页**不应该**带任何赞助痕迹：多数技能不需要赞助模块，
 * 内置进去等于给所有人加了一个用不上的按钮 + 一份多出来的 CSS/JS。
 * 所以模板保持干净，**只有用户显式说「增加赞助模块」时**才跑这个脚本。
 *
 * ── 它做三件事 ────────────────────────────────────────────────────────
 * 1) 调 iskill-generate-sponsors 的 `--mode embed`，产出 `assets/sponsor-embed.js`
 *    （Shadow DOM 自包含片段，与它自己的 popup 形态同一份样式与数据）+ 收款码图片；
 * 2) 往 index.html 注入：Hero 区 View Source 按钮**右侧**的赞助按钮 + 一段 <script>；
 * 3) 往 content.js 补 `hero.ctaSponsor` 中英文案（不放的话语言切换会不生效）。
 *
 * 幂等：重跑只替换 marker 包裹的区块，别处一个字不动。
 * 反向：`--remove` 按同一组 marker 精确摘除，恢复成「没有赞助模块」的样子。
 */

import { existsSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { dirname, join, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILL = resolve(HERE, "..");

/* ── marker：成对出现，可精确回滚 ───────────────────────────────────── */
const BTN_START = "<!-- promo-sponsor:btn -->";
const BTN_END = "<!-- /promo-sponsor:btn -->";
const SCR_START = "<!-- promo-sponsor:script -->";
const SCR_END = "<!-- /promo-sponsor:script -->";
const KEY_MARK = "/* promo-sponsor */";

const HEART =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
  'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M20.8 8.6c0 4.2-5.4 8-8.8 10.4C8.6 16.6 3.2 12.8 3.2 8.6A4.6 4.6 0 0 1 12 6.4a4.6 4.6 0 0 1 8.8 2.2Z"/></svg>';

/* ── 透传给生成器的参数白名单（其余参数由本脚本自己决定） ────────────── */
const FORWARD = new Set([
  "qr", "from", "name", "project", "title", "tagline", "accent", "lang", "langs",
  "title-en", "tagline-en", "note-en", "note",
  "paypal", "kofi", "liberapay", "github", "patreon", "bmc", "polar",
  "open-collective", "link", "max", "prefix", "standalone", "skip-crop", "style",
]);

const USAGE = `用法：node scripts/add-sponsor.mjs --page <落地页目录> [收款码与赞助参数] [选项]

  收款码（二选一）
    --qr "标签=路径"        可重复，例：--qr "支付宝=~/码/alipay.jpg"
    --from <目录>           扫目录按文件名自动认渠道

  赞助信息（透传给 iskill-generate-sponsors）
    --name / --project / --title / --tagline
    --paypal <完整URL>  --kofi <用户名>  --liberapay  --github  --link "标签=URL"

  本脚本选项
    --page <目录>           落地页目录，默认 .
    --label-zh <文本>       Hero 按钮中文案，默认「赞助」
    --label-en <文本>       Hero 按钮英文案，默认「Sponsor」
    --img-base <路径>       收款码图片目录（默认 assets/sponsor）
    --script-out <路径>     embed 片段路径（默认 assets/sponsor-embed.js）
    --sponsors-dir <目录>   iskill-generate-sponsors 技能目录（默认自动探测兄弟目录）
    --remove                摘除赞助模块，恢复干净页面
    --dry-run               只打印将要做什么
`;

/* ─────────────────────────────────────────────────────── 参数 */

function parseArgs(argv) {
  const out = { qr: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    if (key === "help") { out.help = true; continue; }
    if (key === "remove" || key === "dry-run") {
      out[key === "remove" ? "remove" : "dryRun"] = true;
      continue;
    }
    if (key === "qr") { out.qr.push(argv[++i] ?? ""); continue; }
    out[key.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = argv[++i];
  }
  return out;
}

/** 从原始 argv 里挑出要透传给生成器的参数（保持原样，含可重复项） */
function pickForward(argv) {
  const out = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    if (!FORWARD.has(key)) continue;
    out.push(a);
    if (i + 1 < argv.length && !argv[i + 1].startsWith("--")) out.push(argv[++i]);
  }
  return out;
}

/** 找 iskill-generate-sponsors：显式 → 兄弟目录 → ~/.workbuddy/skills/ */
function findGenerator(explicit) {
  const home = process.env.HOME || "";
  const cands = [
    explicit && join(explicit, "scripts", "gen-sponsors.mjs"),
    join(SKILL, "..", "iskill-generate-sponsors", "scripts", "gen-sponsors.mjs"),
    join(home, ".workbuddy", "skills", "iskill-generate-sponsors", "scripts", "gen-sponsors.mjs"),
  ].filter(Boolean);
  for (const c of cands) if (existsSync(c)) return resolve(c);
  return null;
}

/* ─────────────────────────────────────────────────── HTML 注入 */

const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** 匹配 marker 包裹的整块（非全局：注入时只该有一块，replace 只换第一处） */
const blockRe = (s, e) => new RegExp(reEsc(s) + "[\\s\\S]*?" + reEsc(e));
/**
 * 摘除用的全局版。
 * ⚠️ 别写成 `blockRe(s,e) + "\\n?"` —— RegExp 与字符串相加会**被强制转成 `/…/` 这样的字面量字符串**，
 * 于是 replace 变成「找这个字符串」，静默匹配不到（2026-10-02 踩过：`--remove` 报"本来就没有"、
 * 实际 marker 一个没摘）。
 */
const blockReG = (s, e, head = "", tail = "") =>
  new RegExp(head + reEsc(s) + "[\\s\\S]*?" + reEsc(e) + tail, "g");

/** 缩进对齐 .hero-cta 的子元素（10 空格），插进 DOM 后与邻居一致 */
function buttonBlock(labelZh, labelEn) {
  return [
    "          " + BTN_START,
    '          <button class="btn" type="button" id="hero-sponsor" data-sponsor-open>',
    "            " + HEART,
    '            <span data-i18n="hero.ctaSponsor">' + labelZh + "</span>",
    "          </button>",
    "          " + BTN_END,
  ].join("\n");
}

function scriptBlock(scriptSrc) {
  return [SCR_START, '  <script src="' + scriptSrc + '" defer></script>', SCR_END].join("\n");
}

function injectHtml(html, btn, scr) {
  let out = html;
  const bRe = blockRe(BTN_START, BTN_END);

  if (bRe.test(out)) {
    out = out.replace(bRe, btn);
  } else {
    // 优先插在 View Source（#hero-repo）右边 —— 这是需求指定的位置
    const anchor = /([ \t]*<a[^>]*id="hero-repo"[\s\S]*?<\/a>\n)/;
    if (anchor.test(out)) {
      out = out.replace(anchor, "$1" + btn + "\n");
    } else {
      // 退路：拼进 .hero-cta 末尾（模板改过 id 时仍能工作）
      const cta = /(<div class="hero-cta">[\s\S]*?)(\n[ \t]*<\/div>)/;
      if (cta.test(out)) out = out.replace(cta, "$1\n" + btn + "$2");
      else throw new Error("index.html 里找不到 Hero 按钮区（#hero-repo 或 .hero-cta）——模板结构被改过了？");
    }
  }

  const sRe = blockRe(SCR_START, SCR_END);
  if (sRe.test(out)) out = out.replace(sRe, scr);
  else if (/<\/body>/.test(out)) out = out.replace(/<\/body>/, scr + "\n</body>");
  else throw new Error("index.html 里没有 </body>，无法插入脚本");

  return out;
}

function stripHtml(html) {
  // head 必须吃掉行首缩进，否则摘完会在 </div> 前留下一串空格（还原不干净）
  return html
    .replace(blockReG(BTN_START, BTN_END, "[ \\t]*", "[ \\t]*\\n?"), "")
    .replace(blockReG(SCR_START, SCR_END, "[ \\t]*", "[ \\t]*\\n?"), "")
    .replace(/\n{3,}/g, "\n\n");
}

/* ─────────────────────────────────────────────────── content.js 补词条 */

/** 给每个语言块的 hero:{ 补一行 ctaSponsor（zh 在前、en 在后，与模板一致） */
function patchContent(src, labels) {
  if (src.includes(KEY_MARK)) return { code: src, changed: false };
  let i = 0;
  const code = src.replace(/(\n([ \t]*)hero:\s*\{\n)/g, (m, whole, indent) => {
    const label = labels[Math.min(i++, labels.length - 1)];
    return whole + indent + "  " + KEY_MARK + " ctaSponsor: " + JSON.stringify(label) + ",\n";
  });
  return { code, changed: i > 0 };
}

function stripContent(src) {
  return src.split("\n").filter(l => !l.includes(KEY_MARK)).join("\n");
}

/* ─────────────────────────────────────────────────────── 主流程 */

function main() {
  const argv = process.argv.slice(2);
  const args = parseArgs(argv);
  if (args.help) { process.stdout.write(USAGE); return; }

  const pageDir = resolve(args.page || ".");
  const indexPath = join(pageDir, "index.html");
  const contentPath = join(pageDir, "assets", "content.js");

  if (!existsSync(indexPath)) {
    console.error(`✗ 找不到落地页：${indexPath}\n  --page 指向含 index.html 的目录（init.mjs 生成的 promo-page/ 或 docs/）。`);
    process.exit(1);
  }

  const labelZh = args.labelZh || "赞助";
  const labelEn = args.labelEn || "Sponsor";
  const imgBase = (args.imgBase || "assets/sponsor").replace(/^\.?\/+|\/+$/g, "");
  const scriptOut = (args.scriptOut || "assets/sponsor-embed.js").replace(/^\.?\/+|\/+$/g, "");
  /** 给用户看的路径：层级太深的相对路径不如直接给绝对路径 */
  const nicePath = p => {
    const r = relative(process.cwd(), p);
    return r && !/^\.\.[/\\]/.test(r) ? r : p;
  };

  /* ── --remove：摘掉注入，不动任何别的文件 ── */
  if (args.remove) {
    const before = readFileSync(indexPath, "utf8");
    const after = stripHtml(before);
    let contentAfter = null;
    if (existsSync(contentPath)) {
      const c = readFileSync(contentPath, "utf8");
      contentAfter = stripContent(c);
    }
    const htmlChanged = before !== after;
    const jsChanged = contentAfter !== null && contentAfter !== readFileSync(contentPath, "utf8");

    if (args.dryRun) {
      console.log(`— dry-run —\n  会从 index.html 摘除赞助按钮与脚本：${htmlChanged ? "有改动" : "无（本来就没有）"}`);
      console.log(`  会从 content.js 摘除 ctaSponsor：${jsChanged ? "有改动" : "无（本来就没有）"}`);
      return;
    }
    if (htmlChanged) writeFileSync(indexPath, after);
    if (jsChanged) writeFileSync(contentPath, contentAfter);

    console.log("\n  iskill-promo-page · 移除赞助模块\n  " + "─".repeat(44));
    console.log(`  ${htmlChanged ? "✓" : "·"} index.html         ${htmlChanged ? "已摘除按钮与脚本" : "本来就没有"}`);
    console.log(`  ${jsChanged ? "✓" : "·"} assets/content.js  ${jsChanged ? "已摘除 ctaSponsor" : "本来就没有"}`);
    console.log(`  ${"─".repeat(44)}`);
    console.log(`  ⚠️ 没有自动删文件。确认不再需要后自己删：`);
    console.log(`     ${join(pageDir, scriptOut)}`);
    console.log(`     ${join(pageDir, imgBase)}/\n`);
    return;
  }

  /* ── 正常路径：先让生成器产出片段与图片 ── */
  const gen = findGenerator(args.sponsorsDir);
  if (!gen) {
    console.error(
      "✗ 找不到 iskill-generate-sponsors。\n" +
      "  装到 ~/.workbuddy/skills/ 下即可自动探测，或用 --sponsors-dir <技能目录> 指定。"
    );
    process.exit(1);
  }

  const genArgs = [
    gen,
    "--mode", "embed",
    "--out", pageDir,
    "--img-base", imgBase,
    "--pages-img-base", imgBase,
    "--embed-out", scriptOut,
    ...pickForward(argv),
  ];

  if (args.dryRun) {
    console.log("— dry-run —");
    console.log("  将执行：node " + [gen, ...genArgs.slice(1)].map(a => (/\s/.test(a) ? JSON.stringify(a) : a)).join(" "));
    console.log(`  将往 ${nicePath(indexPath)} 的 Hero 区注入赞助按钮（View Source 右侧）与 <script>`);
    console.log(`  将往 ${nicePath(contentPath)} 补 hero.ctaSponsor`);
    return;
  }

  const r = spawnSync(process.execPath, genArgs, { stdio: "inherit" });
  if (r.status !== 0) {
    console.error(`\n✗ 生成片段失败（退出码 ${r.status}）——上面的输出就是原因。`);
    process.exit(r.status || 1);
  }

  /* ── 注入 ── */
  const html = readFileSync(indexPath, "utf8");
  const nextHtml = injectHtml(html, buttonBlock(labelZh, labelEn), scriptBlock(scriptOut));
  writeFileSync(indexPath, nextHtml);

  let contentNote = "未找到 assets/content.js，跳过（按钮会固定显示中文案）";
  let contentChanged = false;
  if (existsSync(contentPath) && statSync(contentPath).isFile()) {
    const src = readFileSync(contentPath, "utf8");
    const { code, changed } = patchContent(src, [labelZh, labelEn]);
    if (changed) { writeFileSync(contentPath, code); contentChanged = true; contentNote = "已补 hero.ctaSponsor"; }
    else contentNote = "已有 hero.ctaSponsor，未重复插入";
  }

  console.log("\n  iskill-promo-page · 赞助模块\n  " + "─".repeat(44));
  console.log(`  ✓ Hero 按钮        #hero-sponsor（View Source 右侧，点击开弹层）`);
  console.log(`  ✓ 片段             ${join(pageDir, scriptOut)}`);
  console.log(`  ✓ 收款码           ${join(pageDir, imgBase)}/`);
  console.log(`  ${contentChanged ? "✓" : "·"} content.js       ${contentNote}`);
  console.log(`  ${"─".repeat(44)}`);
  console.log("  按钮文案与主题跟随页面语言/深浅色，不需要额外接线。");
  console.log(`  撤销：node scripts/add-sponsor.mjs --page ${nicePath(pageDir)} --remove\n`);
}

main();
