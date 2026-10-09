#!/usr/bin/env bash
# iskill-promo-page · deploy.sh —— 落地页 → 本地发布分支 → 尽力 git push
#
#   bash scripts/deploy.sh [<目标目录>] [选项]
#
#     --dir <name>       站点目录名（默认自动探测 promo-page / docs）
#     --branch <name>    发布分支名（默认 gh-pages）
#     --remote <name>    远程名（默认 origin）
#     --repo <owner/repo> 直接指定 GitHub 仓库（优先级最高；没配 remote 时很有用）
#     -m, --message <s>  提交信息（默认 "deploy: <dir> @ 时间"）
#     --no-push          只更新本地发布分支，不推远端
#     --dry-run          只打印计划，不写任何 ref、不推送
#     --set-pages        推送成功后顺手把仓库 Pages 指向该分支（调 pages.sh --apply）
#     -h, --help
#
# 适用条件（不满足即「跳过」，退出码 3，不算失败）：
#   ① <目标目录> 是 git 仓库；② 里面有 promo-page/ 或 docs/ 落地页目录。
#
# 退出码：0 已完成 / 3 不适用已跳过 / 1 失败
#
# ── 它做了什么 ────────────────────────────────────────────────────────
# 用 git 底层命令（read-tree → add → write-tree → commit-tree）**直接构造**一个
# 提交，其内容就是站点目录的内容（作为发布分支的根），再 update-ref 建出本地
# 发布分支。最后按「代理 + 禁用凭据助手 + token 内嵌」的配方 push，并核对远端 sha。
#
# 全程**不切分支、不建临时工作区、不碰你当前的改动** —— 所以工作区脏也能安全跑。
#
# ── 为什么不用 git subtree push ───────────────────────────────────────
# subtree push 要求该前缀目录已在历史里被跟踪过，首次用常报 "You need to merge
# ... first"；且它会把 main 的整条历史带进发布分支。这里生成的是「单条发布提交」，
# 与源码分支彻底解耦 —— 这正是 gh-pages 分支该有的样子。

set -euo pipefail

# token 失效时快速失败，别挂在 "Username for 'https://github.com':" 上等超时
export GIT_TERMINAL_PROMPT=0
export GIT_ASKPASS=true

SELF_DIR="$(cd "$(dirname "$0")" && pwd)"
SKILL_DIR="$(cd "$SELF_DIR/.." && pwd)"

usage() { sed -n '2,/^$/p' "$0" | sed 's/^# \{0,1\}//'; }

TARGET=""; SITE_DIR=""; BRANCH="gh-pages"; REMOTE="origin"; MESSAGE=""; REPO_ARG=""
DO_PUSH=1; DRY=0; SET_PAGES=0

while [ $# -gt 0 ]; do
  case "$1" in
    --dir)        SITE_DIR="${2:-}"; shift 2 ;;
    --branch)     BRANCH="${2:-}";   shift 2 ;;
    --remote)     REMOTE="${2:-}";   shift 2 ;;
    --repo)       REPO_ARG="${2:-}"; shift 2 ;;
    -m|--message) MESSAGE="${2:-}";  shift 2 ;;
    --no-push)    DO_PUSH=0; shift ;;
    --dry-run)    DRY=1; shift ;;
    --set-pages)  SET_PAGES=1; shift ;;
    -h|--help)    usage; exit 0 ;;
    -*)           echo "✗ 未知参数：$1" >&2; usage >&2; exit 2 ;;
    *)            TARGET="$1"; shift ;;
  esac
done

[ -z "$TARGET" ] && TARGET="$(pwd)"
TARGET="$(cd "$TARGET" 2>/dev/null && pwd)" || { echo "✗ 目录不存在：$TARGET" >&2; exit 2; }

