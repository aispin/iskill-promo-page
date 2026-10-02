# 设计指南

面向「要改这页样式」的人。改内容不用看这里（那只涉及 `assets/content.js`）。

## 一、令牌与主题

所有颜色走 CSS 变量，定义在 `style.css` 顶部 `:root`（浅色）与 `:root.dark`（深色）。**加新颜色就往两处都加**，组件里一律用变量、零 `dark:` 判断。

```css
:root {
  --brand / --brand2        品牌色（由 content.js 注入覆盖，别在这里改）
  --bg / --bg-2             页面底色 / 卡片实底
  --panel                   玻璃面板底（半透明 + backdrop-filter）
  --panel-solid             不透明实底（按钮、下拉）
  --code-bg                 代码块底（两套主题都是深色，刻意）
  --line / --line-strong    分隔线 / 明显描边
  --grid                    背景网格线
  --ink / --ink-2 / --ink-3 主文字 / 次文字 / 弱文字
  --shadow / --shadow-sm    大阴影 / 小阴影
  --ok                      成功态（勾选、健康灯）
  --radius / --radius-lg    16 / 22px
  --wrap                    内容最大宽度 1120px
  --topbar-h                吸顶栏高度 62px
}
```

**三层主题来源**，优先级从高到低：

1. `<head>` 内联脚本读 `?theme=` → `localStorage` → `prefers-color-scheme`，在首帧前给 `<html>` 打上 `.dark` 或 `.light`（防闪）。
2. `:root.dark` 提供深色令牌。
3. `@media (prefers-color-scheme: dark) :root:not(.light)` 兜住「JS 没跑」的情况 —— 这段和 `:root.dark` **内容重复是刻意的**，改色时两处一起改。

> 不要改成"默认深色 + `.light` 覆盖"。深浅两套令牌体量相同，谁做默认都行，但换默认会产生大量 diff。

## 二、骨架与八段

```
.bg-layer  ← 三团极光（fixed，blur 90px，缓慢 drift）
.bg-grid   ← 网格线（fixed，径向 mask 只在顶部可见）
.topbar    ← 吸顶玻璃栏：品牌 / 导航 / 中英分段 / 主题按钮 / GitHub
main
  1 .hero       两栏：左文案（badge行→h1→sub→CTA→meta） 右终端窗（透视倾斜）
                 └ badge 行 = 「AI 技能」固定 + 平台兼容性（content.js 的 platform）
  2 .stats      3 张数字卡（渐变大字）
  3 .compare    左“以前”右“现在”，后者带品牌色描边+辉光
  4 .features   3×2 能力卡（内联 SVG 图标 + 悬浮光晕）
  5 .shots      实拍图（items 为空则整段隐藏）
  6 .steps      编号时间线 + 代码块（带复制按钮）
  7 .faq        details/summary 手风琴（零 JS）
  8 .cta        结尾行动区（径向辉光）
footer
```

改顺序 = 改 DOM 顺序（`app.js` 只是往固定 id 里填内容，不负责排序）。

## 三、渲染契约

`content.js` 里的键与渲染函数的对应关系：

| 键 | 渲染到 | 说明 |
|---|---|---|
| `hero.*` / `nav.*` / `steps.title` … | `[data-i18n="key"]` | 走 `textContent`，**不支持 HTML** |
| `terminal.lines` | `#term-body` | 每行是 `[{t:"文本", c:"p\|k\|s\|c"}]`，也可以是纯字符串 |
| `chat` | 原位替换 `.term` | **与 terminal 二选一，配了 chat 优先**。Agent 对话窗（skill 的用户是 AI agent，展示「对话现场」比 shell 输出更贴切）。结构：`{title, status, userLabel, agentLabel, messages[]}`，message = `{role:"user"\|"agent", text, tag?}`，`text` 支持 `\n` 换行、**纯文本不解析 HTML**，`tag` 是气泡底部的小徽标（如「已读 SKILL.md」）。不配 = 维持终端窗，老页面零影响 |
| `stats[]` | `#stats .grid` | `{value, label, note}` |
| `compare.before/after` | `#compare .grid` | `{title, items[]}` |
| `features.items[]` | `#features .grid` | `{icon, title, desc}`，**desc 走 innerHTML，可以用 `<code>`** |
| `showcase.items[]` | `#shots .grid` | `{src, alt, caption}`，空数组隐藏整段 —— **并连带隐藏导航里那条 `#shots`**（否则点「截图」跳到 `display:none` 的锚点，表现为「点了没反应」） |
| 顶栏品牌名 | `.brand span` | 以 `content.js` 的 `name` 为真源，**每次渲染都刷一遍**。骨架里那句是模板占位，漏改就会顶着 `ISKILL-EXAMPLE` 上线 |
| `steps.items[]` | `#how .list` | `{title, desc, codeName, code}`；**三步语义固定：①装 ②说需求 ③验收**（见下）。`code` 里 `#` 开头会被着成注释；写 `codeKey:"install"` 则换成安装提示词（见下） |

