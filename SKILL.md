---
name: iskill-promo-page
summary: 给任何 skill / 工具 / 项目生成落地推广页（中英双语 + 深浅色跟随系统），静态自包含、零依赖零构建，附一键推 gh-pages 与 GitHub Pages 各种发布方案，支持在 Hero 下方插入「槽位」嵌入本技能特有的内容（如自带样式的 usage.html，自动跟随主题/语言），以及可选的 Hero 赞助按钮模块。
description: 当用户要给某个 skill、工具、开源项目做「落地页 / 推广页 / 介绍页 / landing page」，或要把静态页部署发布到 GitHub Pages / gh-pages，或要给已有落地页「增加赞助模块 / 加个赞助按钮 / 加打赏入口」，或要把某个自包含页面（usage.html 之类）嵌进落地页时使用。触发词：落地页、推广页、landing page、介绍页、主页、gh-pages、GitHub Pages、宣传页、部署落地页、增加赞助模块、赞助按钮、打赏入口、槽位、slot、嵌入 usage.html。产出 <目标>/promo-page/（或 --out docs/、--out . 铺到仓库根）自包含静态站点 + 可选 .github/workflows/promo-page.yml + scripts/deploy.sh（一键推发布分支）+ scripts/add-sponsor.mjs（显式触发才用的赞助按钮），逐技能只需改一个内容文件。
---

# iskill-promo-page 落地推广页生成器

把「一个 skill 干了什么」讲成一页能直接发出去的网页：**中英双语、深浅色跟随系统、零依赖零构建、静态自包含**，整目录可原样同步到 gh-pages 或作为 Actions 产物发布。

## 一、产出物

```
<目标>/
├── promo-page/                    ← 自包含静态站点，整体可直接发布
│   │                                 （--out docs 则叫 docs/；--out . 则直接铺在仓库根）
│   ├── index.html                 ← 页面骨架（改顶部 8 行 meta；Hero 按钮下方带 slot 锚点）
│   ├── .nojekyll                  ← 别删：分支模式下这是「跳过 Jekyll」的开关
│   └── assets/
│       ├── content.js             ← ★ 唯一需要逐技能改的文件（双语内容）
│       ├── style.css              ← 设计系统（改品牌色不用动它）
│       ├── app.js                 ← 主题/语言/渲染/复制/入场动画
│       ├── icons.js               ← 内联 SVG 图标集
│       └── favicon.svg / og.png / shot-*.png
└── .github/workflows/promo-page.yml   ← 可选：推 main 自动发布（--out docs 默认不生成）
```

`file://` 双击 `index.html` 就能看（刻意不用 ES module，避免本地 CORS 拦截）；上传后也只用相对路径，`https://<user>.github.io/<repo>/` 子路径下正常。

> 默认产出里**没有任何赞助痕迹**——多数技能不需要赞助模块，内置进去等于给所有人加一个用不上的按钮。
> 用户**显式说「增加赞助模块」**时才跑 `scripts/add-sponsor.mjs`（见 §十），
> 它会在 Hero 区 View Source 右侧加一个赞助按钮，弹层由 `iskill-generate-sponsors` 的 embed 片段提供。

## 二、铺骨架

```bash
S=<SKILL_DIR>/scripts/init.mjs
N=${NODE:-$(command -v node || echo node)}

# 默认：Actions 产物模式（promo-page/ + 工作流）
$N $S --target /path/to/iskill-xxx

# ⭐ 不想用工作流：目录命名成 docs/，走「Deploy from a branch → main /docs」
#    （Pages 分支模式只认 / 和 /docs，选不了 promo-page/ —— 见 references/deploy-modes.md）
$N $S --target /path/to/iskill-xxx --out docs

# ⭐ 落地页**就是仓库首页**（旁边还躺着它要展示的 usage.html / sponsors.html 之类）：
#    直接铺进仓库根，配「Deploy from a branch → main /(root)」，同样零工作流。
#    逐文件铺，遇到同名文件默认跳过（不会覆盖 SKILL.md、scripts/ 或已有页面）。
$N $S --target /path/to/iskill-xxx --out .

# 仓库 Pages 已设成 "Deploy from a branch"（gh-pages 分支）时：
$N $S --target /path/to/iskill-xxx --branch-mode

# 只要骨架、完全不生成工作流：
$N $S --target /path/to/iskill-xxx --no-workflow

# 已有同名目录要覆盖
$N $S --target /path/to/iskill-xxx --force
```

| 参数 | 作用 |
|---|---|
| `--out <name>` | 站点目录名，默认 `promo-page`。**传 `docs` 才能用免工作流的分支模式**；传 `.` = 直接铺进仓库根（落地页当仓库首页，逐文件铺、同名默认跳过） |
| `--no-workflow` | 不生成 `.github/workflows/promo-page.yml` |
| `--branch-mode` | 工作流模板换成「推 gh-pages 分支」 |
| `--force` | 覆盖已存在的同名目录 / 工作流 |

