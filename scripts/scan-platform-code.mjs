#!/usr/bin/env node
/**
 * scan-platform-code.mjs —— 平台专属符号扫描（判定列的**证据来源**）
 *
 * 扫可执行代码（.sh/.py/.mjs/.js/.ts/.command/.ps1/.bat/.cmd）里的平台专属符号，
 * 输出「每个 iskill 技能命中了哪些符号、在哪个文件」。这正是 docs/PLATFORM-MATRIX.md
 * 「关键依据（代码位置）」那一列的原料 —— 但**它只给线索，不给档位**：
 * 同样是 /Users/<name>，包在 try 里带回退 = 跨平台；写死在主路径 = 仅 macOS。
 * 档位必须由人读上下文确认，写进 PLATFORM-MATRIX.md。
 *
 * 用法：
 *   node scripts/scan-platform-code.mjs                 # 扫 ../ 下所有 iskill-*
 *   node scripts/scan-platform-code.mjs --root /path    # 指定父目录
 *   node scripts/scan-platform-code.mjs --only mac      # 只看某一类（mac|win|cross）
 *   node scripts/scan-platform-code.mjs --json          # 机器可读
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.dirname(HERE);           // iskill-promo-page/
const DEFAULT_ROOT = path.dirname(REPO);   // 装着一堆 iskill-* 的父目录

const argv = process.argv.slice(2);
const getFlag = (n) => argv.includes(n);
const getOpt = (n, d) => {
  const i = argv.indexOf(n);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};

const ROOT = getOpt("--root", DEFAULT_ROOT);
const ONLY = getOpt("--only", "");
const JSON_OUT = getFlag("--json");

const CODE_EXT = new Set([".sh", ".py", ".mjs", ".js", ".ts", ".command", ".ps1", ".bat", ".cmd"]);
const SKIP_DIR = new Set([".git", "node_modules", "dist", ".workbuddy", "venv", ".venv",
  "__pycache__", "deps", "samples", "renders", "promo-page", "templates"]);
// 本脚本自己要在下面定义 MAC/WIN/CROSS 符号表 —— 那些字面量（"/opt/homebrew"、"sips"…）
// 会被自己的正则命中，制造一屏假阳性。它不是「会在某个平台上跑的代码」，而是**模式的定义**，
// 所以必须排除。同理排除并列的输出脚本，避免「扫描器扫自己」的噪声。
const SKIP_FILE = new Set(["scan-platform-code.mjs"]);

// ── 符号表（与 PLATFORM-MATRIX.md 的「方法」一节一一对应）────────────
const MAC = {
  "sips": /\bsips\b/,
  "osascript": /\bosascript\b/,
  "open命令": /(^|[;&|(\s])(open|opener)\s+(-[aRn]+\s+)?["'/]/,
  "pbcopy": /\bpbcopy\b/,
  "lsof": /\blsof\b/,
  "launchctl": /\blaunchctl\b/,
  "/Applications": /\/Applications\//,
  "/opt/homebrew": /\/opt\/homebrew/,
  "写死/Users/<name>": /\/Users\/[A-Za-z]/,
  ".command": /\.command\b/,
  "brew install": /\bbrew\s+(install|list)/,
};
const WIN = {
  "os.startfile": /startfile/,
  "sys.platform": /sys\.platform|platform\.system/,
  "process.platform": /process\.platform/,
  "ps1/powershell": /\.ps1\b|powershell|PowerShell/,
  "bat/cmd": /\.(bat|cmd)\b/,
  "taskkill": /taskkill|tasklist/,
  "win env": /APPDATA|USERPROFILE|LOCALAPPDATA/i,
  "win32/Windows": /win32|['"]nt['"]|IS_WIN|Windows/,
};
const CROSS = {
  "pathlib/Path": /pathlib|Path\(/,
  "homedir/expanduser": /expanduser|homedir\(|Path\.home|\$HOME|~\/|USERPROFILE/,
  "path.delimiter": /path\.delimiter|os\.pathsep/,
};

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (!SKIP_DIR.has(e.name)) walk(path.join(dir, e.name), out);
    } else if (CODE_EXT.has(path.extname(e.name).toLowerCase()) && !SKIP_FILE.has(e.name)) {
      out.push(path.join(dir, e.name));
    }
  }
  return out;
}

function collect(tbl, files, skill) {
  const hits = {};
  for (const f of files) {
    let txt;
    try {
      txt = fs.readFileSync(f, "utf8");
    } catch {
      continue;
    }
    const rel = path.relative(skill, f);
    for (const [k, rx] of Object.entries(tbl)) {
      if (rx.test(txt)) (hits[k] ||= new Set()).add(rel);
    }
  }
  // Set → 排序数组
  return Object.fromEntries(Object.entries(hits).map(([k, v]) => [k, [...v].sort()]));
}

function main() {
  if (!fs.existsSync(ROOT)) {
    console.error(`✖ 找不到目录：${ROOT}\n  用 --root <父目录> 指定`);
    process.exit(1);
  }
  const skills = fs.readdirSync(ROOT, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name.startsWith("iskill-"))
    .map((e) => e.name)
    .sort();

  const report = [];
  for (const name of skills) {
    const dir = path.join(ROOT, name);
    const files = walk(dir);
    const row = {
      skill: name,
      files: files.length,
      mac: ONLY && ONLY !== "mac" ? {} : collect(MAC, files, dir),
      win: ONLY && ONLY !== "win" ? {} : collect(WIN, files, dir),
      cross: ONLY && ONLY !== "cross" ? {} : collect(CROSS, files, dir),
    };
    report.push(row);
  }

  if (JSON_OUT) {
    console.log(JSON.stringify({ root: ROOT, count: report.length, skills: report }, null, 2));
    return;
  }

  const show = (label, obj) => {
    const keys = Object.keys(obj);
    if (!keys.length) return;
    for (const k of keys) {
      const fs4 = obj[k].slice(0, 4).join(", ") + (obj[k].length > 4 ? ` …(+${obj[k].length - 4})` : "");
      console.log(`   ${label} ${k.padEnd(16)} ${fs4}`);
    }
  };

  console.log(`扫描根目录：${ROOT}    技能数：${report.length}`);
  console.log("─".repeat(96));
  for (const r of report) {
    const macN = Object.keys(r.mac).length;
    const winN = Object.keys(r.win).length;
    const crossN = Object.keys(r.cross).length;
    // 三种情况不能混为一谈：
    //   ① 一个代码文件都没有 → **没有证据**，不能说「✅ 无 macOS 专属符号」（那是过度断言）。
    //      多半是纯提示词 / 纯文档技能，天然平台无关，但这是「没扫到」不是「扫过且干净」。
    //   ② --only 模式 → 其余两类根本没扫，任何档位结论都是假的。
    //   ③ 正常三种线索组合。
    let verdict;
    if (ONLY) verdict = `线索→（--only ${ONLY}，其余类未扫，不判档）`;
    else if (r.files === 0) verdict = "线索→∅ 无代码可扫（多半是纯提示词/纯文档技能）";
    else if (macN === 0) verdict = "线索→✅ 无 macOS 专属符号";
    else if (winN === 0 && crossN === 0) verdict = "线索→❌ 有 mac 专属且无 win/跨平台痕迹";
    else verdict = "线索→⚠️ 需人读上下文（有 mac 专属，也有 win/跨平台痕迹）";
    console.log(`── ${r.skill}  [${r.files} 个代码文件]  ${verdict}`);
    show("MAC", r.mac);
    show("WIN", r.win);
    show("XPL", r.cross);
  }
  console.log("─".repeat(96));
  console.log("提醒：档位判定必须由人读上下文确认 —— 例如 /Users/<name>");
  console.log("      包在 try 里带回退 = 跨平台；写死在主路径 = 仅 macOS。");
  console.log("      ∅（0 个代码文件）= 没有证据，不等于「扫过且干净」；纯提示词技能天然平台无关。");
  console.log("      本脚本会跳过自己（符号表里的字面量会自我命中，属假阳性）。");
}

main();