**steps 三步契约（2026-10-02 定稿）**——skill 的使用者是 AI agent，不是敲命令的人：

1. **交给 AI 装**：`codeKey: "install"`，提示词自动推导。
2. **说一句你要什么**：`codeName: "prompt"`，内容是**你对 agent 说的话**（自然语言需求 + 关键约束），不是命令；渲染上与 install 同款 `code-prompt` 样式、不做 `#` 着色。
3. **验收产物**：只有产物需要你亲自看/亲自操作时才写这一步（看报告、双击 .command、浏览器扫码、真机装 PWA…）。产物路径**拿得准**才写 `codeName:"path"`，拿不准就只写 desc —— 编造路径比留空更糟。

反面教材（勿再犯）：第 2/3 步写 `cp -R templates/`、`npm test`、`node scripts/x.mjs --flag` 之类的命令行——那是开发者视角，等于教用户自己干活。
| `faq.items[]` | `#faq .list` | `{q, a}` |
| `ui.{copy,copied,failed}` | 各处复制按钮 | 三种反馈文案，随语言切换 |

### 安装提示词（这是本模板的默认安装方式）

Hero 与结尾 CTA 的复制按钮、以及 `codeKey:"install"` 的那一步，复制/展示的都是**说给 AI 的一句话**，
由 `repo` 推导（zh：`请帮我安装 Skill：{repo}，并告诉我它的用法`）。想换话术用 `installPrompt:{zh,en}` 覆盖，
占位符支持 `{repo}` / `{repoShort}` / `{name}`。

- 推导发生在 `render()` 里，**所以它会跟着语言切换**（切到 EN 就是英文提示词）。
- 提示词块走 `.code-prompt`：品牌色描边 + `white-space:pre-wrap`（长 URL 换行，不横向滚动），
  并且**跳过 `#` 注释着色** —— 提示词不是 shell，URL 里出现 `#` 时染色会很难看。
- 代码块底色两套主题都是深的，所以提示词文字色写死亮的，**不能**用 `var(--ink)`。

⚠️ `#how` 是 section 的 id（不是 `#steps`），`app.js` 里查的就是它 —— 改 id 要同步改三处（HTML / app.js / 导航锚点）。

## 四、动效约定

- 入场：给元素加 `.reveal`，进入视口时由 IntersectionObserver 加 `.in`；`.d1/.d2/.d3` 是错峰延迟。
- **整页截图/打印必须先加 `?reveal=all`**，否则视口外的区块是透明的（`param("reveal")==="all"` 会一次性全亮）。
- 终端逐行打字：`renderTerminal` 用 `setTimeout(220 + i*170)` 逐行加 `.in`。
- 所有动效都被 `@media (prefers-reduced-motion: reduce)` 一刀关掉；加新动效时别再写第二套降级逻辑。

## 五、新增一段（示例）

```html
<section class="pricing" id="pricing">
  <div class="wrap">
    <div class="sec-head reveal">
      <span class="eyebrow" data-i18n="pricing.eyebrow">价格</span>
      <h2 class="sec-title" data-i18n="pricing.title">多少钱</h2>
    </div>
    <div class="grid"></div>
  </div>
</section>
```

```js
// app.js：照 renderStats 写一个 renderPricing，然后在 render() 里调用
function renderPricing(list) {
  var box = qs("#pricing .grid"); if (!box) return;
  box.innerHTML = "";
  (list || []).forEach(function (p) { /* … */ });
}
```

顶部导航加一条 `<a href="#pricing" data-i18n="nav.pricing">价格</a>`，`content.js` 里补上对应键即可。

## 六、顶栏收缩优先级（改这里之前先读完）

顶栏是**一行不换行**的 flex，里面塞了品牌、导航、语言分段、主题按钮、仓库胶囊五类东西。
窄窗口下它必然不够宽 —— 关键是**由谁退让**。

### 不定优先级会怎样

浏览器默认按各元素的 min-content 均摊缺口，于是同时出现三种错：