## 三、逐技能只改一个文件

`promo-page/assets/content.js`：

```js
window.PROMO = {
  name: "ISKILL-XXX",
  brand: "#7c5cff",  brand2: "#22d3ee",   // 品牌色会注入 CSS 变量
  repo: "https://github.com/aispin/iskill-xxx",
  repoLabel: "aispin/iskill-xxx",         // 可选：顶栏胶囊显示的仓库名，不写就从 repo 推导
  // installPrompt: { zh, en },           // 可选：覆盖默认的安装提示词，可用 {repo}/{repoShort}/{name}
  lang: {
    zh: { meta, ui, nav, hero, terminal|chat, stats, compare, features, showcase, steps, faq, cta, footer },
    // hero 右栏可视化：terminal（shell 输出，默认）或 chat（Agent 对话气泡，二选一，配了 chat 优先）。
    // chat = { title, status, userLabel, agentLabel, messages:[{role:"user"|"agent", text, tag?}] }
    // skill 面向 AI agent 时建议用 chat —— 展示「对话现场」比终端输出更贴切。
    en: { /* 同上，键一一对应，缺了会渲染成空 */ }
  }
};
```

外加 `index.html` 顶部那 8 行 meta（title / description / theme-color / og:*）。

**安装方式默认是「让 agent 去装」，不用你写安装命令。** 两个复制按钮（Hero + 结尾 CTA）复制的内容由 `repo`
自动推导：

| 语言 | 复制出来的内容 |
|---|---|
| zh | `请帮我安装 Skill：https://github.com/aispin/iskill-xxx，并告诉我它的用法` |
| en | `Install this skill: https://github.com/aispin/iskill-xxx and tell me how to use it` |

两个地方会用到它：① `#hero-copy` / `#cta-copy` 按钮；② `steps` 里写 `codeKey: "install"` 的那一步（会渲染成
一个带品牌色描边的 `prompt` 代码块）。**别在 content.js 里手抄一遍 URL** —— 改仓库地址时只改一处。

**steps 三步契约**（详情见 references/design-guide.md）：①装（`codeKey:"install"`）→ ②说一句你要什么
（`codeName:"prompt"`，自然语言需求，不是命令）→ ③验收产物（需要人亲自看/操作才写；path 写得准才写 code 块）。
不要在第 2/3 步给用户命令行——skill 的用户是 agent，命令由 agent 跑。

`ui: { copy, copied, failed }` 是复制按钮的三种反馈文案，随语言切换；不写就回落成中文默认值。

> 仓库名越长，顶栏越早进入降级（截断 → 只留图标）。`owner/repo` 超过 ~20 字符就别再手动加长 `repoLabel`，
> 顶栏那点位置不够 —— 完整名字在正文与页脚都还有地方放。

**页面八段**（按顺序）：Hero（标题+副标题+CTA+终端窗）→ 数字条 → 之前/现在对比 → 能力卡 → 实拍图 → 三步上手（带代码块）→ 问答 → 结尾 CTA。

> **Hero 标题上方是两个标签**（`content.js` 驱动）：
>
> | 标签 | 内容 | 怎么写 |
> |---|---|---|
> | 第 1 枚（固定） | 「**AI 技能** / **AI skill**」 | 写死，不用管。**别写 agent 平台名**——这些技能是纯文本 + 脚本，Claude Code、Cursor、Codex 等任何能读 SKILL.md 的 agent 都能装能用，写成某一家专属会劝退一半人 |
> | 第 2 枚（平台兼容性） | macOS / Windows / Mac&Win | `content.js` 的 `platform` 字段，见下表 |
>
> ```js
> platform: "mac-windows"   // 默认值
> ```
>
> | 取值 | 显示 | 什么时候用 |
> |---|---|---|
> | `"mac-windows"` | macOS / Windows | 脚本两边都能跑 |
> | `"macos"` | 仅 macOS | 用到 `sips` / `osascript` / `open` / `lsof` / `/opt/homebrew` 硬路径 |
> | `"windows"` | 仅 Windows | 依赖 Windows 独有能力（如 UI 自动化） |
> | `"linux"` | 仅 Linux | 同上 |
> | `"all"` | 全平台 | 纯提示词 / 纯 Node·Python 且不调平台命令 |
> | `""` | 隐藏整条 | 不想声明 |
> | `{ zh: "…", en: "…" }` | 自定义文案 | 想写得更具体（如「macOS 10.15+」） |
>
> ⚠️ **标错比不写更糟** —— 用户照标签装了发现跑不了，比没标签伤害大。判据见 `content.js` 的注释。

**26 个 iskill 技能当前的徽章口径台账 → `docs/PLATFORM-MATRIX.md`**（三档口径 + 逐技能判定依据 + 落地页在线状态）。
改了任何技能的平台能力后，跑一次三方核验，别让徽章与代码事实漂移：

