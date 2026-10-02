/* ============================================================================
 * iskill-promo-page · 落地页内容（自举：这页就是它自己生成的）
 * 只改这个文件就能换掉整页文案（外加 index.html 顶部那几行 meta）。
 * ==========================================================================*/
window.PROMO = {
  name: "ISKILL-PROMO-PAGE",
  brand: "#7c5cff",
  brand2: "#22d3ee",
  repo: "https://github.com/aispin/iskill-promo-page",
  repoLabel: "aispin/iskill-promo-page",

  /* 生成落地页本身跨平台（init / sync-shared / add-sponsor 都是 Node）；
     但发布脚本 pages.sh / deploy.sh 是 bash + 写死 /opt/homebrew —— 见 FAQ。 */
  platform: "mac-windows",
  license: "MIT",

  lang: {
    /* ── 中文 ───────────────────────────────────────────────────────── */
    zh: {
      meta: {
        title: "ISKILL-PROMO-PAGE · 一条命令生成落地推广页",
        description: "给任何 skill / 工具 / 开源项目一键生成本地推广页：中英双语、深浅色跟随系统、静态自包含、零依赖零构建，附四种 GitHub Pages 发布方案与可插拔槽位。"
      },
      a11y: { skip: "跳到主要内容" },
      ui: { copy: "复制", copied: "已复制", failed: "复制失败" },
      nav: { features: "能力", shots: "截图", how: "上手", faq: "问答" },

      hero: {
        badge: "AI 技能",
        titlePre: "把「做一页落地页」",
        titleAccent: "压成一条命令",
        titlePost: "",
        sub: "给任何 skill / 工具 / 开源项目生成中英双语、深浅色跟随系统的静态推广页：零依赖零构建、file:// 双击即开，整目录原样同步到 GitHub Pages。逐技能只改一个 content.js。",
        ctaPrimary: "复制安装提示词",
        ctaSecondary: "看源码",
        meta1: "零依赖零构建",
        meta2: "file:// 双击即开",
        meta3: "四种 Pages 发布模式"
      },
      chat: {
        title: "AI Agent · 对话现场",
        status: "在线",
        userLabel: "你",
        agentLabel: "AI",
        messages: [
          { role: "user", text: "给 iskill-xxx 做一版落地页，中英双语" },
          { role: "agent", text: "铺一套零依赖静态页（file:// 双击即开），你只改 content.js 一个文件；Hero 右栏用 Agent 对话窗，平台标签按实际兼容性配。", tag: "已读 design-guide" },
          { role: "user", text: "再发布到 GitHub Pages" },
          { role: "agent", text: "走 gh-pages 分支模式：零工作流、无红叉、不动工作区。推完给你线上地址。" }
        ]
      },


      stats: [
        { value: "1 个文件", label: "逐技能唯一要改的内容文件", note: "assets/content.js —— 换色、换文案、换仓库都在这一处" },
        { value: "8 段", label: "页面骨架一次给全", note: "Hero → 数字 → 对比 → 能力 → 实拍 → 上手 → 问答 → CTA" },
        { value: "0", label: "依赖与构建步骤", note: "纯静态 HTML/CSS/JS，不需要 npm、不需要打包" },
        { value: "4 种", label: "GitHub Pages 发布模式", note: "Actions 产物 / main·docs / main·根 / gh-pages 分支" }
      ],

      compare: {
        eyebrow: "对比",
        title: "以前 vs 现在",
        sub: "",
        before: {
          title: "从零手写一页落地页",
          items: [
            "搭 Hero、栅格、深浅色、中英切换，半天时间没了",
            "换个品牌色要挨个改一堆 CSS 变量",
            "发布前再研究一遍 Pages 的四种模式与各自的坑"
          ]
        },
        after: {
          title: "一条 init 铺好骨架",
          items: [
            "八段骨架 + 主题/语言/入场动画全内置，只剩填内容",
            "换色只改 content.js 的 brand / brand2，靠 CSS 变量注入",
            "deploy.sh 一条命令推 gh-pages，pages.sh 顺手把 Pages 配好",
            "要插自有内容用槽位，不配就整块消失、不留空行"
          ]
        }
      },

      features: {
        eyebrow: "能力",
        title: "它替你干的活",
        sub: "",
        items: [
          { icon: "terminal", title: "一条 init 铺骨架", desc: "<code>node scripts/init.mjs --target …</code> 生成 <code>promo-page/</code>：index.html + 4 个引擎文件，整个目录可原样发布。" },
          { icon: "bolt", title: "零依赖零构建", desc: "纯静态 HTML/CSS/JS，刻意不用 ES module —— <code>file://</code> 双击 index.html 就能看，不需要 npm、不需要打包。" },
          { icon: "layers", title: "可插拔槽位", desc: "骨架在 Hero 按钮下方留了 <code>&lt;div class=&quot;slot&quot; data-slot=&quot;hero&quot;&gt;</code>：可塞一段 HTML，也可 iframe 嵌自包含页面，自动跟随主题/语言；不配 = 不留空行。" },
          { icon: "lang", title: "中英双语 + 深浅色", desc: "八段文案 zh/en 各一份、键一一对应；首帧内联脚本定妥主题与语言，跟随系统，支持 <code>?lang=en&amp;theme=dark</code> 直达。" },
          { icon: "grid", title: "八段通用骨架", desc: "Hero（含终端窗）→ 数字条 → 以前/现在对比 → 能力卡 → 实拍图 → 三步上手 → 问答 → 结尾 CTA，段落顺序即 DOM 顺序。" },
          { icon: "branch", title: "四种 Pages 发布模式", desc: "Actions 产物 / <code>--out docs</code> 免工作流 / 根目录当首页 / 推 gh-pages 分支；<code>deploy.sh</code> 与 <code>pages.sh</code> 把推送与配 Pages 都脚本化。" }
        ]
      },

      showcase: {
        eyebrow: "实拍",
        title: "看一眼真东西",
        sub: "",
        items: []
      },

      steps: {
        eyebrow: "上手",
        title: "三步跑起来",
        sub: "命令由 agent 跑，你只说要什么、看结果。",
        items: [
          { title: "交给 AI 装", desc: "把这句话粘进对话框，agent 会自己拉代码、读文档，再告诉你用法。", codeKey: "install" },
          { title: "说给哪个技能做页", desc: "铺骨架、写文案、部署都是它做；你只管提需求。", codeName: "prompt", code: "给 iskill-xxx 做一版落地页，中英双语，发布到 GitHub Pages。" },
          { title: "打开线上地址看一眼", desc: "Pages 地址是 https://<用户名>.github.io/<仓库>/，你打开看效果；之后改文案只动 content.js 一个文件。" }
        ]
      },


      faq: {
        eyebrow: "问答",
        title: "常见问题",
        items: [
          { q: "Windows 上能用吗？", a: "生成这一步可以：<code>init.mjs</code> / <code>sync-shared.mjs</code> / <code>add-sponsor.mjs</code> 都是跨平台 Node，Windows 上照跑。但**发布脚本 <code>pages.sh</code> 与 <code>deploy.sh</code> 是 bash 且写死了 <code>/opt/homebrew</code> 路径** —— Windows 上要么装 Git Bash 跑，要么手工把站点目录 <code>git push</code> 到发布分支，再在网页 Settings → Pages 里手点。生成的页面本身两边一样。" },
          { q: "生成的页面要联网吗？", a: "不要。纯静态自包含，没有 CDN 外链，图片放 <code>assets/</code>，离线也能打开；<code>https://&lt;user&gt;.github.io/&lt;repo&gt;/</code> 这种子路径下也正常。" },
          { q: "真的只改一个文件吗？", a: "是。改 <code>assets/content.js</code>（品牌色、仓库地址、中英文案）加 <code>index.html</code> 顶部那几行 <code>&lt;title&gt;</code> / <code>description</code> / <code>og:*</code>；其余 <code>app.js</code>、<code>style.css</code>、<code>icons.js</code> 是引擎文件，不用动。" },
          { q: "实拍图区怎么是空的？", a: "没放真截图时 <code>showcase.items</code> 就是空数组，整段会自动隐藏 —— 宁可没有，也不放占位图或效果图。想补真图用 <code>iskill-ui-verify</code> 自己拍，命令在 SKILL.md 里。" },
          { q: "能给自己加个赞助按钮吗？", a: "默认不生成，产出里一个字符的赞助痕迹都没有。只有显式跑 <code>scripts/add-sponsor.mjs</code> 才会在 Hero 的 View Source 右侧加一个按钮（弹层由 iskill-generate-sponsors 提供）。" },
          { q: "能不能不用 AI，手动装？", a: "可以。把仓库 clone 进你的 agent 技能目录（如 <code>~/.workbuddy/skills/</code>）就行 —— 技能本身是纯文本加脚本，没有构建步骤。" }
        ]
      },

      cta: {
        title: "下次做落地页，别再从头写 HTML",
        desc: "一条 init 铺好八段骨架，剩下只改一个 content.js。",
        primary: "去 GitHub 看看",
        secondary: "复制安装提示词"
      },
      footer: { license: "MIT 许可", madeWith: "由 iskill-promo-page 生成" }
    },

    /* ── English ────────────────────────────────────────────────────── */
    en: {
      meta: {
        title: "ISKILL-PROMO-PAGE · A landing page from one command",
        description: "Generate a local promo page for any skill / tool / OSS project: bilingual, follows the system theme, fully static and self-contained, zero deps and zero build — plus four GitHub Pages deploy modes and pluggable slots."
      },
      a11y: { skip: "Skip to content" },
      ui: { copy: "Copy", copied: "Copied", failed: "Copy failed" },
      nav: { features: "Features", shots: "Screens", how: "Get started", faq: "FAQ" },

      hero: {
        badge: "AI skill",
        titlePre: "Turn \"build a landing page\" into ",
        titleAccent: "one command",
        titlePost: "",
        sub: "Generate a bilingual, system-theme-aware static promo page for any skill, tool or OSS project: zero deps, zero build, opens with a double-click over file://, and syncs to GitHub Pages as-is. One content.js per project.",
        ctaPrimary: "Copy install prompt",
        ctaSecondary: "View source",
        meta1: "Zero deps, zero build",
        meta2: "Double-click over file://",
        meta3: "Four Pages deploy modes"
      },
      chat: {
        title: "AI Agent · live session",
        status: "online",
        userLabel: "You",
        agentLabel: "AI",
        messages: [
          { role: "user", text: "Build a promo page for iskill-xxx in Chinese and English" },
          { role: "agent", text: "You get a dependency-free static page (double-click to open from file://) where the only file you touch is content.js. The hero shows an agent conversation, and the platform badge follows real compatibility.", tag: "read design-guide" },
          { role: "user", text: "And publish it to GitHub Pages" },
          { role: "agent", text: "gh-pages branch mode: no workflow, no red X, working tree untouched. I'll hand you the live URL when it's up." }
        ]
      },


      stats: [
        { value: "1 file", label: "the only content file to edit", note: "assets/content.js — colours, copy and repo all live here" },
        { value: "8 sections", label: "the whole skeleton, once", note: "Hero → stats → compare → features → screens → steps → FAQ → CTA" },
        { value: "0", label: "dependencies and build steps", note: "plain HTML/CSS/JS — no npm, no bundler" },
        { value: "4", label: "GitHub Pages deploy modes", note: "Actions artifact / main·docs / main·root / gh-pages branch" }
      ],

      compare: {
        eyebrow: "Comparison",
        title: "Before vs after",
        sub: "",
        before: {
          title: "Hand-writing a landing page",
          items: [
            "Hero, grid, dark mode, language switch — half a day gone",
            "Changing the brand colour means chasing a pile of CSS variables",
            "Then re-learning the four Pages modes and their traps"
          ]
        },
        after: {
          title: "One init call lays it down",
          items: [
            "Eight sections plus theme/language/entrance animations, already wired",
            "Recolour by editing brand / brand2 in content.js — injected as CSS variables",
            "deploy.sh pushes gh-pages, pages.sh configures Pages",
            "Drop your own content into a slot; leave it unset and it disappears cleanly"
          ]
        }
      },

      features: {
        eyebrow: "Features",
        title: "What it takes off your plate",
        sub: "",
        items: [
          { icon: "terminal", title: "One init call", desc: "<code>node scripts/init.mjs --target …</code> produces <code>promo-page/</code>: index.html plus 4 engine files, publishable as a whole directory." },
          { icon: "bolt", title: "Zero deps, zero build", desc: "Plain static HTML/CSS/JS that deliberately avoids ES modules — double-click index.html over <code>file://</code> and it just works. No npm, no bundler." },
          { icon: "layers", title: "Pluggable slots", desc: "The hero reserves <code>&lt;div class=&quot;slot&quot; data-slot=&quot;hero&quot;&gt;</code>: drop in inline HTML or an iframe of a self-contained page, and it follows theme/language. Unset means no gap at all." },
          { icon: "lang", title: "Bilingual + light/dark", desc: "Eight sections of zh/en copy with matching keys; an inline head script locks theme and language on the first frame, following the system, with <code>?lang=en&amp;theme=dark</code> deep links." },
          { icon: "grid", title: "Eight reusable sections", desc: "Hero (with terminal) → stats → before/after → feature cards → screenshots → three steps → FAQ → closing CTA. Order is DOM order." },
          { icon: "branch", title: "Four Pages deploy modes", desc: "Actions artifact / <code>--out docs</code> workflow-free / repo-root as homepage / push a gh-pages branch; <code>deploy.sh</code> and <code>pages.sh</code> script the push and the Pages config." }
        ]
      },

      showcase: {
        eyebrow: "Screens",
        title: "See the real thing",
        sub: "",
        items: []
      },

      steps: {
        eyebrow: "Get started",
        title: "Up and running in three steps",
        sub: "The agent runs the commands. You say what you want and check the result.",
        items: [
          { title: "Let your agent install it", desc: "Paste the line into the chat — it clones the repo, reads the docs, and tells you how to use it.", codeKey: "install" },
          { title: "Say which skill needs a page", desc: "Scaffolding, copy and deploy are on it — you just state the requirement.", codeName: "prompt", code: "Build a promo page for iskill-xxx in Chinese and English and publish it to GitHub Pages." },
          { title: "Open the live URL", desc: "Pages serves it at https://<user>.github.io/<repo>/ — open it and look. Later copy changes touch one file: content.js." }
        ]
      },


      faq: {
        eyebrow: "FAQ",
        title: "Frequently asked",
        items: [
          { q: "Does it work on Windows?", a: "Generation does: <code>init.mjs</code> / <code>sync-shared.mjs</code> / <code>add-sponsor.mjs</code> are cross-platform Node and run fine on Windows. The **deploy scripts <code>pages.sh</code> and <code>deploy.sh</code> are bash and hard-code <code>/opt/homebrew</code> paths** — on Windows either run them under Git Bash, or push the site directory to the branch yourself and set it up in Settings → Pages. The generated page itself is identical on both platforms." },
          { q: "Does the generated page need network access?", a: "No. It is fully static and self-contained with no CDN links; images live in <code>assets/</code>. It works offline and under a subpath like <code>https://&lt;user&gt;.github.io/&lt;repo&gt;/</code>." },
          { q: "Is it really just one file to edit?", a: "Yes: <code>assets/content.js</code> (colours, repo, bilingual copy) plus the <code>&lt;title&gt;</code> / <code>description</code> / <code>og:*</code> lines at the top of <code>index.html</code>. The other files — <code>app.js</code>, <code>style.css</code>, <code>icons.js</code> — are engine files." },
          { q: "Why is the screenshots section empty?", a: "With no real screenshots, <code>showcase.items</code> stays an empty array and the whole section hides itself. Better nothing than a placeholder or mock-up. To add real ones, shoot them with <code>iskill-ui-verify</code> (command in SKILL.md)." },
          { q: "Can I add a sponsor button?", a: "Not by default — the output contains no sponsor trace at all. Only running <code>scripts/add-sponsor.mjs</code> explicitly adds a button next to View Source in the hero (its popup comes from iskill-generate-sponsors)." },
          { q: "Can I install it without an agent?", a: "Sure. Clone the repo into your agent's skills directory (e.g. <code>~/.workbuddy/skills/</code>) — plain text and scripts, with no build step." }
        ]
      },

      cta: {
        title: "Next landing page, skip the hand-written HTML",
        desc: "One init call lays out eight sections; then edit a single content.js.",
        primary: "Open on GitHub",
        secondary: "Copy install prompt"
      },
      footer: { license: "MIT licensed", madeWith: "Built with iskill-promo-page" }
    }
  }
};