# ── 1. 适用性：必须是 git 仓库 ────────────────────────────────────────
if ! ROOT="$(git -C "$TARGET" rev-parse --show-toplevel 2>/dev/null)"; then
  echo "⏭ 跳过：$TARGET 不是 git 仓库。"
  echo "   本命令只对 git 项目生效 —— 先 git init 并推到 GitHub，再回来跑。"
  exit 3
fi
GITDIR="$(git -C "$ROOT" rev-parse --absolute-git-dir)"

# ── 2. 适用性：得真的有落地页目录 ─────────────────────────────────────
if [ -n "$SITE_DIR" ]; then
  SITE="$TARGET/$SITE_DIR"
  [ -d "$SITE" ] || SITE="$ROOT/$SITE_DIR"
else
  SITE=""
  for c in promo-page docs; do
    if   [ -f "$TARGET/$c/index.html" ]; then SITE="$TARGET/$c"; break
    elif [ -f "$ROOT/$c/index.html" ];   then SITE="$ROOT/$c";   break
    fi
  done
fi
if [ -z "$SITE" ] || [ ! -d "$SITE" ]; then
  echo "⏭ 跳过：$ROOT 下没有 promo-page/ 或 docs/ 落地页目录。"
  echo "   先生成骨架：node \"$SKILL_DIR/scripts/init.mjs\" --target \"$ROOT\""
  exit 3
fi
[ -f "$SITE/index.html" ] || { echo "✗ $SITE 里没有 index.html，不是落地页目录" >&2; exit 1; }
SITE_REL="$(basename "$SITE")"

# ── 3. 远端解析 + 文件清点 ────────────────────────────────────────────
GH_BIN="${GH:-$(command -v gh 2>/dev/null || true)}"
[ -x /opt/homebrew/bin/gh ] && GH_BIN=/opt/homebrew/bin/gh

ORIGIN_URL=""; ORIGIN_SRC=""; HAS_REMOTE=0
if [ -n "$REPO_ARG" ]; then
  ORIGIN_URL="https://github.com/${REPO_ARG}.git"; ORIGIN_SRC="--repo 指定"
elif ORIGIN_URL="$(git -C "$ROOT" remote get-url "$REMOTE" 2>/dev/null)"; then
  ORIGIN_SRC="remote $REMOTE"; HAS_REMOTE=1
else
  ORIGIN_URL=""
fi

IS_GH=0; SLUG=""
if [ -n "$ORIGIN_URL" ]; then
  case "$ORIGIN_URL" in
    *github.com[:/]*)
      IS_GH=1
      SLUG="$(printf '%s' "$ORIGIN_URL" \
        | sed -E 's#^git@github\.com:##; s#^ssh://git@github\.com/##; s#^https?://([^@/]*@)?github\.com/##; s#\.git$##')"
      ;;
  esac
fi

# 没有 remote 也不奇怪 —— 本地仓库常常是「token 直推」建起来的，从没配过 origin。
# 这种时候用目录名去 GitHub 认一下同名仓库，认到就当远端（可以用 --repo 覆盖）。
if [ -z "$SLUG" ] && [ -n "$GH_BIN" ]; then
  ME="$("$GH_BIN" api user --jq .login 2>/dev/null || true)"
  GUESS="${ME}/$(basename "$ROOT")"
  if [ -n "$ME" ] && "$GH_BIN" api "repos/${GUESS}" >/dev/null 2>&1; then
    SLUG="$GUESS"; IS_GH=1
    ORIGIN_URL="https://github.com/${GUESS}.git"; ORIGIN_SRC="按目录名推断"
  fi
fi

FILE_N="$(find "$SITE" -type f -not -path '*/.git/*' -not -name '.DS_Store' | wc -l | awk '{print $1}' || true)"
NOJEKYLL_MISSING=0
[ -f "$SITE/.nojekyll" ] || NOJEKYLL_MISSING=1

