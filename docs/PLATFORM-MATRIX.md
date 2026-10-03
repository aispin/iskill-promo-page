# iskill 技能平台兼容性清点

> 生成日期：2026-10-02　范围：`ISkills/iskill-*` 共 26 个自研技能
> 更新：2026-10-02 晚 —— 补入 `iskill-workbuddy-deepseek`；`iskill-headroom-workbuddy` 已改名 `iskill-headroom-workbuddy2api`（全文同步）；
> 明确 ⚠️ 档判据与徽章口径（修掉 `promo-page` 一处口径不一）；`iskill-app-icon` 完成跨平台改造（❌ → ✅）；
> **这份文档从「人工快照」升级为「一条命令可复核」** —— 核验脚本固化进 `iskill-promo-page/scripts/`（见第零节）。
>
> **为什么这份文档住在 `iskill-promo-page/docs/`**：它描述的是**落地页 Hero 那枚 OS 兼容性徽章**的口径，
> 而徽章由 `iskill-promo-page` 这一个技能定义与生成 —— 放在别处（例如 `ISkills/` 根目录）它就成了「孤儿文档」：
> 根目录不是 git 仓库，没人版本化、没人发布、也不会有人收到过期提醒。

## 零、怎么复核 / 怎么重生成

```bash
cd iskill-promo-page
node scripts/check-platform.mjs            # 三方核验：判定 ↔ 本地徽章 ↔ 线上徽章 + Pages 状态
node scripts/check-platform.mjs --offline  # 不联网，只比 判定 ↔ 本地徽章
node scripts/check-platform.mjs --md       # 额外吐出可直接贴进本文「落地页线上地址」一节的大表
node scripts/scan-platform-code.mjs        # 重扫代码里的平台专属符号（判定列「关键依据」的原料）
```

- 退出码 `1` = 存在 ERROR（`BADGE-STRONGER` 徽章比判定更强 / `SYNC-DIFF` 本地与线上不一致 / `OFFLINE` 公开仓但线上取不到），可用于发布前检查。
- **私有仓跳过（2026-10-03 起）**：`check-platform.mjs` 顶部 `SKIP_PAGES` 清单（现含 `iskill-build-books` / `iskill-lang-scene-app`）
  内的仓**不做线上探测、不查 Pages、sync 记 `SKIP`、归 INFO** —— 免费计划私有仓本就开不了 Pages，
  探测必然 404，不是故障。若日后把仓改公开：从清单移除名字即恢复核验（脚本发现「清单内但已公开」会报 `SKIP-STALE` WARN 提醒）。
- `scan-platform-code.mjs` **只给线索、不给档位**：同样是 `/Users/<name>`，包在 `try` 里带回退 = 跨平台；
  写死在主路径 = 仅 macOS。**档位必须由人读上下文确认**，确认结果写回本文件。

> 方法：扫**可执行代码**（`.sh/.py/.mjs/.js/.ts/.command/.ps1/.bat/.cmd`）里的平台专属符号 ——
> `sips` / `osascript` / `pbcopy` / `open` / `lsof` / `launchctl` / `/Applications` / `/opt/homebrew` /
> 写死的 `/Users/<name>` / POSIX 冒号 PATH 分隔符 / `kill -0` ⇄ `.ps1` / `taskkill` / `%APPDATA%` /
> `process.platform==="win32"` / `winreg` / `mklink`。
> 判定只认**代码事实**，不认文档里的「应该支持」。

## 三档口径

| 档位 | 含义 | 徽章怎么写 |
|---|---|---|
| ✅ **Mac & Win** | 主流程两边都能跑，或平台专属依赖已被**自动降级 / 回退**兜住 | 双平台：`"all"` 或 `"mac-windows"` |
| ⚠️ **Mac & Win（某档能力单平台）** | **主产物两边都能出**，但至少一档内置能力在某平台上**完全不可用、且没有自动降级**（要装 Git Bash / 手工替代 / 自备预处理素材） | 仍写**主流程**平台（`mac-windows`）；限定条件写进本表「关键依据」列与落地页正文，**不挤进徽章** |
| ❌ **仅 macOS（Windows 跑不了）** | 核心路径硬依赖 macOS 专属命令或 bash，且无回退 —— 换平台**主产物根本出不来** | 单平台：`"macos"`（Windows 专属则 `"windows"`） |