```bash
node scripts/check-platform.mjs            # 判定 ↔ 本地徽章 ↔ 线上徽章 + Pages 状态（退出码 1 = 有 ERROR）
node scripts/check-platform.mjs --offline  # 不联网，只比 判定 ↔ 本地徽章
node scripts/check-platform.mjs --md       # 顺便吐一张可贴进文档的大表
# 私有仓（脚本顶部 SKIP_PAGES 清单，2026-10-03 起）跳过线上探测与 Pages 检查：
# sync=SKIP、归 INFO，不算 OFFLINE —— 免费计划私有仓开不了 Pages，探测必然 404，不是故障
node scripts/scan-platform-code.mjs        # 重扫代码里的平台专属符号（判定列「关键依据」的原料）
```

两个方向危害不同：**徽章比判定强 = ERROR**（`BADGE-STRONGER`，用户装了跑不了）；
**徽章比判定弱 = WARN**（`BADGE-WEAKER`，保守但会劝退本可用的用户）。

### 槽位：把「本技能特有」的东西插进页面

八个段落是通用骨架，但总有些技能想给落地页塞自己的东西（一个能点的演示、一段专属说明、
一张比对表）。**槽位**就是为此留的：骨架里已经有锚点，你只管往 `content.js` 里声明。

**锚点**（`index.html` 里，Hero 的 CTA 按钮下方、跨满两栏）：

```html
<div class="slot" data-slot="hero"></div>
```

**配置**（`content.js` 的**顶层** `slots`，注意不在 `lang.zh/en` 里 —— 槽位的「形态」与语言无关，
只有里面的文案才分语言）：

```js
window.PROMO = {
  // …
  slots: {
    hero: {
      // 二选一，同时给时 iframe 优先
      html: { zh: "…内联 HTML…", en: "…" },                 // ① 一段内容，可双语
      iframe: {                                            // ② 嵌一个自包含页面
        src: "usage.html",
        height: 760,
        title: { zh: "用法演示", en: "Live demo" }          // 无障碍标题，可省
      }
    }
  }
};
```

| | `html` 形态 | `iframe` 形态 |
|---|---|---|
| 用途 | 一段说明、几个链接、一张表 | 嵌一个**自带完整样式**的单文件页（如 `usage.html`） |
| 样式 | 会被父页排版接管（`.slot-html` 下） | 完全独立，父页 CSS 进不去 |
| 跟随语言/主题 | 双语直接切 | 见下 |

**关键约定：不配 = 什么都没有。** 锚点为空时 `:empty` 命中 `display:none`，
整块消失**且不占网格行** —— 所以给老技能的落地页加上这个锚点也是零变化。

**iframe 怎么跟随宿主**（两条通道，各管一段）：

| 时机 | 通道 | 为什么这么选 |
|---|---|---|
| 首次加载 | 把 `#lang=&theme=` 拼进 `src` | hash 在子页自己的头脚本里**最先**被读到，没有「监听器还没绑上」的竞态 |
| 之后切换 | `postMessage` | **不重载 iframe** —— 重载会丢子页状态（用户可能已经切到某个 tab），还会闪 |

子页要跟随就加这么一段（**不认也不报错，只是不跟随**；`sync: false` 可让父页彻底别发）：

```js
// 首帧：先读 hash
var t = (location.hash.match(/theme=(light|dark)/) || [])[1];
var l = (location.hash.match(/lang=(zh|en)/) || [])[1];
// 之后：听父页推过来的
window.addEventListener('message', function (e) {
  var s = e.data && e.data.promoSlotSync;
  if (!s) return;                       // s.lang = "zh"|"en"  s.theme = "light"|"dark"
});
```

**子页自己要自带语言/主题开关时，记得「被嵌就收起」**。否则宿主顶栏一套、子页头部又一套，
上下两个同样的 `中/EN` 和月亮按钮，看着像两张页面叠在一起。判定与样式都很短：

```js
var framed = true;                        // 跨源时读 window.top 会抛 → 也当被嵌
try { framed = window.self !== window.top; } catch (e) {}
document.documentElement.toggleAttribute('data-embedded', framed);
```
```css
:root[data-embedded] .lang-sw, :root[data-embedded] #theme-btn { display: none; }
```

判定要放在**子页头脚本里**（`<style>` 之前），首帧就不闪；单独打开时开关照常出现，
所以「能不能独立访问」这条能力一点没丢 —— 只是嵌进来时不再重复。（实例见
`iskill-generate-sponsors/scripts/render-source.mjs` 生成的头脚本。）

**要新增槽位**（不止 Hero 这一个位置）：在 `index.html` 目标 section 里加一行
`<div class="slot" data-slot="随便什么名字"></div>`，再去 `slots` 里配同名键即可 ——
`app.js` 认得任意 `[data-slot]`，**不用改 JS**。放在网格容器里就自动跨满整行
（`.slot { grid-column: 1 / -1 }`）。

