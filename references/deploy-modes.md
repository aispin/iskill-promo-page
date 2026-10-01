# 部署到 GitHub Pages —— 四种模式与硬限制

## 〇、先记住那条硬限制

**GitHub Pages 的「Deploy from a branch」只能选 `/`（根）或 `/docs` 两个目录。**

官方文档原文（[Configuring a publishing source](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)）：

> The source branch can be any branch in your repository, and the source folder can either be
> the root of the repository (`/`) on the source branch or a `/docs` folder on the source branch.

所以：**你无法把 Pages 指向 main 分支的 `promo-page/` 目录。** 下拉框里根本没这个选项，
不是权限问题、也不是没保存。

推论表：

| 你想要的 | 可行 | 怎么绕 |
|---|---|---|
| 子目录发布 + **零工作流** | ✅ | 只有一个解：目录必须叫 `docs/` → `init.mjs --out docs` |
| 子目录叫 `promo-page/` | ✅ | 但必须用工作流（Actions 产物 或 推 gh-pages） |
| 站点放仓库根 + 零工作流 | ✅ | 把站点内容搬到 `/`（见模式 ③） |
| 任意目录名 + 零工作流 | ❌ | 不存在这条路 |

> 实测（2026-10-01，`gh api repos/<owner>/<repo>/pages`）：
> - `aispin/iskill-generate-sponsors` → `build_type=legacy`、`source=main/` —— 就是模式 ③，**零工作流**，正常在跑。
> - `aispin/aispin.github.io` → `build_type=legacy`、`source=master/` —— 用户主页仓库，同样是根目录分支模式。

---

## ① Actions 产物模式（`init.mjs` 默认）

```bash
node scripts/init.mjs --target /path/to/iskill-xxx
# → <repo>/promo-page/ + <repo>/.github/workflows/promo-page.yml
```

设置：**Settings → Pages → Source = GitHub Actions**（或 `bash scripts/pages.sh workflow <owner/repo> --apply`）

- ✅ 站点可以待在 `promo-page/` 这个语义清晰的名字下；能加构建步骤；不占用额外分支。
- ⚠️ 推 `.github/workflows/*.yml` **需要 token 带 `workflow` scope**（`gho_` 默认没有）→ `gh auth refresh -s workflow`。
- ⚠️ Pages 必须显式设成 `GitHub Actions`，否则工作流报「Pages 未启用」。

## ② 零工作流 · `main /docs`（不想碰 Actions 就选它）

```bash
node scripts/init.mjs --target /path/to/iskill-xxx --out docs
# → <repo>/docs/  （--out docs 默认就不生成工作流；确实想要再加 --workflow）
```

设置：**Settings → Pages → Source = Deploy from a branch → Branch: main / Folder: `/docs`**

```bash
bash scripts/pages.sh docs <owner/repo> --apply      # 一条命令版
```

- ✅ 零工作流、零 token scope 要求、零分支污染。推送即发布。
- ✅ 目录依然自包含，推 gh-pages 的玩法照旧可用。
- ⚠️ 目录名被 Pages 绑死成 `docs` —— 这是**唯一代价**，换来的是完全不用管 Actions。
- ⚠️ 选了 `/docs` 后又把该目录删掉 → 构建报 `missing /docs folder`。

## ③ 零工作流 · `main /(root)`

把站点内容直接放在仓库根（`index.html` + `assets/` 在根目录）。

设置：**Settings → Pages → Deploy from a branch → main / `/(root)`**

```bash
bash scripts/pages.sh root <owner/repo> --apply
```

- ✅ 同样零工作流。`iskill-generate-sponsors` 就是这么发布的。
- ⚠️ **整个仓库根变成网站根** —— `SKILL.md`、`scripts/`、`.gitignore` 全部被静态服务公开。
- ⚠️ 若根已有 `index.html`（比如技能自身就是网页应用）会打架。
- 👉 适合「这个仓库本身就是一个网站」的仓库；**不适合** skill 仓库（skill 的根是给 WorkBuddy 读的）。

## ④ 推 `gh-pages` 分支

站点内容推到 `gh-pages` 分支根目录，Pages 指向该分支。

```bash
node scripts/init.mjs --target /path/to/iskill-xxx --branch-mode   # 用工作流自动推
# 或者零工作流、每次手动推：
git subtree push --prefix promo-page origin gh-pages
```

设置：**Settings → Pages → Deploy from a branch → gh-pages / `/(root)`**（`bash scripts/pages.sh gh-pages <owner/repo> --apply`）

- ✅ Pages 源分支与源码分支彻底解耦，`main` 上不出现网站目录。
- ⚠️ 手动 `git subtree push` 容易被忘记 —— 那还不如模式 ②。
- ⚠️ 官方说明（**未在本机实测**）：用 `GITHUB_TOKEN` 推的提交不再触发 Pages 的 *build*，
  但内置的 `pages-build-deployment` 流程会识别到「该分支无需构建」并直接部署 ——
  所以**分支根必须有 `.nojekyll`**（模板里已带），否则可能走 Jekyll 构建。

---

## 决策速查

| 你的处境 | 选哪个 |
|---|---|
| 无所谓、想一次配好别再管 | **① Actions 产物**（默认） |
| 不想碰 Actions / token 没有 workflow scope | **② `--out docs`** ← 最推荐 |
| 这个仓库本身就是个网站 | ③ 根目录 |
| 必须让 `main` 干净、不要网站目录 | ④ gh-pages 分支 |

> ⚠️ **别同时开多种模式**：分支模式与 Actions 产物模式会互相覆盖，谁后跑谁赢，表现是「改了不生效」。

---

## 常见坑

| 现象 | 原因与解法 |
|---|---|
| Settings 的文件夹下拉里找不到 `promo-page` | Pages 分支模式只认 `/` 与 `/docs` → 改用 `--out docs`（模式 ②），或用工作流 |
| 站点 404 / 打开是 README 而不是落地页 | 发布源目录选错（选到了根，而站点在子目录）→ 重设 Folder |
| 分支模式下页面报 Liquid / `{{ }}` 语法错 | Jekyll 在处理文件 → 站点目录里必须有 `.nojekyll`（模板已带，别删） |
| 选了 `/docs` 后构建失败，提示 missing docs folder | `/docs` 目录被删或改名了 |
| 推 workflow 文件 403 | token 缺 `workflow` scope → `gh auth refresh -s workflow` |
| 页面里某张图 404 | 引用了 `.github/` 下的资源（该路径被 Pages 硬封锁），或用了绝对路径 |
| 改了 `promo-page/` 但线上没变，且工作流没跑 | 工作流的 `paths` 只监听 `__SITE_DIR__/**`；或用的是分支模式而目录名不是 `/docs` |
| 私有仓库的 Pages 会不会也私有？ | **不会** —— Pages 站点一律公网可见，敏感内容别放上去 |

---

## `scripts/pages.sh` 速查

```bash
bash scripts/pages.sh status   <owner/repo>            # 只读，看当前配置
bash scripts/pages.sh docs     <owner/repo> --apply    # 模式 ②（默认 dry-run，只打印命令）
bash scripts/pages.sh root     <owner/repo> --apply    # 模式 ③
bash scripts/pages.sh gh-pages <owner/repo> --apply    # 模式 ④
bash scripts/pages.sh workflow <owner/repo> --apply    # 模式 ①
```

- 默认 **dry-run**（只打印将要执行的 `gh api` 命令），确认无误再加 `--apply`。
- 会自动判断用 `PUT`（改已有站点）还是 `POST`（首次创建）。
- 前提：`gh` 已登录、对仓库有 admin 权限、仓库已推到 GitHub。