> **为什么 ⚠️ 档徽章不写限定语**：Hero 徽章只有 5 档刻度（`all` / `mac-windows` / `macos` / `windows` / `linux`），
> 塞进「部署需 Git Bash」这种限定会把徽章撑成一句话，反而没人读。徽章回答的是**「我这台机器能不能用」**，
> 限定条件是**「用的时候要注意什么」**——分开放。
>
> ⚠️ **标错比不写更糟** —— 用户照标签装了发现跑不了，比没标签伤害大。判据见 `content.js` 的注释。
> 两个方向危害不同：**徽章比判定强 = ERROR**（用户装了跑不了）；**徽章比判定弱 = WARN**（保守，但会劝退本可用的用户）。

## 清点表

| 技能 | 判定 | 关键依据（代码位置） |
|---|---|---|
| `iskill-app-icon` | ✅ **本次改造**（Windows 未实测） | 四处改动：①`render_png.py` 浏览器候选按 `sys.platform` 分支探测 —— Windows 认 `Program Files` / `Program Files (x86)` / `%LOCALAPPDATA%` 下的 `chrome.exe` / `msedge.exe`（Edge 随系统预装，通常免装），Linux 认 PATH 与 `chrome-linux` 缓存；②页面图源改走合法 `file://` URI（`C:\…` 直接写进 `<img src>` 会被当 scheme「c:」，图根本加载不到 —— 这坑只在 Windows 暴露）；③入口收敛为真源 `scripts/make_all.py` + 三个薄壳（`make-all.sh` / `.ps1` / `.cmd` 只负责找解释器转参数）；④`make-samples.sh` 的写死 `/Users/lv` 改 `$HOME`。 |
| `iskill-headroom-workbuddy2api` | ✅ **同类改造范例** | 原来是 bash + `lsof` + `open` + 写死 python 路径 → 已重构为跨平台 `scripts/hwb.py` + `hwb.command` / `hwb.ps1` / `hwb.cmd` |
| `iskill-script-launcher` | ✅ | 方法论 + 模板，自身零平台依赖（`templates/launcher.py` 纯 stdlib，内含两平台分支）；它教的是「怎么让别人的脚本跨平台」 |
| `iskill-workbuddy-deepseek` | ✅ （Windows 未实测） | 纯 Node ESM 零依赖（`scripts/ds-sync.mjs`）：分区路径由 `os.homedir()` 推导、leveldb 走裸缓冲扫描，无平台专属命令；剪贴板三分支 `darwin→pbcopy` / `win32→clip` / Linux→`wl-copy\|xclip\|xsel`。注：功能本身依赖 WorkBuddy 的分区目录 —— 那是**平台锁定，不是 macOS 锁定**；落地页徽章写「macOS 已实测」（自定义文案），与本文档口径不冲突 |
| `iskill-huggingface-ext` | ✅ | 本来就是双实现：`scripts/migrate.sh`（macOS/Linux）+ `scripts/migrate.ps1`（Windows，含 `mklink` / Junction 降级） |
| `iskill-lang-scene-app` | ✅ | `scripts/app.mjs` 有 `process.platform` 分支；TTS 缺失时回落 Web Speech |
| `iskill-ui-verify` | ✅ | 纯 Node，路径用 `homedir()` 推导；唯一 POSIX 味是默认输出目录 `/tmp/ui-shots`（Windows 下解析成 `C:\tmp\...`，可用） |
| `iskill-build-books` | ✅ | 纯 Node/Vite；`scripts/lib/deps.mjs` 里 `/usr/bin/which` 包在 `try` 内、失败自动回退其它候选 |
| `iskill-dig-media` | ✅ | 纯 Node；已显式处理 `.bat` / `.cmd` |
| `iskill-generative-bgm` | ✅ | 纯 Web Audio / ESM，零外部命令 |
| `iskill-geometric-bg` | ✅ | 纯 Node（mulberry32 种子随机） |
| `iskill-music-beats` | ✅ | Python + librosa/soundfile，无平台命令 |
| `iskill-pwa-guideline` | ✅ | 纯规范文档，无脚本 |
| `iskill-content-precheck` | ✅ | 纯提示词 |
| `iskill-copy-deslop` | ✅ | 纯提示词 |
| `iskill-hot-topic-scout` | ✅ | 纯提示词 |
| `iskill-viral-copywriter` | ✅ | 纯提示词 |
| `iskill-viral-teardown` | ✅ | 纯提示词 |
| `iskill-video-clipper` | ✅ | 核心是 Python/Node + ffmpeg 多路径探测；`/opt/homebrew` 只出现在 `reference/shader-scan/`（开发用参考件）。注：剪映**自动导出仅 Windows**，macOS 走剪映内手动导出 —— 两边都有内置路径，只是自动化程度不同，故仍属 ✅ |
| `iskill-promo-page` | ⚠️ **部署仅 POSIX** | 生成侧全跨平台：`init.mjs` / `sync-shared.mjs` / `add-sponsor.mjs` / `check-platform.mjs` 都是纯 Node；但**发布动作** `pages.sh` / `deploy.sh` 是 bash + `/opt/homebrew` —— Windows 上生成没问题，发布要装 Git Bash 或手工 `git push`（无自动降级）。徽章仍写 `mac-windows`（主流程平台），限定条件在此 |
| `iskill-generate-sponsors` | ⚠️ | 生成器 `gen-sponsors.mjs` 跨平台（无 `sips` 时降级为原样拷贝，注释明写支持 Linux/Windows）；但**二维码自动裁剪**（`lib/qrcrop.mjs` 走 sips 的 BMP 管道）与**截图**（`shoot.mjs` 用 mac Chrome 路径）在非 macOS 上完全不可用，需自备已裁好的方图 —— 无自动降级，故归 ⚠️ |
| `iskill-crop-qrcode` | ❌ **仅 macOS** | 核心裁剪全靠 `sips`（`scripts/crop.mjs`），SKILL.md 自述「非 macOS 直接报错退出」 |
| `iskill-github-publisher` | ❌ **仅 macOS** | 全是 bash（`gh-push.sh` / `publish.sh` / `pages.sh`）+ 写死 `/opt/homebrew/bin/gh` + `osxkeychain` 处理 |
| `iskill-media-transcribe` | ❌ **仅 macOS** | `lib/audio.mjs` / `lib/download.mjs` 把 `/opt/homebrew/bin` 拼进 PATH 且用 POSIX 冒号分隔；`lib/asr.mjs` 写死 `/Users/lv/.workbuddy/...` |
| `iskill-pipeline-dashboard` | ❌ **仅 macOS**（易修） | 入口是 `bin/start.sh`（bash，用 `kill -0`）；且写死 `/Users/lv/.workbuddy/binaries/node/...` 作 node 回退。核心 `server/index.ts` 本身是跨平台 Node |
| `iskill-super-mark` | ❌ **仅 macOS** | `scripts/lib/audio.mjs` 写死 `/Users/lv/.workbuddy/...` 与 `/usr/bin/which`、`/opt/homebrew/bin/ffmpeg`；`scripts/mark.mjs` 调 `open` |