| 元素 | CSS 写法 | 默认行为 | 视觉结果 |
|---|---|---|---|
| `.brand` | `min-width: 0` | **唯一能被压到 0 的** | 品牌名塌成 `I…`，最后连图标都没了 |
| `.nav a` | 没写 `nowrap` | 压到「最长单词」宽 | 「Get / started」在词中间折行，36px 的链接被撑到 59px，顶破 62px 的顶栏 |
| `.btn`（仓库胶囊） | `white-space: nowrap` + flex 默认 `min-width:auto` | **完全不可压** | 268px 的长仓库名在任何宽度都纹丝不动 |

根因不是某一条规则写错了，而是**整套优先级没定义**。修的时候要一次把四件事钉死：

```css
.topbar .wrap { flex-wrap: nowrap; }
.brand   { flex: 0 1 auto; min-width: 0; }          /* 唯一允许退让的 */
.nav     { flex: 0 0 auto; }
.nav a   { white-space: nowrap; }                   /* 永不折行 */
.seg, .btn-icon { flex: none; }                     /* 控件永不压缩 */
.btn-repo { flex: 0 1 auto; min-width: 0; }         /* 可压：内层 .repo-text 带 ellipsis */
```

### 降级阶梯

按「信息价值从低到高」逐个收，每档只做一件事：

| 断点 | 动作 | 为什么在这里 |
|---|---|---|
| `≤1080` | `#repo-label { max-width: 80px }` | 长仓库名先截断成 `aispin/isk…` |
| `≤960` | 顶栏 gap 14→10、导航 padding/字号各降一档 | 整体收紧，省下约 40px |
| `≤900` | `#repo-label { display:none }`，胶囊变 **34px 方块图标** | 仓库名退场，与主题按钮同款 |
| `≤720` | `.nav { display:none }` | 导航整体藏起（锚点仍可滚动到达） |
| `≤560` | `.brand span { display:none }` | 手机只留 logo，不显示半截品牌名 |

临界值是算出来的，不是拍脑袋：按
`brand(273) + nav(302) + seg(79) + theme(34) + repo(268) + gap(14×5) = 1026`，
加上 `.wrap` 左右各 22px 内边距 ⇒ **视口 ≈1070px** 是自然临界点，所以第一档放在 1080。
换了品牌名长度 / 导航条目数，这个数要重算。

### 三个必须记得的坑

1. **第三档必须写 `flex: none`**：`.btn-repo` 基类带 `min-width: 0`，只写 `width: 34px` 图标会被压成 28px 的扁条。
2. **`#repo-label` 被 `display:none` 后，可访问名会消失** —— `app.js` 里给 `#repo-link` 同步写了
   `aria-label="GitHub · owner/repo"`，别删这行。
3. **`?theme=` 不写就是跟随系统**，而无头 Chromium 默认报深色。想截浅色必须显式 `?theme=light`，
   否则「浅色图」和「深色图」是同一张，还会误以为改主题没生效。

### 验收（每个断点前后各取一档，共 4 档起）

```bash
for W in 1160 900 730 390; do
  $N <ui-verify>/scripts/ui.mjs check --url "…/?reveal=all&lang=en" --width $W --height 900 --scale 1 --wait 2600 \
    --case "顶栏不折行=[...document.querySelectorAll('.nav a')].every(a=>a.getBoundingClientRect().height<44)" \
    --case "品牌未塌缩=document.querySelector('.brand').getBoundingClientRect().width>=24" \
    --case "无横向滚动=document.documentElement.scrollWidth<=document.documentElement.clientWidth+1"
done
```

三条断言分别对应三种独立失败模式，缺一不可 —— 只测 `无横向滚动` 会漏掉「没溢出但折行/塌缩」。

## 七、尺寸与自检

- 主断点：`1000px`（能力卡 3→2 列、Hero 两栏→单栏）、`720px`（其余全部单列、隐藏导航）。
- 内联图标统一 **24×24 viewBox、`stroke-width=1.7`、圆角端点**，颜色跟随 `currentColor`。
- 改完至少看这四个：`1180×940@2x` 与 `390×844@3`，各配浅色/深色。
- 字体栈只用系统字体（不下载 webfont）：`-apple-system → PingFang SC → Microsoft YaHei → Noto Sans SC`，英文数字回落到 `Segoe UI / Roboto / Helvetica`。

## 八、槽位（可插拔扩展点）

八段是通用骨架，但总有些技能要给自己的落地页塞专属内容。**槽位**就是留的口子，
设计目标只有两条：**不配置时绝对不可见**、**插内容不需要改 JS**。

### 契约