echo "══ 落地页部署 · ${BRANCH} ══"
echo "  仓库      : ${ROOT}"
echo "  站点目录  : ${SITE_REL}/  （${FILE_N} 个文件）"
echo "  发布分支  : ${BRANCH}（本地）"
if [ -n "$ORIGIN_URL" ]; then
  echo "  远端      : ${ORIGIN_URL}$( [ "$IS_GH" = 1 ] && echo '  [GitHub]' )  ← ${ORIGIN_SRC}"
else
  echo "  远端      : （没找到 GitHub 远端，只建本地分支）"
fi
[ "$NOJEKYLL_MISSING" = 1 ] && echo "  ⚠ 缺 .nojekyll —— 分支模式下 Jekyll 会处理你的文件，别删它" >&2

# ── 4. 构造发布提交（不动工作区）─────────────────────────────────────
IDX="$(mktemp -t promo-deploy-idx.XXXXXX)"
rm -f "$IDX"
trap 'rm -f "$IDX"' EXIT

GIT_PLUMB=(--git-dir "$GITDIR" --work-tree "$SITE")
GIT_INDEX_FILE="$IDX" git "${GIT_PLUMB[@]}" read-tree --empty
GIT_INDEX_FILE="$IDX" git "${GIT_PLUMB[@]}" add -A -f -- . \
  ':(exclude).DS_Store' ':(exclude,glob)**/.DS_Store' ':(exclude).git' 2>/dev/null \
  || GIT_INDEX_FILE="$IDX" git "${GIT_PLUMB[@]}" add -A -f -- .
TREE="$(GIT_INDEX_FILE="$IDX" git "${GIT_PLUMB[@]}" write-tree)"

if [ -z "$(git -C "$ROOT" ls-tree -r --name-only "$TREE")" ]; then
  echo "✗ 站点目录里没有任何文件可发布（空树）" >&2
  exit 1
fi

# 父提交：本地分支 → 远端跟踪 → 现场 fetch（保证发布历史连续、push 能快进）
PARENT="$(git -C "$ROOT" rev-parse --verify -q "refs/heads/$BRANCH" || true)"
if [ -z "$PARENT" ] && [ -n "$ORIGIN_URL" ]; then
  git -C "$ROOT" fetch -q "$REMOTE" "$BRANCH" >/dev/null 2>&1 || true
  PARENT="$(git -C "$ROOT" rev-parse --verify -q "refs/remotes/$REMOTE/$BRANCH" || true)"
  [ -z "$PARENT" ] && PARENT="$(git -C "$ROOT" rev-parse --verify -q FETCH_HEAD || true)"
fi

# 作者身份（隐私守卫：仓库级优先，缺省时才问 gh，绝不回落到全局真实邮箱）
AUTH_NAME="$(git -C "$ROOT" config --local user.name 2>/dev/null || true)"
AUTH_EMAIL="$(git -C "$ROOT" config --local user.email 2>/dev/null || true)"
if [ -z "$AUTH_NAME" ] || [ -z "$AUTH_EMAIL" ]; then
  if [ -n "$GH_BIN" ]; then
    AUTH_NAME="${AUTH_NAME:-$("$GH_BIN" api user --jq .login 2>/dev/null || true)}"
    AUTH_EMAIL="${AUTH_EMAIL:-$("$GH_BIN" api user --jq '"\(.id)+\(.login)@users.noreply.github.com"' 2>/dev/null || true)}"
  fi
  AUTH_NAME="${AUTH_NAME:-ZEO}"
  AUTH_EMAIL="${AUTH_EMAIL:-noreply@localhost}"
  echo "· 仓库没设 local 身份，改用：$AUTH_NAME <$AUTH_EMAIL>（未写进 config）"
fi

[ -z "$MESSAGE" ] && MESSAGE="deploy: $SITE_REL @ $(date '+%Y-%m-%d %H:%M')"

# 内容没变就不产出空提交 —— 重跑是真正的 no-op（幂等），只在真改了页面时才落提交。
CHANGED=1
if [ -n "$PARENT" ] && [ "$(git -C "$ROOT" rev-parse -q "$PARENT^{tree}" 2>/dev/null)" = "$TREE" ]; then
  CHANGED=0