> **无头渲染别踩的两个坑**（`app-icon` 改造时实测，Chrome 154 for Testing / macOS）：
> ① 裸 `--headless --disable-gpu`、**不传 profile** 才稳；传 `--user-data-dir=<临时目录>` 会
> 让 Chrome 截完**不退出**（同命令单跑 >7min 只能 kill）——「加 `--user-data-dir` 更健壮」是**反的**；
> ② 优先 `--headless=new` 会在部分 Chrome 上让 GPU 进程 FATAL（`GPU process isn't usable`，exit 6）。
> 正解是 `for flag in ("--headless", "--headless=new")`：先裸的，失败再退新的。

## 小结

- **✅ Mac & Win：19 个**（含本轮的 `app-icon`）
- **⚠️ 部分能力单平台：2 个** —— `promo-page`（部署需 Git Bash）、`generate-sponsors`（二维码裁剪 / 截图）
- **❌ 仅 macOS：5 个** —— `crop-qrcode`、`github-publisher`、`media-transcribe`、`pipeline-dashboard`、`super-mark`
- **累计改造：2 个** —— `headroom-workbuddy2api`（2026-10-02）、`app-icon`（2026-10-02）

### 想做「仅 macOS → 双平台」的后续清单（按性价比排序）

| 技能 | 改什么 | 量级 |
|---|---|---|
| `pipeline-dashboard` | 用 node 重写 `bin/start.sh`（或加 `start.ps1`）；node 回退路径改成探测 | 中 |
| `super-mark` | `audio.mjs` 的候选路径改成 `shutil.which` 式探测 + `path.delimiter`；`mark.mjs` 的 `open` 换 `webbrowser` 等价物 | 中 |
| `media-transcribe` | PATH 拼接改 `path.delimiter`、去掉写死 `/Users/lv`；ffmpeg 探测补 Windows 候选 | 中 |
| `generate-sponsors` | 二维码裁剪 / 截图补 Windows 与 Linux 分支（或改用纯 JS 图像解码），即可从 ⚠️ 升 ✅ | 中 |
| `github-publisher` | 20+ 处 bash → 一个 `gh-publish.mjs`（沿用 headroom 那套「一份实现 + 薄壳」） | 大 |
| `crop-qrcode` | `sips` 管道要换纯 JS 图像解码（或引入 sharp，破坏「零依赖」） | 大 |

## 落地页线上地址（统一 gh-pages 分支模式）