| 角色 | 位置 | 内容 |
|---|---|---|
| 锚点 | `index.html` 骨架 | `<div class="slot" data-slot="名字"></div>`（现成的一个叫 `hero`，在 Hero 的 CTA 下方） |
| 内容 | `content.js` **顶层** `slots` | `slots: { 名字: { html \| iframe } }` |
| 渲染 | `app.js` `renderSlots(lang)` | 遍历所有 `[data-slot]`，按名字取配置 |

**为什么配置放顶层而不是 `lang.zh/en` 里**：槽位的「形态」（嵌哪个文件、多高）与语言无关，
只有里面的文案才分语言 —— 塞进语言字典会让两份配置各写一遍 src/height，改一处漏一处。
需要双语文案时，把那个字段写成 `{ zh, en }` 即可（`slotText()` 会挑）。

### 三条约定

1. **空锚点必须零占位。** 靠 `.slot:empty { display: none }` —— 注意锚点标签里
   **不能有换行/空格**，CSS Level 3 的 `:empty` 把纯空白文本节点算作「非空」，
   写成多行会留下一条网格缝。
2. **切语言不能重载 iframe。** 重载会丢子页状态（用户已经切到某个 tab）并闪一下。
   于是分两条通道：首帧写 `src` 的 `#lang=&theme=`（hash 在子页头脚本里最先被读到，
   无竞态），之后一律 `postMessage` 推 —— 见 SKILL.md §三 的协议片段。
3. **子页自带的语言/主题开关，被嵌时要收起。** 宿主顶栏已经有一套，子页头部再来一套，
   就成了上下两个同样的控件，视觉上像两张页面叠在一起。子页头脚本里判
   `window.self !== window.top` 打 `data-embedded`，CSS 一条规则藏掉即可
   （跨源读 `window.top` 会抛，所以要 `try/catch` 且**默认当被嵌**）。
   判定放在头脚本（`<style>` 之前）首帧就不闪；单独打开时开关照常在，
   「能独立访问」这条能力不损失。实例：`iskill-generate-sponsors` 的 `usage.html`。

### 高度

`iframe.height` 经 CSS 变量 `--slot-h` 落地，窄屏再压一道
（`@media (max-width:720px){ height: min(var(--slot-h), 68vh) }`）——
否则一个 760px 的 iframe 在手机上会占掉整屏还多。

**故意不做「自动量高」**：宿主与子页多半跨源（`file://` 下必然是），量不到；
靠 `postMessage` 报高又容易和子页内部的 `vh` 单位形成「量高 → 改高 → 再量」的
震荡循环。固定高度 + 内部滚动是可控的那一档。

### 验收

```bash
# ① 不配 slots 时：锚点必须是 display:none，且页面高度与加锚点前一致
$N <ui-verify>/scripts/ui.mjs check --url "…/?reveal=all" --width 1180 --height 900 --scale 1 \
  --case "空槽位不占位=getComputedStyle(document.querySelector('[data-slot=hero]')).display==='none'"
# ② 配了 iframe 后：首帧颜色/语言就得跟宿主一致（这是 hash 通道的功劳）
#    在宿主页点一次主题切换，再读子页 documentElement —— 应当同步变（postMessage 通道）
# ③ 子页被嵌时收起自身控件、单独打开时又在（读 contentDocument 必须同源 → 起 http 服务验）
$N <ui-verify>/scripts/ui.mjs check --url "…/index.html?reveal=all" --width 1180 --height 900 --scale 1 --wait 3200 \
  --case "子页已标记被嵌=document.querySelector('iframe.slot-frame').contentDocument.documentElement.hasAttribute('data-embedded')" \
  --case "子页收起语言开关=getComputedStyle(document.querySelector('iframe.slot-frame').contentDocument.querySelector('.lang-sw')).display==='none'"
$N <ui-verify>/scripts/ui.mjs check --url "…/usage.html" --width 1180 --height 900 --scale 1 \
  --case "单独打开开关还在=getComputedStyle(document.querySelector('.lang-sw')).display!=='none'"
```

最后一对断言**必须成对** —— 只测「嵌进来时藏了」会漏掉「顺手把单独访问也藏了」这一类回归。

## 九、为什么不用 React / Vite / Tailwind（决策记录）

看到别的项目（如 `iskill-headroom-workbuddy` 的控制台）用 React 19 + Vite + Tailwind，很容易顺手动念
「promo-page 是不是也该重构」。**结论：不重构。** 这条记录在这里，免得以后再被翻出来重议。

**判据不是「有没有 React」，而是「需不需要运行时状态 / 服务端」。**

