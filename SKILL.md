---
name: iskill-promo-page
summary: 给任何 skill / 工具 / 项目生成落地推广页（中英双语 + 深浅色跟随系统），静态自包含、零依赖零构建，附 GitHub Pages 工作流与免工作流发布方案。
description: 当用户要给某个 skill、工具、开源项目做「落地页 / 推广页 / 介绍页 / landing page」，或要把静态页发布到 GitHub Pages 时使用。触发词：落地页、推广页、landing page、介绍页、主页、gh-pages、GitHub Pages、宣传页。产出 <目标>/promo-page/（或 --out docs/）自包含静态站点 + 可选 .github/workflows/promo-page.yml，逐技能只需改一个内容文件。
---

# iskill-promo-page 落地推广页生成器

把「一个 skill 干了什么」讲成一页能直接发出去的网页：**中英双语、深浅色跟随系统、零依赖零构建、静态自包含**，整目录可原样同步到 gh-pages 或作为 Actions 产物发布。

## 一、产出物

```
<目标>/
├── promo-page/                    ← 自包含静态站点，整体可直接发布（--out docs 则叫 docs/）
│   ├── index.html                 ← 页面骨架（只需改顶部 8 行 meta）
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

## 二、铺骨架

```bash
S=<SKILL_DIR>/scripts/init.mjs
N=${NODE:-/Users/lv/.workbuddy/binaries/node/versions/22.22.2-3/bin/node}

# 默认：Actions 产物模式（promo-page/ + 工作流）
$N $S --target /path/to/iskill-xxx

# ⭐ 不想用工作流：目录命名成 docs/，走「Deploy from a branch → main /docs」
#    （Pages 分支模式只认 / 和 /docs，选不了 promo-page/ —— 见 references/deploy-modes.md）
$N $S --target /path/to/iskill-xxx --out docs

# 仓库 Pages 已设成 "Deploy from a branch"（gh-pages 分支）时：
$N $S --target /path/to/iskill-xxx --branch-mode

# 只要骨架、完全不生成工作流：
$N $S --target /path/to/iskill-xxx --no-workflow

# 已有同名目录要覆盖
$N $S --target /path/to/iskill-xxx --force
```

| 参数 | 作用 |
|---|---|
| `--out <name>` | 站点目录名，默认 `promo-page`。**传 `docs` 才能用免工作流的分支模式** |
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
  install: "git clone …",                 // 顶部「复制安装命令」复制的内容
  lang: {
    zh: { meta, nav, hero, terminal, stats, compare, features, showcase, steps, faq, cta, footer },
    en: { /* 同上，键一一对应，缺了会渲染成空 */ }
  }
};
```

外加 `index.html` 顶部那 8 行 meta（title / description / theme-color / og:*）。

**页面八段**（按顺序）：Hero（标题+副标题+CTA+终端窗）→ 数字条 → 之前/现在对比 → 能力卡 → 实拍图 → 三步上手（带代码块）→ 问答 → 结尾 CTA。

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

## 六、交付前自查

```bash
# 起临时静态服务器
cd <目标>/promo-page && python3 -m http.server 8899

# 结构 + 双语断言（ui-verify）
$N <ui-verify>/scripts/ui.mjs check --url "http://127.0.0.1:8899/?reveal=all&lang=zh" --wait 2600 \
  --case "能力卡=document.querySelectorAll('#features .feat').length>3" \
  --case "步骤齐=document.querySelectorAll('#how .step').length>=3" \
  --case "问答齐=document.querySelectorAll('#faq details').length>=3" \
  --case "无占位残留=!/示例技能|Example skill|ISKILL-EXAMPLE/.test(document.body.innerText)"
```

人工再过一遍：① 中英切换后没有半句残留 ② 四变体（zh/en × light/dark）观感都对 ③ 没有横向滚动条 ④ 控制台无报错 ⑤ `assets/og.png` 存在。

## 七、部署

> **先记住**：Pages 的「Deploy from a branch」**只认 `/`（根）与 `/docs` 两个目录**，无法指向
> `promo-page/`。所以「保留子目录 + 零工作流」只有一个解 —— 把目录命名成 `docs/`（`--out docs`）。
> 完整对比、实测数据与坑表见 **`references/deploy-modes.md`**。

