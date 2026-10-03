#!/usr/bin/env node
/**
 * check-platform.mjs —— 「判定 ↔ 本地徽章 ↔ 线上徽章」三方一致性核验
 *
 * 为什么要有它：docs/PLATFORM-MATRIX.md 是一张**人工维护的快照**，而它描述 26 个技能
 * 分散在 26 个独立仓库里 —— 任何一次技能改造都会让它过期，且没人会收到提醒。
 * 这个脚本把「文档说的」「代码里写的」「线上真在跑的」三份摆在一起比，一眼看出漂移。
 *
 * 三方：
 *   A) 判定    —— docs/PLATFORM-MATRIX.md「清点表」的档位列（✅ / ⚠️ / ❌）
 *   B) 本地徽章 —— 各技能 promo-page/assets/content.js 顶层 platform（落地页 Hero 第 2 枚徽章真源）
 *   C) 线上徽章 —— https://aispin.github.io/<仓库>/assets/content.js（发布是否跟上）
 *   ＋ GitHub Pages 状态（未发布 / 私有仓开不了）
 *
 * 不一致的两种方向，危害完全不同：
 *   ❌ 判定单平台 但 徽章写双平台  → **危险**（用户照徽章装了跑不了）
 *   ✅ 判定双平台 但 徽章写单平台  → 保守（会劝退一部分本可以用的用户）
 *
 * 用法：
 *   node scripts/check-platform.mjs               # 全量（含线上探测 + gh）
 *   node scripts/check-platform.mjs --offline     # 只比 判定 ↔ 本地徽章（不联网）
 *   node scripts/check-platform.mjs --root /path  # 指定装着 iskill-* 的父目录
 *   node scripts/check-platform.mjs --md          # 额外输出可贴进文档的 markdown 表
 *   node scripts/check-platform.mjs --json        # 机器可读
 *
 * 私有仓：SKIP_PAGES 清单里的仓跳过线上探测与 Pages 检查（sync=SKIP、INFO 级），
 * 不产生 OFFLINE —— 免费计划私有仓本就开不了 Pages，探测必然 404，不是故障。
 *
 * 退出码：0 = 无 ERROR；1 = 有 ERROR（可用于 CI / 发布前检查）
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.dirname(HERE);
const DEFAULT_ROOT = path.dirname(REPO);

const argv = process.argv.slice(2);
const OFFLINE = argv.includes("--offline");
const MD = argv.includes("--md");
const JSON_OUT = argv.includes("--json");
const NO_GH = argv.includes("--no-gh") || OFFLINE;
const opt = (n, d) => {
  const i = argv.indexOf(n);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const ROOT = opt("--root", DEFAULT_ROOT);
const GH = ["/opt/homebrew/bin/gh", "/usr/local/bin/gh", "/usr/bin/gh", "gh"]
  .find((p) => p === "gh" || fs.existsSync(p));
const SITE = "https://aispin.github.io";

/**
 * 用户决定保持私有的仓库（2026-10-03 定）—— 跳过 Pages / 线上核验，不算 OFFLINE。
 * 免费计划不支持私有仓 Pages，gh-pages 资产已就位，改公开即自动生效；
 * 在此之前核验它们只会得到必然的 404，徒增噪音。
 * 若日后把仓库改公开：把名字从这里移除即可恢复核验 ——
 * 脚本发现「在清单内但已公开」会报 WARN（SKIP-STALE）提醒，防止清单过期。
 */
const SKIP_PAGES = new Set(["iskill-build-books", "iskill-lang-scene-app"]);

/** 引擎 OS_LABEL（与 promo-page/assets/app.js 的 renderPlatformBadge 保持一致） */
const OS_LABEL = {
  "mac-windows": "macOS / Windows",
  macos: "仅 macOS",
  windows: "仅 Windows",
  linux: "仅 Linux",
  all: "全平台",
};
const MULTI = new Set(["mac-windows", "all"]);
const SINGLE = new Set(["macos", "windows", "linux"]);

// ── A) 判定：解析 PLATFORM-MATRIX.md 的清点表 ────────────────────────
function readVerdicts() {
  const f = path.join(REPO, "docs", "PLATFORM-MATRIX.md");
  if (!fs.existsSync(f)) return { file: f, map: {}, err: "找不到 docs/PLATFORM-MATRIX.md" };
  const src = fs.readFileSync(f, "utf8");
  const map = {};
  const re = /^\|\s*`?(iskill-[a-z0-9-]+)`?\s*\|\s*(✅|⚠️|❌)\s*([^|]*)\|/gm;
  let m;
  while ((m = re.exec(src))) {
    map[m[1]] = { mark: m[2], tier: m[3].replace(/\*\*/g, "").trim() };
  }
  return { file: f, map };
}