| | promo-page 落地页 | headroom dashboard |
|---|---|---|
| 运行时状态 | 无（语言/主题两个开关，改 DOM 属性即可） | 有（5s 轮询、登录态、实时进度） |
| 部署形态 | 静态托管（Pages `/` 或 `/docs`） | `dashboard.py` 单端口托管 |
| 构建 | **无** | 有（`vite build` → `dist/`） |
| 打开方式 | `file://` 双击即开 | 必须起服务 |

上 React 会拆掉两条**写进 SKILL.md 卖点**的契约：

1. **`file://` 双击即开** —— ESM `<script type="module">` 在 `file://` 下被 CORS 拦死，
   打包成单文件 bundle 也不解决 `import` 的跨源问题；而现在的 `.js` 全是**经典脚本**，
   双击就能看（`design-guide.md` §一 的三层主题兜底也是为此设计的）。
2. **零依赖零构建** —— 改一行文案不需要 `npm i` + 等构建；SKILL.md 的 `summary` 明说
   「零依赖、无构建」，`templates/promo-page/assets/` 里的东西复制出去就能用。
   Tailwind 的 utility 类名还会把「改样式」从「改 12 个 CSS 变量」变成「读 40 个类名」。

**该往哪走**：真需要状态/服务端，走 dashboard 那条路（React + 后端），别往这里塞。
两者不是「谁替代谁」，是**两档工具对应两类页面** —— 静态介绍页用这档，带交互/数据的控制台用那档。
`references/deploy-modes.md` 的模式 ③ 也是同一个道理：产物要静态托管，就不要引构建链。

> 什么时候该改判据：如果哪天落地页要「在线跑一次真实初始化并展示结果」，那它就有状态了，
> 该拆成 dashboard 式应用 —— 但那时它也不再是「落地页」了。

## 十、Hero 的两个标签（含平台兼容性）

Hero 标题上方是一个 `.hero-kicker` 行，放**两枚** badge：

| 位置 | 内容 | 来源 | 规则 |
|---|---|---|---|
| 第 1 枚 | 「AI 技能 / AI skill」 | `lang.zh/en` 的 `hero.badge` | **固定文案，且不写 agent 平台名** —— 技能跨 agent 通用（Claude Code / Cursor / Codex 都能装），标一家会劝退一半人 |
| 第 2 枚 | macOS / Windows / 仅 macOS … | `content.js` **顶层**的 `platform` | 由 `renderPlatformBadge(lang)` 渲染 |

**为什么第 2 枚值得存在**：这些技能不少是「macOS 写脚本、Windows 跑不了」的
（`sips` / `osascript` / `/opt/homebrew` 硬路径），再不然依赖 ffmpeg、剪映这类有明显平台差异的外部件。
用户扫一眼落地页首先想知道的就是「我这台机器能不能用」。**这是操作系统兼容性，
和第 1 枚那条「别写 agent 平台名」的规则不冲突** —— 两者说的是完全不同的「平台」。

取值与判据（照实写，判据细节见 `templates/promo-page/assets/content.js` 的注释）：

| 取值 | 显示 | 判据 |
|---|---|---|
| `"mac-windows"` | macOS / Windows | 两边都能跑 |
| `"macos"` | 仅 macOS | 出现 `sips` / `osascript` / `pbcopy` / `open` / `lsof` / `/opt/homebrew` 硬路径 |
| `"windows"` | 仅 Windows | 依赖 Windows 独有能力（如 UI 自动化） |
| `"linux"` | 仅 Linux | 同上 |
| `"all"` | 全平台 | 纯提示词（无脚本），或纯 Node/Python 且不调平台命令 |
| `""` | 隐藏整条（`hidden`，零占位） | 不想声明 |
| `{ zh, en }` | 自定义文案 | 想写更具体的（如「macOS 10.15+」） |

**两条硬约束**：

1. **不配 = 不占位。** 骨架里那枚 badge 带 `hidden` 属性，`renderPlatformBadge` 在
   文本为空时保持 `hidden`；`.badge-os[hidden]{display:none}` 兜底。所以老的落地页
   （`content.js` 里没有 `platform`）视觉上零变化 —— 和槽位的「不配就没有」同一条原则。
2. **标错比不写更糟。** 用户照标签装了发现跑不了，比压根没标签伤害大。判据要照着
   **代码里实际出现的平台命令**写，不要按「理想中应该支持」写。

> 更新老落地页：往它的 `content.js` 顶层加一行 `platform: "macos"` 即可，
> 模板与 `app.js` 无需再动（`init.mjs --out .` 重铺时同名文件默认跳过，
> 记得只改 `content.js` 与 `index.html` 的 meta，别整目录覆盖）。