> 实例：`ISkills/iskill-generate-sponsors/` 的落地页把它的 `usage.html`（源码复制工具）
> 嵌在 Hero 槽位里 —— 首页一眼就能看到真东西，而不用再点走。


## 四、主题与语言（默认都跟随系统）

| 机制 | 行为 |
|---|---|
| 主题 | 首帧前内联脚本打 `.dark`/`.light`；优先级 `?theme=` → localStorage → 系统 |
| 语言 | 同上，`?lang=zh\|en`；默认按 `navigator.language` 判中文 |
| 记忆 | 用户手动切过才写 localStorage；URL 参数只作用于本次加载 |
| 直达 | `?lang=en&theme=dark`（分享、截图、出图用） |
| 截图档 | `?reveal=all` 一次性解除滚动入场动画 —— **整页截图必须加**，否则没滚到的区块是透明的 |

## 五、铁律

1. **只放真截图，别放效果图或占位图。** 实拍区（showcase）没图就留空数组，整段会自动隐藏。
2. **截图用 iskill-ui-verify 自己拍**，不要手工截。命令见下：
   ```bash
   $N <ui-verify>/scripts/ui.mjs shots --url "http://127.0.0.1:8899/?reveal=all&lang=zh" \
     --out <目标>/promo-page/assets --name shot --matrix "theme=light,dark" --height 1600 --scale 1
   ```
   `--name og` 配 `--width 1200 --height 630 --scale 1` 出社交分享图。
3. **自包含**：不放 CDN 外链（离线可用、Pages 子路径不出错），图片放 `assets/`。
4. **不要把资源放进 `.github/`**：GitHub Pages 硬封锁 `.github/*` 路径，引用了必 404。
5. **品牌色只写在 content.js**，别去拷改 style.css —— 换色靠 CSS 变量注入。
6. 图标全用 `icons.js` 的内联 SVG，**不用 emoji**（跨平台渲染不一致，且无法跟随品牌色）。
7. **顶栏是一行不换行的 flex，必须显式定义收缩优先级**，不能指望浏览器自己分。不定优先级的结果一定是
   三件事同时发生：品牌名塌成 `I…` + 导航在词中间折行（36px 的链接被撑到 59px、顶破 62px 顶栏）+
   长仓库名胶囊纹丝不动。规则：**控件 `flex:none` 永不动 → 导航 `nowrap` 永不折行 → 品牌最后退**。
   完整阶梯与临界值推导见 `references/design-guide.md` §六。
8. **安装路径讲「让 agent 装」，别让用户抄命令。** 一键复制的是说给 AI 的一句话（由 `repo` 推导）。
9. **赞助模块默认不生成。** 模板里不放任何赞助痕迹，只有用户显式说「增加赞助模块」才跑 `add-sponsor.mjs`（§十）。
   写死 `~/.workbuddy/skills/` 这类路径等于替用户做了错决定 —— 装哪个目录取决于他用哪个 agent。
   手动安装方式作为**逃生口放进 FAQ**（"能不能不用 AI，手动装？"），而不是当成主推路径。

## 六、交付前自查

```bash
# 起临时静态服务器
cd <目标>/promo-page && python3 -m http.server 8899

# 结构 + 双语断言（ui-verify）
$N <ui-verify>/scripts/ui.mjs check --url "http://127.0.0.1:8899/?reveal=all&lang=zh" --wait 2600 \
  --case "能力卡=document.querySelectorAll('#features .feat').length>3" \
  --case "步骤齐=document.querySelectorAll('#how .step').length>=3" \
  --case "问答齐=document.querySelectorAll('#faq details').length>=3" \
  --case "复制的是提示词=/^请帮我安装 Skill：https:\/\/github\.com\//.test(document.querySelector('#hero-copy').getAttribute('data-copy'))" \
  --case "无占位残留=!/示例技能|Example skill|ISKILL-EXAMPLE/.test(document.body.innerText)"

# 顶栏：≥4 档宽度都要过（折行 / 塌缩 / 横向滚动 是三种互相独立的失败模式，只测一种会漏）
for W in 1160 900 730 390; do
  $N <ui-verify>/scripts/ui.mjs check --url "http://127.0.0.1:8899/?reveal=all&lang=en" --width $W --height 900 --scale 1 --wait 2600 \
    --case "顶栏不折行=[...document.querySelectorAll('.nav a')].every(a=>a.getBoundingClientRect().height<44)" \
    --case "品牌未塌缩=document.querySelector('.brand').getBoundingClientRect().width>=24" \
    --case "无横向滚动=document.documentElement.scrollWidth<=document.documentElement.clientWidth+1"
done
```

人工再过一遍：① 中英切换后没有半句残留 ② 四变体（zh/en × light/dark）观感都对 ③ 没有横向滚动条 ④ 控制台无报错 ⑤ `assets/og.png` 存在。