发布：`iskill-promo-page/scripts/deploy.sh <仓库> --set-pages`（零工作流、无红叉、不动工作区）。
地址规律：`https://aispin.github.io/<仓库名>/`。

**2026-10-02 22:2x 复核：24/24 公开仓全部在线** —— `gh api .../pages` = `built`，
且逐仓 `curl` 首页与 `assets/content.js` 双 200。

**2026-10-02 23:3x 复核（`check-platform.mjs` 全量，`app-icon` 已重新部署后）**：
`TOTAL=26  ✅=19 ⚠️=2 ❌=5`、`pages.built=24`、**`SAME=24  DIFF=0  OFFLINE=2`**、退出码 `0`（零 ERROR）。
两个 `OFFLINE` 是 `build-books` / `lang-scene-app` 的私有仓（免费计划开不了 Pages，属设计如此、非故障）。

**2026-10-03 起：两个私有仓改为显式跳过** —— 用户决定保持私有，`check-platform.mjs` 的 `SKIP_PAGES` 清单
把它们从核验里摘出（`SKIP=2  OFFLINE=0`），不再以 OFFLINE 形态出现在输出里。gh-pages 分支资产保留在仓里，
哪天改公开，Pages 会自动构建，同时把仓名从清单移除即恢复核验。

> 复核过程中 `app-icon` 一度是 `DIFF=1`（本地徽章已改 `mac-windows`、线上还是旧的 `"macos"`），
> 跑一次 `deploy.sh iskill-app-icon --set-pages` 后即归零 —— 这正是「发布没跟上」这类漂移的典型形态，
> 也是这套核验存在的意义：**改完徽章别忘了重新部署**。

| 技能 | 线上 platform 徽章 | 状态 |
|---|---|---|
| `iskill-app-icon` | macOS / Windows | ✅ 200（本次由「仅 macOS」升级并已重新发布） |
| `iskill-content-precheck` | 全平台 | ✅ 200 |
| `iskill-copy-deslop` | 全平台 | ✅ 200 |
| `iskill-crop-qrcode` | 仅 macOS | ✅ 200 |
| `iskill-dig-media` | 全平台 | ✅ 200 |
| `iskill-generate-sponsors` | macOS / Windows | ✅ 200 |
| `iskill-generative-bgm` | 全平台 | ✅ 200 |
| `iskill-geometric-bg` | 全平台 | ✅ 200 |
| `iskill-github-publisher` | 仅 macOS | ✅ 200 |
| `iskill-headroom-workbuddy2api` | macOS / Windows | ✅ 200 |
| `iskill-hot-topic-scout` | 全平台 | ✅ 200 |
| `iskill-huggingface-ext` | macOS / Windows | ✅ 200 |
| `iskill-media-transcribe` | 仅 macOS | ✅ 200 |
| `iskill-music-beats` | 全平台 | ✅ 200 |
| `iskill-pipeline-dashboard` | 仅 macOS | ✅ 200 |
| `iskill-promo-page` | macOS / Windows | ✅ 200 |
| `iskill-pwa-guideline` | 全平台 | ✅ 200 |
| `iskill-script-launcher` | 全平台 | ✅ 200 |
| `iskill-super-mark` | 仅 macOS | ✅ 200 |
| `iskill-ui-verify` | 全平台 | ✅ 200 |
| `iskill-video-clipper` | macOS / Windows | ✅ 200 |
| `iskill-viral-copywriter` | 全平台 | ✅ 200 |
| `iskill-viral-teardown` | 全平台 | ✅ 200 |
| `iskill-workbuddy-deepseek` | macOS 已实测 | ✅ 200 |
| `iskill-build-books` | — | ⊘ 跳过（**有意私有**，2026-10-03 用户决定）—— 免费计划不支持私有仓库 Pages；gh-pages 分支已推好，日后改公开即自动生效 |
| `iskill-lang-scene-app` | — | ⊘ 跳过（同上） |

> 线上徽章与本文档判定对齐，**口径是「主流程平台」**：5 个「仅 macOS」= `crop-qrcode` / `github-publisher` /
> `media-transcribe` / `pipeline-dashboard` / `super-mark`；⚠️ 档 2 个徽章写双平台、限定条件在正文（见三档口径）。
>
> `build-books` / `lang-scene-app` 这 2 个私有仓库的 gh-pages 分支已就位、`git push` 已完成；
> **2026-10-03 用户决定保持私有、核验跳过**（见零节 `SKIP_PAGES`）。若日后改公开：Pages 会自动开始构建，
> 也可跑 `pages.sh gh-pages <owner/repo> --apply` 立即触发配置，同时把仓名从 `SKIP_PAGES` 清单移除。