// ── platform 字段解析（支持字符串键与自定义对象）────────────────────
function parsePlatform(src) {
  const m = src.match(/^\s*platform\s*:\s*(\{[\s\S]*?\}|"[^"]*"|'[^']*')/m);
  if (!m) return null;
  const lit = m[1];
  if (lit.startsWith("{")) {
    const zh = (lit.match(/zh\s*:\s*"([^"]*)"/) || [])[1] || "?";
    return { kind: "custom", key: null, label: zh, raw: `{zh:${zh}}` };
  }
  const key = lit.slice(1, -1);
  return { kind: "key", key, label: OS_LABEL[key] || `unknown:${key}`, raw: `"${key}"` };
}

/** 找 content.js：优先 promo-page/，兼容 --out docs / --out . 两种铺法 */
function findContent(skill) {
  for (const p of ["promo-page/assets/content.js", "docs/assets/content.js", "assets/content.js"]) {
    const f = path.join(ROOT, skill, p);
    if (fs.existsSync(f)) return f;
  }
  return null;
}

async function fetchOnline(skill) {
  try {
    const res = await fetch(`${SITE}/${skill}/assets/content.js`, {
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return { err: `HTTP ${res.status}` };
    return parsePlatform(await res.text());
  } catch {
    return { err: "unreachable" };
  }
}

function pagesStatus(skill) {
  if (NO_GH || !GH) return "-";
  try {
    return execSync(`${GH} api repos/aispin/${skill}/pages --jq .status`, {
      stdio: ["ignore", "pipe", "ignore"],
    }).toString().trim() || "-";
  } catch {
    return "-";
  }
}

function visibility(skill) {
  if (NO_GH || !GH) return "?";
  try {
    const p = execSync(`${GH} api repos/aispin/${skill} --jq .private`, {
      stdio: ["ignore", "pipe", "ignore"],
    }).toString().trim();
    return p === "true" ? "PRV" : "PUB";
  } catch {
    return "?";
  }
}

// ── 主流程 ───────────────────────────────────────────────────────────
async function main() {
  if (!fs.existsSync(ROOT)) {
    console.error(`✖ 找不到目录：${ROOT}\n  用 --root <父目录> 指定`);
    process.exit(1);
  }
  const { map: verdicts, err } = readVerdicts();
  if (err) console.error(`⚠ ${err}（判定列将显示为「?」，只比本地↔线上）`);

  const skills = fs.readdirSync(ROOT, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name.startsWith("iskill-"))
    .map((e) => e.name)
    .sort();

  const rows = [];
  for (const name of skills) {
    const v = verdicts[name] || { mark: "?", tier: "(未收录)" };
    const cf = findContent(name);
    const local = cf ? parsePlatform(fs.readFileSync(cf, "utf8")) : null;
    const skip = SKIP_PAGES.has(name);
    const online = OFFLINE || skip ? { skipped: true } : await fetchOnline(name);
    const pg = NO_GH || skip ? "-" : pagesStatus(name);
    const vis = NO_GH ? "?" : visibility(name);

    // 同步状态（本地 ↔ 线上）
    let sync = "-";
    if (!OFFLINE) {
      if (skip) sync = "SKIP";
      else if (online.err) sync = online.err.startsWith("HTTP") ? "OFFLINE" : "UNREACHABLE";
      else if (!local) sync = "NO-LOCAL";
      else sync = local.raw === online.raw ? "SAME" : "DIFF";
    }

    // 判定 ↔ 徽章 一致性
    const issues = [];
    if (!local) issues.push({ sev: "WARN", code: "UNDECLARED", msg: "没有 promo-page / platform 字段" });
    else if (v.mark === "❌" && MULTI.has(local.key))
      issues.push({ sev: "ERROR", code: "BADGE-STRONGER", msg: `判定单平台但徽章写「${local.label}」——用户照徽章装了跑不了` });
    else if (v.mark === "✅" && SINGLE.has(local.key))
      issues.push({ sev: "WARN", code: "BADGE-WEAKER", msg: `判定双平台但徽章写「${local.label}」——会劝退本可用的用户` });
    if (sync === "DIFF") issues.push({ sev: "ERROR", code: "SYNC-DIFF", msg: `本地 ${local.raw} ≠ 线上 ${online.raw}（发布没跟上）` });
    if (sync === "OFFLINE" && vis === "PUB")
      issues.push({ sev: "ERROR", code: "OFFLINE", msg: "公开仓库但线上取不到 content.js" });
    if (sync === "OFFLINE" && vis === "PRV")
      issues.push({ sev: "INFO", code: "PRIVATE-NO-PAGES", msg: "私有仓库（免费计划开不了 Pages），设计如此 —— 可加入 SKIP_PAGES 清单显式跳过" });
    if (skip && vis === "PRV")
      issues.push({ sev: "INFO", code: "SKIP-PAGES", msg: "私有仓，用户决定跳过 Pages 核验（gh-pages 资产已就位，改公开即生效），非异常" });
    if (skip && vis === "PUB")
      issues.push({ sev: "WARN", code: "SKIP-STALE", msg: "在 SKIP_PAGES 清单但仓库已公开 —— 请从清单移除以恢复核验" });

    rows.push({ skill: name, vis, pg, mark: v.mark, tier: v.tier, local, online, sync, issues });
  }

  const pad = (s, n) => String(s ?? "").padEnd(n);

  if (JSON_OUT) {
    console.log(JSON.stringify({ root: ROOT, offline: OFFLINE, rows }, null, 2));
    return finish(rows);
  }

  console.log(`根目录：${ROOT}    技能数：${rows.length}    模式：${OFFLINE ? "offline（只比判定↔本地）" : "full"}`);
  console.log("─".repeat(112));
  console.log(pad("SKILL", 32) + pad("VIS", 5) + pad("PAGES", 10) + pad("判定", 4) + pad("本地徽章", 22) + pad("线上徽章", 22) + "SYNC");
  for (const r of rows) {
    console.log(
      pad(r.skill, 32) + pad(r.vis, 5) + pad(r.pg, 10) + pad(r.mark, 4) +
      pad(r.local ? r.local.label : "(无)", 22) +
      pad(OFFLINE ? "(skipped)" : r.online.err || r.online.label, 22) + r.sync
    );
  }

  const cnt = (f) => rows.filter(f).length;
  const allIssues = rows.flatMap((r) => r.issues.map((i) => ({ ...i, skill: r.skill })));
  console.log("─".repeat(112));
  console.log(
    `TOTAL=${rows.length}  ✅=${cnt((r) => r.mark === "✅")}  ⚠️=${cnt((r) => r.mark === "⚠️")}  ❌=${cnt((r) => r.mark === "❌")}  ` +
    `未收录=${cnt((r) => r.mark === "?")}  |  sync.SAME=${cnt((r) => r.sync === "SAME")}  DIFF=${cnt((r) => r.sync === "DIFF")}  ` +
    `OFFLINE=${cnt((r) => r.sync === "OFFLINE")}  SKIP=${cnt((r) => r.sync === "SKIP")}  |  pages.built=${cnt((r) => r.pg === "built")}`
  );

  const errs = allIssues.filter((i) => i.sev === "ERROR");
  const warns = allIssues.filter((i) => i.sev === "WARN");
  const infos = allIssues.filter((i) => i.sev === "INFO");
  const dump = (label, list) => {
    if (!list.length) return;
    console.log(`\n${label}`);
    for (const i of list) console.log(`  · ${pad(i.skill, 32)} [${i.code}] ${i.msg}`);
  };
  dump("✖ ERROR（必须处理）", errs);
  dump("⚠ WARN （建议核对）", warns);
  dump("ℹ INFO （设计如此）", infos);
  if (!allIssues.length) console.log("\n✓ 三方完全一致，无任何不一致项。");

  if (MD) {
    console.log("\n\n<!-- ↓ 可直接贴进 docs/PLATFORM-MATRIX.md ↓ -->");
    console.log("| 技能 | 仓库 | Pages | 判定 | 线上徽章 | 状态 |");
    console.log("|---|---|---|---|---|---|");
    for (const r of rows) {
      const st = r.sync === "SAME" ? "✅ 200" : r.sync === "SKIP" ? "⊘ 跳过（有意私有）" : r.sync === "OFFLINE" ? "⛔ 未上线" : `⚠️ ${r.sync}`;
      console.log(`| \`${r.skill}\` | ${r.vis === "PRV" ? "私有" : "公开"} | ${r.pg} | ${r.mark} | ${r.online.err || r.online.label || "-"} | ${st} |`);
    }
  }

  return finish(rows, errs.length);
}

function finish(rows, errCount = rows.flatMap((r) => r.issues).filter((i) => i.sev === "ERROR").length) {
  process.exit(errCount > 0 ? 1 : 0);
}

main();