> ⚠️ 截图/自查时 `?theme=` 不写就是跟随系统，而无头浏览器默认报**深色** —— 想截浅色必须写 `?theme=light`，
> 否则两张"不同主题"的图其实是同一张。

## 七、部署

> **先记住**：Pages 的「Deploy from a branch」**只认 `/`（根）与 `/docs` 两个目录**，无法指向
> `promo-page/`。所以「保留子目录 + 零工作流」只有一个解 —— 把目录命名成 `docs/`（`--out docs`）。
> 完整对比、实测数据与坑表见 **`references/deploy-modes.md`**。

| 模式 | 站点目录 | 工作流 | Pages 设置 |
|---|---|---|---|
| **① Actions 产物**（默认） | `promo-page/` | `promo-page.yml` | Source = **GitHub Actions** |
| **② 免工作流** | `docs/`（`--out docs`） | 无 | Deploy from a branch → `main` / **`/docs`** |
| ③ 免工作流 · 根目录 | 仓库根 | 无 | Deploy from a branch → `main` / `/(root)` |
| **④ gh-pages 分支** | 任意 | `promo-page-branch.yml` 或 **`scripts/deploy.sh`** | Deploy from a branch → `gh-pages` / **`/(root)`** |

模式之间**别同时开**（分支模式与 Actions 产物会互相覆盖，表现是「改了不生效」）。

### 7.1 一键部署（目标项目是 git 仓库时）

**要发布，直接跑这一条**——它会探测站点目录、把内容推成本地 `gh-pages` 分支、再尽力 `git push`：

```bash
S=<SKILL_DIR>/scripts/deploy.sh                # <SKILL_DIR> = 本技能所在目录

bash $S <目标目录>              # 建本地 gh-pages 分支 + 尝试推送
bash $S <目标目录> --set-pages  # 推完顺手把 Pages 指向 gh-pages
bash $S <目标目录> --dry-run    # 只看计划，不写任何 ref、不推送
```

> 站点目录（`promo-page/` 或 `docs/`）留在**目标项目**里，部署脚本留在**本技能**里 —— 目标项目不需要多出一堆部署脚本。

| 参数 | 作用 |
|---|---|
| `--dir <name>` | 站点目录名，默认自动探测 `promo-page/` → `docs/` |
| `--branch <name>` | 发布分支名，默认 `gh-pages` |
| `--repo <owner/repo>` | 直接指定 GitHub 仓库（优先级最高；本地没配 remote 时很有用） |
| `--no-push` | 只更新本地发布分支，不推远端 |
| `--dry-run` | 只打印计划 |
| `--set-pages` | 推成功后调 `pages.sh gh-pages --apply` 配好 Pages |

行为约定（**重要，别当成故障**）：

- **只在 git 项目里生效**：不是 git 仓库、或目录里没有落地页 → 打印 `⏭ 跳过…` 并以**退出码 3** 结束，不算失败。
- **产出单条发布提交**：发布分支的根 = 站点目录的内容，与源码历史彻底解耦（不像 `git subtree push` 会把整个 `main` 历史拖进去）。
- **不切分支、不建临时工作区、不碰未提交改动**：用 git 底层命令（`read-tree`/`write-tree`/`commit-tree`）直接构造提交再 `update-ref`。所以**工作区脏也能跑**，发布的是工作区当前实际内容（含未提交的改动）。
- **幂等**：内容与上次发布相同就跳过提交、也不重复推送；重跑是真正的 no-op。
- **远端解析顺序**：`--repo` → `remote origin` → 用目录名 + `gh` 猜同名仓库（很多本地仓库是 token 直推建起来的，从没配过 remote）。
- **推送按统一配方**：代理 + `-c credential.helper=`（置空，防钥匙串弹窗）+ token 内嵌 + 推完 `ls-remote` 核对 sha；失败先换 HTTP 版本重试，仍失败就打印手工命令 —— **脚本不会因推送失败而报错退出**。
- 自动排除 `.DS_Store`、`.git`；站点目录缺 `.nojekyll` 会警告（分支模式下它决定要不要走 Jekyll）。

推送成功后仍差最后一步 —— 让 Pages 认这个分支：

```bash
bash scripts/pages.sh gh-pages <owner/repo> --apply      # 或网页点 Settings → Pages
```

（`deploy.sh --set-pages` 可以把这步合并进去。）

### 7.2 用脚本配 Pages

用脚本配 Pages，省得去网页点：

```bash
bash scripts/pages.sh status   aispin/iskill-xxx             # 先看看当前是什么
bash scripts/pages.sh docs     aispin/iskill-xxx --apply     # 模式 ②
bash scripts/pages.sh workflow aispin/iskill-xxx --apply     # 模式 ①
```

（默认 dry-run 只打印命令，加 `--apply` 才真改。）