| 模式 | 站点目录 | 工作流 | Pages 设置 |
|---|---|---|---|
| **① Actions 产物**（默认） | `promo-page/` | `promo-page.yml` | Source = **GitHub Actions** |
| **② 免工作流** | `docs/`（`--out docs`） | 无 | Deploy from a branch → `main` / **`/docs`** |
| ③ 免工作流 · 根目录 | 仓库根 | 无 | Deploy from a branch → `main` / `/(root)` |
| ④ gh-pages 分支 | 任意 | `promo-page-branch.yml` 或手动 `git subtree push` | Deploy from a branch → `gh-pages` / `/(root)` |

模式之间**别同时开**（分支模式与 Actions 产物会互相覆盖，表现是「改了不生效」）。

用脚本配 Pages，省得去网页点：

```bash
bash scripts/pages.sh status   aispin/iskill-xxx             # 先看看当前是什么
bash scripts/pages.sh docs     aispin/iskill-xxx --apply     # 模式 ②
bash scripts/pages.sh workflow aispin/iskill-xxx --apply     # 模式 ①
```

（默认 dry-run 只打印命令，加 `--apply` 才真改。）

> ⚠️ 推送 `.github/workflows/*.yml` 需要 token 带 `workflow` scope；`gho_` token 默认没有，推这类文件会 403
> → 先 `gh auth refresh -s workflow`。**这正是模式 ② 的一个实际好处：完全不碰工作流文件。**

## 八、排错表

| 现象 | 原因与解法 |
|---|---|
| 整页截图下半部分空白 | 滚动入场动画没解除 → URL 加 `?reveal=all` |
| 某张卡片截出来是纯背景 | 元素在视口外（见 iskill-ui-verify：脚本会自动撑高视口，仍失败就用 `--full` 整页截） |
| 实拍图位置是空的 | 图片 `loading="lazy"` 未加载 → ui-verify 已在截图前顶成 eager；手写脚本时要注意 |
| 英文版有空段落 | `content.js` 里 en 漏了同名键（zh 是 key 源，两边必须一一对应） |
| 换品牌色没生效 | 改到 `style.css` 了 → 应该改 `content.js` 的 `brand`/`brand2` |
| 切语言后 `<title>` 没变 | 正常：`<title>` 由 `dict.meta.title` 覆盖，检查该键是否存在 |
| Pages 上图片 404 | 引用了 `.github/` 下的资源（该路径被 Pages 封锁）或用了绝对路径 |
| **Settings 里选不到 `promo-page` 目录** | Pages 分支模式只认 `/` 与 `/docs`。要么用工作流，要么 `--out docs` 重铺。见 `references/deploy-modes.md` |
| 站点打开是 README 而不是落地页 | 发布源目录选错（选到了根）→ 改 Folder；或用的是分支模式但目录名不是 `/docs` |
| 页面报 Liquid / `{{ }}` 语法错 | 分支模式下 Jekyll 在处理文件 → 站点目录里必须有 `.nojekyll`（模板自带，别删） |
| 改了 `promo-page/` 但线上没变 | ① 工作流 `paths` 没命中（目录改名了？）② 用的是分支模式而目录名不是 `/docs` ③ 两种模式同时开着互相覆盖 |

## 九、扩展

- 加/删段落：`index.html` 里删掉对应 `<section>`，`app.js` 里去掉那次 `render*` 调用。段落顺序即 DOM 顺序。
- 加图标：往 `assets/icons.js` 里加一条 24×24、`stroke-width=1.7` 的 SVG 字符串，然后 `icon: "新键名"`。
- 改设计系统（间距、圆角、字体、动效）：见 `references/design-guide.md`。
- 换部署方式：见 `references/deploy-modes.md`。
- 参考实例：`ISkills/iskill-ui-verify/promo-page/`（紫青）、`ISkills/iskill-headroom-workbuddy/promo-page/`（品牌绿 + 真实控制台截图）。
