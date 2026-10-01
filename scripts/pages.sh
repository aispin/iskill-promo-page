#!/usr/bin/env bash
# iskill-promo-page · pages —— 用 gh api 配置 / 查看仓库的 GitHub Pages 发布源
#
#   bash scripts/pages.sh status   <owner/repo>
#   bash scripts/pages.sh docs     <owner/repo> [--branch main] [--apply]
#   bash scripts/pages.sh root     <owner/repo> [--apply]
#   bash scripts/pages.sh gh-pages <owner/repo> [--apply]
#   bash scripts/pages.sh workflow <owner/repo> [--apply]
#
# 默认 **只打印** 将要执行的命令（dry-run），确认无误再加 --apply 真改设置。
#
# ── 为什么需要它 ──────────────────────────────────────────────────────
# GitHub Pages 的「Deploy from a branch」只认两个目录：`/`（根）与 `/docs`。
# 想把站点放在子目录又不想用工作流，目录就必须叫 docs/（init.mjs --out docs）。
#
# ── 前提 ──────────────────────────────────────────────────────────────
# gh 已登录，且对目标仓库有 admin 权限；仓库必须已经推到 GitHub。

set -euo pipefail

GH="${GH:-$(command -v gh 2>/dev/null || echo /opt/homebrew/bin/gh)}"
if [ ! -x "$GH" ]; then
  echo "✗ 找不到 gh。装一个或设 GH=/path/to/gh" >&2
  exit 2
fi

MODE="${1:-}"
REPO="${2:-}"
BRANCH="main"
APPLY=0
SITE_DIR=""

if [ -z "$MODE" ] || [ -z "$REPO" ]; then
  sed -n '2,10p' "$0" | sed 's/^# \{0,1\}//'
  exit 2
fi

shift 2 || true
while [ $# -gt 0 ]; do
  case "$1" in
    --branch) BRANCH="${2:-}"; shift 2 ;;
    --dir)    SITE_DIR="${2:-}"; shift 2 ;;
    --apply)  APPLY=1; shift ;;
    *) echo "✗ 未知参数：$1" >&2; exit 2 ;;
  esac
done

case "$REPO" in
  */*) ;;
  *) echo "✗ 仓库要写成 owner/repo，收到：$REPO" >&2; exit 2 ;;
esac

have_pages() { "$GH" api "repos/$REPO/pages" >/dev/null 2>&1; }

# PUT = 改已有站点；POST = 首次创建。先探一次，别盲目试错。
method() { if have_pages; then echo PUT; else echo POST; fi; }

quote_f() {
  # 生成 -f 'k=v' 形式（引号包住，避免 shell 把方括号当 glob）
  printf -- "-f '%s'" "$1"
}

do_status() {
  if ! have_pages; then
    echo "· $REPO 还没有开启 Pages（或仓库不存在 / 无权限）"
    return 0
  fi
  "$GH" api "repos/$REPO/pages" | python3 -c '
import json, sys
d = json.load(sys.stdin)
src = d.get("source") or {}
print("  站点地址   :", d.get("html_url"))
print("  构建方式   :", d.get("build_type"), "  ← legacy = Deploy from a branch；workflow = GitHub Actions")
print("  发布源     :", (src.get("branch") or "—") + " / " + (src.get("path") or "—"))
print("  状态       :", d.get("status"))
print("  HTTPS 强制 :", d.get("https_enforced"))
'
}

case "$MODE" in
  status)
    echo "══ $REPO 的 Pages 配置 ══"
    do_status
    ;;

  docs)
    # 最省事的一条路：main 分支的 /docs 目录，零工作流
    SITE_DIR="${SITE_DIR:-docs}"
    if [ "$SITE_DIR" != "docs" ]; then
      echo "✗ 分支模式只有 /docs 可用（Pages 硬限制），别传 --dir $SITE_DIR" >&2
      exit 2
    fi
    M=$(method)
    echo "══ 分支模式 · $BRANCH /docs（零工作流）══"
    echo "  前提：仓库里已经有 $SITE_DIR/index.html（node scripts/init.mjs --target <repo> --out docs）"
    echo "  ▶ $GH api -X $M repos/$REPO/pages $(quote_f "source[branch]=$BRANCH") $(quote_f 'source[path]=/docs')"
    if [ "$APPLY" = "1" ]; then
      "$GH" api -X "$M" "repos/$REPO/pages" -f "source[branch]=$BRANCH" -f "source[path]=/docs" --silent
      echo "✓ 已生效 → https://${REPO%%/*}.github.io/${REPO##*/}/（首次约 1 分钟）"
    else
      echo "  （dry-run，加 --apply 生效）"
    fi
    ;;

  root)
    M=$(method)
    echo "══ 分支模式 · $BRANCH /(root) ══"
    echo "  注意：仓库根会整个变成网站根，「/」下必须有 index.html。"
    echo "  ▶ $GH api -X $M repos/$REPO/pages $(quote_f "source[branch]=$BRANCH") $(quote_f 'source[path]=/')"
    if [ "$APPLY" = "1" ]; then
      "$GH" api -X "$M" "repos/$REPO/pages" -f "source[branch]=$BRANCH" -f "source[path]=/" --silent
      echo "✓ 已生效"
    else
      echo "  （dry-run，加 --apply 生效）"
    fi
    ;;

  gh-pages)
    M=$(method)
    echo "══ 分支模式 · gh-pages /(root) ══"
    echo "  前提：gh-pages 分支上已有站点内容。两种推法（二选一）："
    echo "    A. 本地直接推（不需要工作流）：bash scripts/deploy.sh <目标目录> --set-pages"
    echo "    B. 用工作流：init.mjs --branch-mode，推 main 后由 promo-page.yml 强推到 gh-pages"
    echo "  ▶ $GH api -X $M repos/$REPO/pages $(quote_f 'source[branch]=gh-pages') $(quote_f 'source[path]=/')"
    if [ "$APPLY" = "1" ]; then
      "$GH" api -X "$M" "repos/$REPO/pages" -f "source[branch]=gh-pages" -f "source[path]=/" --silent
      echo "✓ 已生效"
    else
      echo "  （dry-run，加 --apply 生效）"
    fi
    ;;

  workflow)
    M=$(method)
    echo "══ Actions 产物模式（配 promo-page.yml）══"
    echo "  注意：还要先把 .github/workflows/promo-page.yml 推上去，"
    echo "        而推工作流文件需要 token 带 workflow scope：gh auth refresh -s workflow"
    echo "  ▶ $GH api -X $M repos/$REPO/pages -f 'build_type=workflow'"
    if [ "$APPLY" = "1" ]; then
      "$GH" api -X "$M" "repos/$REPO/pages" -f "build_type=workflow" --silent
      echo "✓ 已生效"
    else
      echo "  （dry-run，加 --apply 生效）"
    fi
    ;;

  *)
    echo "✗ 未知模式：$MODE" >&2
    sed -n '2,10p' "$0" | sed 's/^# \{0,1\}//'
    exit 2
    ;;
esac