> ⚠️ 推送 `.github/workflows/*.yml` 需要 token 带 `workflow` scope；`gho_` token 默认没有，推这类文件会 403
> → 先 `gh auth refresh -s workflow`。**这正是模式 ② 的一个实际好处：完全不碰工作流文件。**

### 7.3 批量发布（一堆仓库一次搞完）

ISkills 工作区 24 个技能**统一走模式 ④（gh-pages 分支）**：零工作流文件、不会被 Actions 拖出红叉，
且 `deploy.sh --set-pages` 自带「推送 + 核 sha + 配 Pages」三合一。

```bash
cd <工作区>
DEP=iskill-promo-page/scripts/deploy.sh
for d in iskill-a iskill-b iskill-c; do          # ⚠️ 见下方第 1 条，别改成 $LIST 变量
  bash "$DEP" "$PWD/$d" --set-pages
done
```

三条硬规矩（都实测踩过）：

1. **`for d in $LIST` 在 zsh 里不拆分**（bash 才拆）→ 整串被当成一个目录名，报
   `fatal: cannot change to '…': File name too long`。要内联列表，或用 `${=LIST}` / `${(z)LIST}`。
2. **已在 `main` / `(root)` 上线的仓库别重跑** —— `--set-pages` 会把它的发布源改到 `gh-pages`，
   等于改掉正在服务的配置。本工作区的 `iskill-generate-sponsors` 就属于这种，跳过。
3. **仓库里若残留 `promo-page.yml`（Actions 版工作流）要先删掉**：分支模式下它会在 push 到
   `promo-page/**` 时因「Pages 未设为 Actions」而失败，给仓库留个红叉。

发布走代理、约 1 个仓库/分钟，放后台跑并把日志收好（`LOG=/tmp/pages-$(date +%H%M%S).log`），
跑完再统一做线上验收（`curl` 拿 200 + 标题命中 + `assets/content.js` 可访问）。

## 八、排错表

| 现象 | 原因与解法 |
|---|---|
| **缩窄窗口时顶栏错乱**：导航折成两行、品牌名变 `I…`、右边仓库胶囊挤不掉 | 顶栏 flex 没定义收缩优先级。见 `references/design-guide.md` §六：`.nav a{white-space:nowrap}` + 控件 `flex:none` + `.brand{min-width:0}` 最后退，再按 1080/960/900/720/560 五档收 |
| 窄屏下仓库图标被压成 28px 扁条 | 第三档只写了 `width:34px`，但继承了基类的 `min-width:0` → 补 `flex: none` |
| 手机宽度出现横向滚动条 | 有元素既不可压又不肯让位。先量 `document.documentElement.scrollWidth - clientWidth`，再逐段注释 `* { outline: 1px solid red }` 找元凶 |
| 整页截图下半部分空白 | 滚动入场动画没解除 → URL 加 `?reveal=all` |
| 截「浅色版」和「深色版」两张图一模一样 | `?theme=` 没写、页面跟随了系统（无头浏览器默认深色）→ URL 显式加 `theme=light` |
| 某张卡片截出来是纯背景 | 元素在视口外（见 iskill-ui-verify：脚本会自动撑高视口，仍失败就用 `--full` 整页截） |
| 实拍图位置是空的 | 图片 `loading="lazy"` 未加载 → ui-verify 已在截图前顶成 eager；手写脚本时要注意 |
| 英文版有空段落 | `content.js` 里 en 漏了同名键（zh 是 key 源，两边必须一一对应） |
| 点完复制按钮，标签永久变成「复制」 | 老版 `app.js` 的 `bindCopy()` 把还原文案写死成 `"复制"` 了 —— 它会覆盖掉「复制安装提示词」这类标签。新版先存原文案再改，且只在自己还停在反馈文案时才还原（期间切了语言就不会被旧语言盖回去） |
| 按钮复制出来还是 `git clone …` | 页面里还有老版 `app.js` / `content.js`（老版读 `PROMO.install`）。新版不看 `install`，改由 `repo` 推导提示词 —— 同步这两个文件即可自愈 |
| Hero 标签写着「WorkBuddy 技能」 | 第 1 枚标签是 **agent 平台**，不能写（技能不只一个 agent 能用），改回「AI 技能 / AI skill」。**操作系统**兼容性不在这里，它在第 2 枚徽章（`content.js` 顶层 `platform`） |
| 提示词块出现横向滚动条 | `.code-prompt pre` 少了 `white-space:pre-wrap` —— 长 URL 必须换行，不能靠滚动 |
| 换品牌色没生效 | 改到 `style.css` 了 → 应该改 `content.js` 的 `brand`/`brand2` |
| 切语言后 `<title>` 没变 | 正常：`<title>` 由 `dict.meta.title` 覆盖，检查该键是否存在 |
| Pages 上图片 404 | 引用了 `.github/` 下的资源（该路径被 Pages 封锁）或用了绝对路径 |
| **Settings 里选不到 `promo-page` 目录** | Pages 分支模式只认 `/` 与 `/docs`。要么用工作流，要么 `--out docs` 重铺。见 `references/deploy-modes.md` |
| 站点打开是 README 而不是落地页 | 发布源目录选错（选到了根）→ 改 Folder；或用的是分支模式但目录名不是 `/docs` |
| 页面报 Liquid / `{{ }}` 语法错 | 分支模式下 Jekyll 在处理文件 → 站点目录里必须有 `.nojekyll`（模板自带，别删） |
| 改了 `promo-page/` 但线上没变 | ① 工作流 `paths` 没命中（目录改名了？）② 用的是分支模式而目录名不是 `/docs` ③ 两种模式同时开着互相覆盖 ④ 分支模式但**没重跑 `deploy.sh`** |
| 徽章和技能实际能不能跑对不上 | 跑 `node scripts/check-platform.mjs`：它会比「`docs/PLATFORM-MATRIX.md` 的判定 ↔ 本地 `content.js` ↔ 线上 `content.js`」，并区分 `BADGE-STRONGER`（危险）/ `BADGE-WEAKER`（保守）/ `SYNC-DIFF`（发布没跟上） |
| `deploy.sh` 打印 `⏭ 跳过` 并退出码 3 | 有意为之：目标不是 git 仓库，或目录里没有 `promo-page/`/`docs/`。先 `git init` / 先跑 `init.mjs` |
| `deploy.sh` 说「没找到 GitHub 远端」但仓库明明在 GitHub | 本地仓库没配 remote。加 `--repo owner/repo`，或 `git remote add origin …`（很多仓库是 token 直推建的，从来没配过 remote） |
| `deploy.sh` 重跑没产生新提交 | 幂等设计：站点内容与上次发布完全一致就不落空提交。改了页面自然会有 |
| 远端 `gh-pages` 内容对，Pages 还是 404 | 只推了分支，**没把 Pages 指向它** → `bash scripts/pages.sh gh-pages <owner/repo> --apply`，或 `deploy.sh --set-pages` |
| `deploy.sh` 推完提示「推送未成功」 | 网络/凭据问题，本地分支已就绪。按提示手动 `git push` 重试；脚本不会因此报错退出（退出码仍是 0） |