fi

if [ "$CHANGED" = 0 ]; then
  COMMIT="$PARENT"
  echo "  提交      : 与上次发布内容相同，跳过提交（沿用 ${PARENT:0:7}）"
else
  if [ -n "$PARENT" ]; then
    COMMIT="$(printf '%s\n' "$MESSAGE" | \
      GIT_AUTHOR_NAME="$AUTH_NAME" GIT_AUTHOR_EMAIL="$AUTH_EMAIL" \
      GIT_COMMITTER_NAME="$AUTH_NAME" GIT_COMMITTER_EMAIL="$AUTH_EMAIL" \
      git "${GIT_PLUMB[@]}" commit-tree "$TREE" -p "$PARENT")"
  else
    COMMIT="$(printf '%s\n' "$MESSAGE" | \
      GIT_AUTHOR_NAME="$AUTH_NAME" GIT_AUTHOR_EMAIL="$AUTH_EMAIL" \
      GIT_COMMITTER_NAME="$AUTH_NAME" GIT_COMMITTER_EMAIL="$AUTH_EMAIL" \
      git "${GIT_PLUMB[@]}" commit-tree "$TREE")"
  fi
  echo "  提交      : ${COMMIT:0:7}  （$( [ -n "$PARENT" ] && echo "父 ${PARENT:0:7}" || echo '孤儿提交，发布分支首建' )）"
fi
echo "  作者      : $AUTH_NAME <$AUTH_EMAIL>"

if [ "$DRY" = 1 ]; then
  echo
  echo "（--dry-run：未写入任何 ref、未推送）"
  [ "$CHANGED" = 1 ] && echo "  将要执行：git -C $ROOT update-ref refs/heads/$BRANCH $COMMIT"
  exit 0
fi

# HEAD 正好在这个分支上的话，update-ref 会让工作区与 HEAD 脱节 —— 拦住
if [ "$(git -C "$ROOT" symbolic-ref -q HEAD || true)" = "refs/heads/$BRANCH" ]; then
  echo "✗ 当前就在 $BRANCH 分支上，脚本不会动你的工作区。" >&2
  echo "  先 git -C \"$ROOT\" switch <其他分支> 再来跑。" >&2
  exit 1
fi

if [ "$CHANGED" = 1 ]; then
  git -C "$ROOT" update-ref "refs/heads/$BRANCH" "$COMMIT"
  echo "✓ 本地分支已更新：$BRANCH → ${COMMIT:0:7}"
fi
git -C "$ROOT" log -1 --format='  %h %s' "$BRANCH"

# ── 5. 尽力推送 ───────────────────────────────────────────────────────
PROXY=""; PUSH_URL="$ORIGIN_URL"
if [ "$IS_GH" = 1 ]; then
  PROXY="${GH_PROXY:-}"
  if [ -n "$GH_BIN" ]; then
    TOKEN="$("$GH_BIN" auth token 2>/dev/null || true)"
    [ -n "$TOKEN" ] && PUSH_URL="https://${GH_USER:-oauth2}:${TOKEN}@github.com/${SLUG}.git"
  fi
fi

# 统一推送配方：-c credential.helper=（置空，防钥匙串弹窗）；代理仅对 GitHub 生效；
# 推完 ls-remote 核对 sha —— git 的输出在弱网下会假失败/假成功，sha 才是唯一判据。
git_remote() {
  if [ -n "$PROXY" ]; then
    git -C "$ROOT" -c credential.helper= -c "http.proxy=$PROXY" "$@"
  else
    git -C "$ROOT" -c credential.helper= "$@"
  fi
}

if [ "$DO_PUSH" = 0 ]; then
  echo "· --no-push：跳过推送"
