# VocabTrainer

移动端优先的纯前端背单词工具。数据默认保存在浏览器 IndexedDB，可通过 GitHub Gist 手动跨端覆盖同步，支持添加到 iPhone 主屏后作为 PWA 使用。部署在 Cloudflare Pages，`main` 分支自动构建。

---

## 功能一览

- 手动粘贴固定 KV 格式导入单词，粘贴后一键解析并直接完成导入
- 支持“回滚最近一次导入”：撤销上次新增/覆盖，恢复上次导入前的状态
- 词库列表支持行内删除，删除时会自动清理今天的学习队列
- 简化 SM-2 记忆节奏，连续答对 3 次即可进入“已掌握”
- 每日新词数可配置（1–100）
- 学习页显示 EF 说明弹窗，词库列表使用中文短文案
- 首页 / 词库 / 导入 / 统计 / 设置五个 Tab，学习页独立无底栏
- 顶部适配 iPhone 安全区，底部导航按 `env(safe-area-inset-bottom)` 抬起
- JSON 本地备份 / 恢复
- 通过 GitHub Gist 明确“上传到云端 / 从云端下载”两个方向做整体覆盖同步
- PWA 支持添加到主屏，检测到新版本时页面底部弹提示，点击“更新”即刷新到最新版

---

## 技术栈

- React 18 + TypeScript 5
- Vite 5
- Tailwind CSS 3
- IndexedDB（通过 `idb` 封装）
- `vite-plugin-pwa`（`registerType: 'prompt'`）
- Vitest + Testing Library

---

## 页面结构

```
/         Home       今日进度、开始学习入口
/library  Library    词库列表、搜索、行内删除
/import   Import     粘贴文本 → 解析并导入 → 回滚
/stats    Stats      每日完成度、总量
/settings Settings   每日新词数、GitHub 同步、备份/恢复、清空
/study    Study      学习页，无底栏，独立布局
/word/:w  WordDetail 单词详情，含 EF 说明
```

学习页独立渲染，其他页共用统一的页面壳（`.app-page-shell` / `.app-page-shell--compact`）。

---

## 数据模型与存储

数据全部存在浏览器 IndexedDB 中，库名 `vocab`，通过 `idb` 封装。核心表：

- `words`：所有单词，键为词形 `w`
  - `w / meaning / status / streak / ef / interval / due / updatedAt`
- `meta`：单条记录，键为固定字符串
  - `settings`：每日新词数、当天已完成日期、`githubPat`、`githubGistId`、`lastSyncAt`、`currentSession` 等
  - `lastImport`：最近一次成功导入的变更集，供“回滚最近一次导入”使用

**只保存在本地、不参与云端同步的字段：**

- `githubPat`、`githubGistId`：只写本地，永远不会上传到 Gist
- `lastImport`：只写本地
- `currentSession`：当天学习进度，不参与云端同步
- `completedDates`、`overachievedDates`：设备本地统计，不参与云端同步

---

## 记忆算法

简化版 SM-2：

- 初始 `ef = 2.5`，答对 `+0.1`，答错 `-0.2`，限制在 `1.3 ~ 3.0`
- 答对 `streak += 1`，答错 `streak = 0`
- `streak >= 3` 视为“已掌握”
- 复习间隔按 `interval * ef` 递增
- `due` 到期即可复习

学习页只显示到期的词 + 每日新词数。EF 含义在 `词条详情页 -> 记忆系数 -> ?` 弹窗中解释。

---

## 导入与回滚

导入格式（示例）：

```
w=example
meaning=例子；范例

w=vivid
meaning=生动的；鲜明的
```

流程：

1. 粘贴文本 → 点击“解析并导入”
2. 系统自动解析、查重、写入 IndexedDB
3. **重复词默认覆盖**内容（`meaning`），但保留学习进度（`streak / ef / interval / due`）
4. 页面显示：`新增 X，覆盖 Y`
5. 系统同时记录 `lastImport`：这次新增的词 + 被覆盖词的旧内容

回滚：