## 九、扩展

- 加/删段落：`index.html` 里删掉对应 `<section>`，`app.js` 里去掉那次 `render*` 调用。段落顺序即 DOM 顺序。
- **插本技能特有的内容**：用**槽位**（见 §三 末尾）—— `content.js` 里配 `slots`，或在骨架加一行
  `<div class="slot" data-slot="名字"></div>`，都不用改 JS。
- **落地页当仓库首页**：`--out .` 铺进仓库根 + Pages「Deploy from a branch → main /(root)」，
  适合「首页要展示同目录下的其它产物（`usage.html` / `sponsors.html`）」的场景。
- 加图标：往 `assets/icons.js` 里加一条 24×24、`stroke-width=1.7` 的 SVG 字符串，然后 `icon: "新键名"`。
- 改完页面**重新发布**：`bash <SKILL_DIR>/scripts/deploy.sh <目标目录>`（幂等，内容没变就不推）。
- 改设计系统（间距、圆角、字体、动效）：见 `references/design-guide.md`。
- 换部署方式：见 `references/deploy-modes.md`。
- 参考实例：`ISkills/iskill-ui-verify/promo-page/`（紫青）、`ISkills/iskill-headroom-workbuddy/promo-page/`（品牌绿 + 真实控制台截图）、
  `ISkills/iskill-generate-sponsors/`（**根目录模式 + Hero 槽位嵌 `usage.html`**）。

## 十、可选模块：Hero 赞助按钮（**默认不生成**）

**触发条件：用户显式说「增加赞助模块 / 加个赞助按钮 / 加打赏入口」。** 没说不做——
默认产出里一个字符的赞助痕迹都没有（见 §一 的说明）。

```bash
S=<SKILL_DIR>/scripts/add-sponsor.mjs

# 加
$N $S --page ./promo-page \
  --qr "支付宝=~/收款码/alipay.jpg" --qr "微信=~/收款码/wechat.jpg" \
  --paypal https://paypal.me/you --name ZEO --title "赞助支持 · 我的项目"

# 撤（按 marker 精确摘除，恢复到没加过的样子）
$N $S --page ./promo-page --remove
```

它做三件事，别的一概不碰：

| 步骤 | 结果 |
|---|---|
| 调兄弟技能 `iskill-generate-sponsors --mode embed` | 产出 `assets/sponsor-embed.js`（Shadow DOM 自包含片段，与它自己的 popup 形态同一份样式/数据）+ `assets/sponsor/*.jpg` |
| 往 `index.html` 注入 | Hero 区 **`#hero-repo`（View Source）右侧**的 `<button id="hero-sponsor" data-sponsor-open>` + `</body>` 前的 `<script defer>` |
| 往 `assets/content.js` 补词条 | `hero.ctaSponsor` 中英各一条（不放的话语言切换时按钮文案不跟着变） |