elif [ -z "$ORIGIN_URL" ]; then
  echo "· 没找到 GitHub 远端，跳过推送（本地分支已就绪）。"
  echo "  指定仓库后重跑：bash scripts/deploy.sh <目标> --repo owner/repo"
  echo "  或先配 remote：git -C \"$ROOT\" remote add origin git@github.com:owner/repo.git"
else
  REMOTE_TIP="$(git_remote ls-remote "$PUSH_URL" "refs/heads/$BRANCH" 2>/dev/null | awk 'NR==1{print $1}' || true)"
  if [ "$REMOTE_TIP" = "$COMMIT" ]; then
    echo "✓ 远端已是该提交，无需推送"
  else
    OK=0
    for VER in HTTP/1.1 ""; do
      LABEL="${VER:-HTTP/2(默认)}"
      echo "▶ push ${COMMIT:0:7} → ${BRANCH} @ ${SLUG:-$ORIGIN_URL}  （${LABEL}）"
      if [ -n "$VER" ]; then
        git_remote -c "http.version=$VER" push -q "$PUSH_URL" "$COMMIT:refs/heads/$BRANCH" 2>&1 || true
      else
        git_remote push -q "$PUSH_URL" "$COMMIT:refs/heads/$BRANCH" 2>&1 || true
      fi
      NOW_TIP="$(git_remote ls-remote "$PUSH_URL" "refs/heads/$BRANCH" 2>/dev/null | awk 'NR==1{print $1}' || true)"
      if [ "$NOW_TIP" = "$COMMIT" ]; then OK=1; break; fi
      # 远端被别处改过（如工作流推过）→ 用实时 tip 做租约强推，发布分支本就该被覆盖
      if [ -n "$NOW_TIP" ] && [ -n "$VER" ]; then
        echo "  · 远端 tip 为 ${NOW_TIP:0:7}，带租约强推重试"
        git_remote -c "http.version=$VER" push -q \
          --force-with-lease="refs/heads/$BRANCH:$NOW_TIP" \
          "$PUSH_URL" "$COMMIT:refs/heads/$BRANCH" 2>&1 || true
        NOW_TIP="$(git_remote ls-remote "$PUSH_URL" "refs/heads/$BRANCH" 2>/dev/null | awk 'NR==1{print $1}' || true)"
        if [ "$NOW_TIP" = "$COMMIT" ]; then OK=1; break; fi
      fi
    done
    if [ "$OK" = 1 ]; then
      echo "✓ 远端已核对一致：${COMMIT:0:7}（${BRANCH}）"
    else
      echo "⚠ 推送未成功（本地分支已就绪，可稍后手动重试）："
      if [ "$HAS_REMOTE" = 1 ]; then
        echo "    git -C \"$ROOT\" push $REMOTE $BRANCH"
      else
        echo "    git -C \"$ROOT\" push <远端地址> $BRANCH"
      fi
      echo "    bash \"$SKILL_DIR/scripts/pages.sh\" status ${SLUG:-<owner/repo>}   # 看远端现状"
    fi
  fi
fi

# ── 6. 收尾：Pages 指向该分支 ─────────────────────────────────────────
echo
if [ "$IS_GH" = 1 ]; then
  if [ "$SET_PAGES" = 1 ] && [ "$DO_PUSH" = 1 ]; then
    bash "$SKILL_DIR/scripts/pages.sh" gh-pages "$SLUG" --apply
  else
    echo "让它生效（一次性，二选一）："
    echo "  A. 网页：Settings → Pages → Source = Deploy from a branch → $BRANCH / (root)"
    echo "  B. 命令：bash \"$SKILL_DIR/scripts/pages.sh\" gh-pages $SLUG --apply"
    echo "     （加 --set-pages 可让本脚本推完直接配好）"
    echo "  站点地址：https://${SLUG%%/*}.github.io/${SLUG##*/}/"
  fi
else
  echo "非 GitHub 远端或不适用，跳过 Pages 配置。"
fi
