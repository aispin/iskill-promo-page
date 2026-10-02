/* ============================================================================
 * iskill-promo-page · 内容（唯一需要逐技能改的文件）
 *
 * 结构：
 *   PROMO.brand / brand2  —— 品牌色（会注入 CSS 变量，换色不用改样式）
 *   PROMO.name / repo / installPrompt / license …—— 全局信息
 *   PROMO.lang.zh / .en   —— 双语文案（键必须两边都有，缺了会显示成空）
 *
 * 文案里的 HTML 只允许少量行内标签（<code>、<b>），卡片描述走 innerHTML，
 * 其余一律 textContent，别塞脚本。
 *
 * 安装方式默认是「让 agent 去装」——一键复制的是说给 AI 的一句话，
 * 由 repo 自动推导，**不需要你写安装命令**。
 *
 * 本文件是「示例技能」，复制后请整体替换掉。
 * ==========================================================================*/
window.PROMO = {
  name: "ISKILL-EXAMPLE",
  brand: "#7c5cff",
  brand2: "#22d3ee",
  repo: "https://github.com/aispin/iskill-example",
  repoLabel: "aispin/iskill-example",

  /* 默认提示词就是「请帮我安装 Skill：<repo>，并告诉我它的用法」，中英各一份。
     只有想换话术时才需要打开下面这段（可用 {repo} / {repoShort} / {name} 占位符），
     例如要指定安装目录、或必须先装依赖：
  installPrompt: {
    zh: "请帮我安装 Skill：{repo}，装到 ~/.workbuddy/skills/ 下，并告诉我它的用法",
    en: "Install {repo} into ~/.workbuddy/skills/ and tell me how to use it"
  },
  */
  license: "MIT",

  /* ── 平台兼容性标签（Hero 标题上方，「AI 技能」右边那枚）──────────────────
   *
   * 用户扫一眼就想知道「我这台机器能不能用」—— 这里填的是**操作系统**兼容性。
   * 取值：
   *   "mac-windows" | "macos" | "windows" | "linux" | "all"
   *   ""                  → 整条隐藏（不占位）
   *   { zh: "…", en: "…" } → 自定义文案
   *
   * ⚠️ 只填脚本真的跑得起来的范围。判据（照实写，别美化）：
   *   · 出现 sips / osascript / pbcopy / open / lsof / /opt/homebrew 硬路径 → 仅 macOS
   *   · 有 .ps1 / taskkill / %APPDATA% / process.platform==="win32" 分支   → 支持 Windows
   *   · 纯提示词（无脚本），或纯 Node/Python 且不调平台命令               → "all"
   * 标错比不写更糟：用户照标签装了发现跑不了，比没标签伤害大。
   */
  platform: "mac-windows",

  /* ── 槽位：往落地页里插入「这个技能特有的内容」 ──────────────────────────
   *
   * 骨架在 Hero 的 CTA 按钮下方留了 <div class="slot" data-slot="hero">，
   * 想放东西就在这里声明。**不配 = 整块不存在**，不会留空行、不占网格行。
   *
   * 两种形态（二选一，同时给时 iframe 优先）：
   *   html   —— 一段内联 HTML；写成 {zh, en} 就能跟着切语言
   *   iframe —— 嵌一个自包含页面（自带样式的单文件页，如 usage.html）。
   *             默认跟随本页语言 / 主题：首帧走 src 上的 #lang=&theme=，
   *             之后切换走 postMessage（子页认这套协议才会跟随，降级无害）
   *
   * 子页要跟随就监听这条消息（不认也不报错，只是不跟随）：
   *   window.addEventListener('message', function (e) {
   *     var s = e.data && e.data.promoSlotSync;
   *     if (!s) return;              // s.lang = "zh" | "en"; s.theme = "light" | "dark"
   *   });
   * 首帧还要先读一次 location.hash 里的 lang / theme —— postMessage 赶不上头脚本。
   *
   * 要**新增**槽位：在 index.html 骨架的目标 section 里加一行
   *   <div class="slot" data-slot="随便什么名字"></div>
   * app.js 认得任意 [data-slot]，不用改 JS。
   *
   * slots: {
   *   hero: {
   *     iframe: { src: "usage.html", height: 760, title: { zh: "用法演示", en: "Live demo" } }
   *   }
   * },
   */

  lang: {
    /* ── 中文 ───────────────────────────────────────────────────────── */
    zh: {
      meta: {
        title: "ISKILL-EXAMPLE · 把你的重复劳动压成一行",
        description: "示例技能：一句话说清它替你省掉什么。"
      },
      a11y: { skip: "跳到主要内容" },
      /* 复制按钮的反馈文案（切语言会跟着换） */
      ui: { copy: "复制", copied: "已复制", failed: "复制失败" },
      nav: { features: "能力", shots: "截图", how: "上手", faq: "问答" },

      hero: {
        badge: "AI 技能",
        titlePre: "把你的重复劳动",
        titleAccent: "压成一行",
        titlePost: "",
        sub: "用一句话说清楚：谁在什么场景下，因为这个技能少做了什么。",
        ctaPrimary: "复制安装提示词",
        ctaSecondary: "看源码",
        meta1: "零依赖",
        meta2: "本地运行",
        meta3: "MIT 许可"
      },
      terminal: {
        title: "zsh — iskill-example",
        lines: [
          [{ t: "$ ", c: "p" }, { t: "bash scripts/run.sh --fast", c: "k" }],
          [{ t: "✓ ", c: "p" }, { t: "跑完了，用时 1.2s", c: "s" }]
        ]
      },

      stats: [
        { value: "135 → 1", label: "行代码变成一行命令", note: "手写样板被彻底消掉" },
        { value: "0", label: "第三方依赖", note: "纯标准库，离线可用" },
        { value: "3s", label: "端到端耗时", note: "本机实测" }
      ],

      compare: {
        eyebrow: "对比",
        title: "以前 vs 现在",
        sub: "",
        before: { title: "没有这个技能", items: ["每次都要重新写一遍样板", "容易踩坑，重试成本高"] },
        after: { title: "有了这个技能", items: ["一句话让 agent 装好", "坑已经写进文档"] }
      },

      features: {
        eyebrow: "能力",
        title: "它能做什么",
        sub: "",
        items: [
          { icon: "terminal", title: "一行命令", desc: "把流程收进一个入口，参数化。" },
          { icon: "grid", title: "批量处理", desc: "多个变体一次跑完。" },
          { icon: "shield", title: "安全兜底", desc: "失败有明确提示，退出码可判。" }
        ]
      },

      showcase: {
        eyebrow: "实拍",
        title: "看一眼真东西",
        sub: "",
        /* 放真截图（不是效果图）。items 为空时整个 section 自动隐藏。
           建议用 iskill-ui-verify 自己跑出来：
           ui.mjs shots --url ... --out promo-page/assets --name shot */
        items: []
      },

      /* 三步的语义是固定的：**前两步给 agent，最后一步才轮到你**
         —— 技能的使用者是 AI agent，不是敲命令的人。
         ① 装：codeKey "install"（提示词自动推导，别手抄 URL）
         ② 说一句你要什么：codeName "prompt"，是**你对 agent 说的话**，不是命令
         ③ 验收：只有产物需要你亲自看/亲自操作时才出现（看报告、双击、浏览器登录…）
            产物路径拿不准就别写 code 块 —— 编造路径比留空更糟 */
      steps: {
        eyebrow: "上手",
        title: "三步跑起来",
        sub: "命令由 agent 跑，你只说要什么、看结果。",
        items: [
          { title: "交给 AI 装", desc: "把这句话粘进对话框，agent 会自己拉代码、读文档，再告诉你用法。", codeKey: "install" },
          { title: "说一句你要什么", desc: "需求说清就行，命令、参数、落盘路径都由 agent 决定。", codeName: "prompt", code: "帮我……（把你要的结果、关键约束说清楚）" },
          { title: "验收产物", desc: "这一步才轮到你：打开它给你的报告/页面/文件，说一句行或不行。", codeName: "path", code: "<产物路径>" }
        ]
      },

      faq: {
        eyebrow: "问答",
        title: "常见问题",
        items: [
          { q: "能不能不用 AI，手动装？", a: "可以。把仓库 clone 进你的 agent 技能目录（如 <code>~/.workbuddy/skills/</code>）就行 —— 技能本身是纯文本加脚本，没有构建步骤。" },
          { q: "需要联网吗？", a: "装的时候需要，之后默认全部本地运行。" }
        ]
      },

      cta: { title: "现在就来一发", desc: "把提示词粘给 AI，30 秒看到效果。", primary: "去 GitHub 看看", secondary: "复制安装提示词" },
      footer: { license: "MIT 许可", madeWith: "由 iskill-promo-page 生成" }
    },

    /* ── English ────────────────────────────────────────────────────── */
    en: {
      meta: {
        title: "ISKILL-EXAMPLE · One command instead of busywork",
        description: "A sample skill: say in one line what it saves you."
      },
      a11y: { skip: "Skip to content" },
      ui: { copy: "Copy", copied: "Copied", failed: "Copy failed" },
      nav: { features: "Features", shots: "Screens", how: "Get started", faq: "FAQ" },

      hero: {
        badge: "AI skill",
        titlePre: "Turn your busywork into ",
        titleAccent: "one command",
        titlePost: "",
        sub: "One sentence: who, in what situation, stops doing what because of this skill.",
        ctaPrimary: "Copy install prompt",
        ctaSecondary: "View source",
        meta1: "Zero deps",
        meta2: "Runs locally",
        meta3: "MIT licensed"
      },
      terminal: {
        title: "zsh — iskill-example",
        lines: [
          [{ t: "$ ", c: "p" }, { t: "bash scripts/run.sh --fast", c: "k" }],
          [{ t: "✓ ", c: "p" }, { t: "done in 1.2s", c: "s" }]
        ]
      },

      stats: [
        { value: "135 → 1", label: "lines collapsed into one command", note: "boilerplate gone" },
        { value: "0", label: "third-party dependencies", note: "stdlib only, works offline" },
        { value: "3s", label: "end-to-end runtime", note: "measured locally" }
      ],

      compare: {
        eyebrow: "Comparison",
        title: "Before vs after",
        sub: "",
        before: { title: "Without it", items: ["Rewrite the boilerplate every time", "Easy to trip on known traps"] },
        after: { title: "With it", items: ["One sentence and your agent installs it", "The traps are already documented"] }
      },

      features: {
        eyebrow: "Features",
        title: "What it does",
        sub: "",
        items: [
          { icon: "terminal", title: "One entry point", desc: "The whole flow behind a single parameterised command." },
          { icon: "grid", title: "Batch by default", desc: "Every variant in a single run." },
          { icon: "shield", title: "Safe failures", desc: "Clear messages and a meaningful exit code." }
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
        sub: "The agent runs the commands. You only say what you want and check the result.",
        items: [
          { title: "Let your agent install it", desc: "Paste the line into the chat — it clones the repo, reads the docs, and tells you how to use it.", codeKey: "install" },
          { title: "Say what you want", desc: "Describe the outcome; the agent picks the commands, flags and paths.", codeName: "prompt", code: "Help me … (say what you want plus the constraints that matter)" },
          { title: "Check the result", desc: "Your turn: open the report / page / file it produced and say go or no-go.", codeName: "path", code: "<output path>" }
        ]
      },

      faq: {
        eyebrow: "FAQ",
        title: "Frequently asked",
        items: [
          { q: "Can I install it without an agent?", a: "Sure. Clone the repo into your agent's skills directory (e.g. <code>~/.workbuddy/skills/</code>) — it is plain text plus scripts, with no build step." },
          { q: "Does it need network access?", a: "Only to install. Everything else runs locally." }
        ]
      },

      cta: { title: "Give it a spin", desc: "Paste the prompt into your agent and see results in 30 seconds.", primary: "Open on GitHub", secondary: "Copy install prompt" },
      footer: { license: "MIT licensed", madeWith: "Built with iskill-promo-page" }
    }
  }
};