**为什么按钮用 `class="btn"` 而不加自己的 CSS**：复用页面已有的按钮样式，
视觉与「复制安装提示词 / 看源码」完全一致，**零 CSS 改动**——这样也不会有「换设计系统忘了改这里」的隐患。

**按钮的工作方式**：页面里任何带 `data-sponsor-open` 的元素都能开弹层（`add-sponsor` 只放了这一个）。
弹层**自动跟随页面语言与深浅色**——它读 `<html lang>` 和 `<html class="dark|light">`，
而 `app.js` 切语言/主题时正好改的就是这两个，所以**不需要任何接线**（片段在监听 `<html>` 的属性变化）。

| 坑 | 说明 |
|---|---|
| 页面在 `docs/` 而不是 `promo-page/` | `--page ./docs` 即可，脚本不关心目录叫什么 |
| 想改按钮文案 | `--label-zh "请我喝咖啡" --label-en "Buy me a coffee"` |
| 弹层标题是中文（英文模式下也是） | 生成器没配英文标题。加 `--title-en "Sponsor · My Project"`（同理 `--tagline-en` / `--note-en`） |
| 找了半天 `iskill-generate-sponsors` | 默认按「兄弟目录 → `~/.workbuddy/skills/`」探测；都不在就用 `--sponsors-dir <技能目录>` |
| 重跑会重复注入吗 | 不会。按钮与脚本都由独占一行的 marker 包裹，**重跑只替换那一块**，字节级幂等 |
| `--remove` 为什么不删文件 | 删文件不可逆。它只摘注入，并把该删的两个路径打印出来让你自己确认 |

> ⚠️ `add-sponsor.mjs` 里的 marker 是 `<!-- promo-sponsor:btn -->` / `<!-- promo-sponsor:script -->`，
> 与 `iskill-generate-sponsors` 给 README 用的 `<!-- sponsors:start -->` **不是一套**，别混。

## 共享真源

本仓库 `templates/promo-page/assets/` 的引擎三件套（`app.js` / `style.css` / `icons.js`）是
**唯一真源**（文件头带 `@iskill-source` / `@iskill-version` 戳）；各实例仓库 `promo-page/assets/`
下的是 vendored 副本（声明见各仓库 `package.json` 的 `iskillDeps`）。实例的 `content.js` /
`index.html` 属于各技能私有，不在共享范围。

- **改引擎文件必须同一 commit 升 `@iskill-version`**（bug 升 patch、加能力升 minor）
- 升版后同步存量实例（替代已 legacy 的 `sync-shared.mjs`）。同步依赖 iskill-dep-sync——
  本机未装时先安装：对 agent 说「请帮我安装 Skill：aispin/iskill-dep-sync」：
  ```bash
  T=~/.workbuddy/skills/iskill-dep-sync/scripts/skill-deps.mjs
  node $T check ~/WorkBuddy/ISkills/*     # 报 [UPDATE] 的就是落后实例
  node $T sync  ~/WorkBuddy/ISkills/iskill-xxx   # 逐个升级（只写 iskillDeps 声明的 3 个文件）
  ```
- `scripts/sync-shared.mjs` 仍可用但已 **legacy**：无漂移检测、无版本管理，仅作兼容保留。

## 依赖与自举

本 skill 的依赖分层（agent 按此判断缺什么、装什么）：

| 依赖 | 何时需要 | 缺失时 |
| --- | --- | --- |
| node ≥ 24 | 全部环节（init/check-platform 等） | `command -v node` 探测；无则装 Node |
| git | 部署（deploy.sh/pages.sh） | `xcode-select --install`（macOS） |
| gh（GitHub CLI） | 部署、Pages 配置、平台核验 | `brew install gh && gh auth login`；无 gh 时 deploy.sh 推送降级为打印手工命令 |
| agent-browser | 截图验收（铁律 2，经 iskill-ui-verify） | `npm i -g agent-browser && agent-browser install`；探测链见 ui.mjs（env → PATH → WorkBuddy binaries） |
| iskill-ui-verify | 截图验收 | `git clone https://github.com/aispin/iskill-ui-verify.git "$HOME/.workbuddy/skills/iskill-ui-verify"` |
| iskill-generate-sponsors | 仅显式要赞助模块时（add-sponsor.mjs） | 同上克隆；或 `--sponsors-dir <技能目录>` 显式指定 |

冷启动一键自检：`node ~/.workbuddy/skills/iskill-dep-sync/scripts/skill-deps.mjs env <SKILL_DIR>`。

环境变量覆盖（**均无写死默认值**）：`NODE`、`GH`、`GH_PROXY`（默认不走代理）、`GH_USER`
（默认 `oauth2`）、`--owner` / `GH_OWNER`（check-platform 的 GitHub owner，默认从仓库 remote 推导）。