- 点击“回滚最近一次导入”
- 删除本次新增的词
- 将本次被覆盖的词恢复为导入前的旧内容
- 回滚成功后清空 `lastImport`，防止重复回滚

仅支持“最近一次成功导入”的一次性回滚；不做多级历史。

---

## 删除与学习会话保护

- 词库行内：单词行右侧有“删除”按钮，二次确认后立即删除
- 详情页：底部也有删除按钮，二次确认后删除并返回列表
- 所有删除入口都会走同一个 `deleteWordAndCleanupSession`，同步清理今天 `currentSession.queue / done` 中的这个词
- 学习页在渲染前如果发现某个词已被删除，会自动跳过下一张

这样避免了“删除一个已经进入今天队列的词后，学习页卡在空占位”的问题。

---

## 本地开发

```bash
cd vocab-app
npm install
npm run dev
```

常用命令：

```bash
npm run test:run   # 运行 Vitest（全部通过 = 61+ 用例）
npm run lint       # tsc --noEmit
npm run build      # Vite + PWA 产物到 dist/
```

默认开发地址：`http://localhost:5173`，若被占用会自动切到下一个端口（如 `5174`）。

---

## 部署到 Cloudflare Pages

当前部署地址：`https://vocab-app-4zk.pages.dev`  
GitHub 仓库：`https://github.com/xieyouyun/vocab-app`  
`main` 分支推送后自动构建。

如需从零重新绑定或新建部署：

1. 把 `vocab-app/` 推送到 GitHub 仓库（当前使用 `xieyouyun/vocab-app`）
2. Cloudflare Dashboard → Pages → Create → Connect to Git
3. 选择该仓库，设置：
   - Production branch: `main`
   - Root directory: `vocab-app`
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Node version: 20 或更新（Vite 5 要求）
4. 保存并触发首次构建
5. 后续 push `main` 会自动构建并部署到 `https://<project>.pages.dev`

日常发布流程：

```bash
# 本地
npm run test:run && npm run lint && npm run build   # 可选，保证不上错
git add -A
git commit -m "feat: xxx"
git push origin main
```

推送后：

- Cloudflare Pages 会在 1–2 分钟内完成构建
- PWA 用户下次打开时，客户端会检测到新的 Service Worker

---

## PWA 与更新

- 添加到主屏：iPhone Safari 打开部署地址 → 分享菜单 → 添加到主屏幕
- 应用已启用 `navigator.storage.persist()`，尽量避免 iOS Safari 因 7 天未访问而清理 IndexedDB。iOS 不保证一定授权，但显著降低数据被清风险
- 更新机制：`vite-plugin-pwa` 使用 `registerType: 'prompt'`
  - 每小时后台自动 `registration.update()` 检查一次
  - 检测到新版本时，页面底部弹一条“发现新版本 [稍后] [更新]”
  - 点击“更新”会激活新 SW 并 `window.location.reload()`，iOS Safari 下有 400ms 兜底强制重载
- iOS 图标/启动图不会随 SW 更新，如需换图标：长按主屏图标 → 移除 → 重新添加到主屏

如果“更新”按钮在旧版本上没反应，先在 Safari 里长按刷新 → “重新载入而不使用缓存”，把最新版拉到本地一次，之后主屏 PWA 的更新按钮就正常了。

---

## GitHub Gist 同步操作指引

同步语义已简化为两个明确方向：

- **上传到云端**：把当前本地数据整体覆盖云端 Gist
- **从云端下载**：把云端 Gist 整体覆盖本地

不再做合并、不再产生冲突。这也解决了“合并模式下删除的词会被另一端重新推回”的问题。

### 一次性准备

1. 打开：
   - Fine-grained：`https://github.com/settings/tokens?type=beta`
   - 或 Classic：`https://github.com/settings/tokens`
2. 点击 `Generate new token`，设置有效期
3. 权限：
   - Fine-grained：`Account permissions → Gists → Read and write`
   - Classic：勾选 `gist`
