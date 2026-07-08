# VocabTrainer - 项目启动指南

## 快速开始

```bash
cd /Users/bytedance/Documents/trae_projects/mlbb/vocab-app
npm run dev
```

浏览器打开 `http://localhost:5173`（端口可能自动递增）。

---

## 关键命令

| 命令 | 作用 |
|------|------|
| `npm run dev` | 启动开发服务器 |
| `npm run test:run` | 运行全部测试（68 用例） |
| `npm run lint` | TypeScript 类型检查 |
| `npm run build` | 构建到 `dist/` |

---

## 项目路径

```
/Users/bytedance/Documents/trae_projects/mlbb/vocab-app/
├── src/
│   ├── pages/          # 页面组件
│   ├── components/     # 通用组件
│   └── lib/            # 业务逻辑
├── dist/               # 构建产物
├── vitest.config.ts    # 测试配置
├── vite.config.ts      # Vite 配置
└── tailwind.config.js  # Tailwind 配置
```

---

## 技术栈

- React 18 + TypeScript 5
- Vite 5
- Tailwind CSS 3
- IndexedDB（`idb` 封装）
- `vite-plugin-pwa`（`registerType: 'prompt'`）
- GitHub Gist API（同步）
- Vitest + Testing Library（测试）

---

## 核心数据模型

**settings**（存储在 IndexedDB `meta` 表）：

| 字段 | 说明 |
|------|------|
| `dailyNewCount` | 每日新词数（1-100） |
| `completedDates` | 打卡日期列表（最近 90 天） |
| `overachievedDates` | 超额日期列表（最近 90 天） |
| `totalCompletedDays` | 累积完成天数（只增不减） |
| `longestStreak` | 历史最长连续天数（只增不减） |
| `githubPat` | GitHub PAT（本地加密） |
| `githubGistId` | Gist ID（本地） |
| `currentSession` | 今日学习会话状态 |

**words**（存储在 IndexedDB `words` 表）：

| 字段 | 说明 |
|------|------|
| `w` | 词形（主键） |
| `cn` | 中文释义 |
| `s` | 状态：`new` / `learning` / `mastered` |
| `streak` | 连续答对次数 |
| `ef` | 记忆系数（1.3-3.0） |
| `interval` | 复习间隔（分钟） |
| `dueAt` | 下次到期时间戳 |

---

## 同步语义

| 操作 | 词库 | 打卡日历 | 累计天数 | 最长连击 |
|------|------|----------|----------|----------|
| 上传到云端 | 覆盖 | 覆盖 | 覆盖 | 覆盖 |
| 从云端下载 | 覆盖 | **并集** | **max** | **max** |

同步入口：
- **导入页**：手动"上传到云端"按钮
- **设置页**：手动"从云端下载（覆盖本地）"按钮
- **学习页**：打卡完成后 fire-and-forget 静默上传

---

## 页面路由

| 路径 | 组件 | 说明 |
|------|------|------|
| `/` | Home | 首页（今日进度、开始学习） |
| `/library` | Library | 词库列表、搜索、行内删除 |
| `/import` | Import | 粘贴导入、上传到云端、回滚 |
| `/stats` | Stats | 统计页（日历、累计、连击） |
| `/settings` | Settings | 设置页（每日新词、下载、备份） |
| `/study` | Study | 学习页（独立布局，无底栏） |
| `/word/:w` | WordDetail | 单词详情（EF 说明弹窗） |

---

## 核心文件速查

| 文件 | 职责 |
|------|------|
| `src/lib/db.ts` | IndexedDB 封装（核心） |
| `src/lib/types.ts` | TypeScript 类型定义 |
| `src/lib/srs.ts` | SM-2 记忆算法 |
| `src/lib/session.ts` | 学习会话管理 |
| `src/lib/sync.ts` | Gist 同步逻辑 |
| `src/lib/stats.ts` | 统计计算（90天裁剪、打卡合并） |
| `src/lib/import.ts` | 导入与回滚 |
| `src/lib/backup.ts` | JSON 备份/恢复 |
| `src/components/NavBar.tsx` | 底部导航栏 |
| `src/App.tsx` | 路由配置 |

---

## 开发规范

1. **测试优先**：新功能先写测试，再实现
2. **lint 通过**：提交前运行 `npm run lint`
3. **类型安全**：所有 API 必须有类型定义
4. **无 console.log**：提交前清理调试日志
5. **英文 commit**：遵循 Conventional Commits

---

## 测试状态

```
npm run test:run  →  68/68 通过
npm run lint      →  通过
```

---

## 部署

当前部署地址：`https://vocab-app-4zk.pages.dev`  
GitHub 仓库：`https://github.com/xieyouyun/vocab-app`  
`main` 分支 push 后 Cloudflare Pages 自动构建。
