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
  1 .hero       两栏：左文案（badge→h1→sub→CTA→meta） 右终端窗（透视倾斜）
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
| `stats[]` | `#stats .grid` | `{value, label, note}` |
| `compare.before/after` | `#compare .grid` | `{title, items[]}` |
| `features.items[]` | `#features .grid` | `{icon, title, desc}`，**desc 走 innerHTML，可以用 `<code>`** |
| `showcase.items[]` | `#shots .grid` | `{src, alt, caption}`，空数组隐藏整段 |
| `steps.items[]` | `#how .list` | `{title, desc, codeName, code}`，`code` 里 `#` 开头会被着成注释 |
| `faq.items[]` | `#faq .list` | `{q, a}` |

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