4. 生成后复制 token（只显示一次）
5. 打开应用 → 设置页 → GitHub 同步：
   - 粘贴 token 到 `Personal Access Token` 输入框（自动保存到本地）
   - `Gist ID` 首次留空即可

### 首次上传

1. 在“主设备”（一般是你数据最全的那台）打开应用
2. 确认设置页 PAT 已保存
3. 打开 **导入页**，点击 `上传到云端`
4. 若无 `Gist ID`，会自动创建一个私有 Gist，创建后 `Gist ID` 会自动填入设置页
5. 记录或复制这个 `Gist ID`，供其他设备使用

### 在其他设备接入

1. 打开该设备的应用 → 设置页
2. 粘贴同一个 `Personal Access Token`
3. 粘贴主设备生成的 `Gist ID`
4. 点击 `从云端下载（覆盖本地）`
5. 本地词库、学习进度、每日新词数会被云端数据整体替换

Token 和 Gist ID 只保存在本机 IndexedDB，不会上传到 Gist 文件里。

### 日常同步流程建议

因为是覆盖式同步，请遵循一条简单原则：**谁刚学过 / 刚改过，先上传；再去另一端下载。**

例如：

- PC 上刚导入了一批词
  1. PC 在导入页点“上传到云端”
  2. iPhone 在设置页点“从云端下载”
- iPhone 上刚学习完
  1. iPhone 在导入页点“上传到云端”
  2. PC 在设置页点“从云端下载”

如果两端都改过，请自己决定保留哪一端；下载的一端会**丢失自己那一段的改动**，这是覆盖式同步的正常代价。

### 注意事项

- 手动上传/下载前应用会弹一次浏览器 `confirm`，防误触
- 上传的字段：词库、`dailyNewCount`、`completedDates`、`overachievedDates`、`totalCompletedDays`、`longestStreak`
- 上传会自动去掉 `githubPat / githubGistId / lastSyncAt / currentSession` 等本地字段
- 下载会自动把本地保留的 PAT、Gist ID 注回 `settings`，避免自我覆盖
- 下载时打卡日历、累积天数、最长连续天数会与本地做并集/取最大值合并，其他字段仍是覆盖式
- 每次学习目标达成时会 fire-and-forget 触发一次静默上传，不弹提示，网络/PAT 缺失都不影响学习流程
- Gist 是私有的，只有持有该 PAT 的账号可访问
- Token 过期或权限不足时，UI 会显示错误码，例如 `pushGist 401` 或 `fetchGist 404`

---

## 数据说明

- 单词 / 学习进度 / 设置：浏览器 IndexedDB（库名 `vocab`）
- JSON 导出：设置页 → 导出 JSON，可作为完整本地备份
- JSON 导入：设置页 → 导入 JSON，会整体替换 IndexedDB
- Gist 同步：见上一节
- 清空数据：设置页 → 清空所有数据，二次确认后清空 IndexedDB（不影响 Gist）

---

## 常见问题

- **每次都要重新输入 PAT / Gist ID？**  
  应用已改为“输入后 400ms 自动保存到 IndexedDB”，并请求了持久化存储。如仍反复丢失，多半是 iOS Safari ITP 清理了主屏 PWA 的数据。缓解办法：把网页加到主屏（PWA 数据保留优先级更高）；定期主动打开一次；日常使用 `上传到云端` 备份。
- **手机上点“更新”按钮没反应？**  
  一次性问题，出现在旧版本上。在 Safari 里长按刷新 → 重新载入而不使用缓存，之后主屏 PWA 的更新按钮会恢复正常（已加 400ms 兜底 reload）。
- **删除的词又出现了？**  
  旧的合并同步会导致此问题。当前实现已改为覆盖式同步，只要按“先上传、再下载”的顺序操作即可避免。
- **导入后想撤销？**  
  在导入页点击“回滚最近一次导入”。只支持最近一次成功的导入。
- **看不到底部“更新”提示？**  
  说明当前版本已经是最新，或后台检查还没轮到。可 1 分钟后再看，或手动下拉刷新。
