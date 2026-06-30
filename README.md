# VocabTrainer

移动端友好的纯前端背单词工具。数据默认保存在本地 IndexedDB，支持 GitHub Gist 跨端同步，支持 iPhone 加到主屏后以 PWA 方式使用。

## 功能

- 手动粘贴固定 KV 模板导入单词
- 简化 SM-2 记忆节奏
- 认识 3 次后进入已掌握词库
- 词库搜索、重置进度、手动掌握
- 每日新词数配置
- JSON 本地备份/恢复
- GitHub Gist 同步与冲突逐条处理
- PWA 安装到主屏

## 本地开发

```bash
corepack enable
corepack pnpm install
corepack pnpm dev
```

常用命令：

```bash
corepack pnpm test:run
corepack pnpm lint
corepack pnpm build
```

默认开发地址：`http://localhost:5173`

## GitHub Gist 同步

1. 打开 GitHub -> Settings -> Developer settings -> Personal access tokens
2. 创建只含 `gist` 权限的 token
3. 在应用“设置”页填入 PAT
4. 首次可留空 Gist ID，点击“立即同步”会自动创建私有 Gist
5. 在其他设备填入同一 PAT 和 Gist ID，即可同步

同步规则：

- 同一单词只在一端改动：保留较新的版本
- 两端都在上次同步后改动：弹出冲突窗口，逐条选择保留本地或远端
- PAT 不会写入远端 Gist 文件
- 当前学习会话只保留在本地，不参与跨端同步

## 部署到 Cloudflare Pages

1. 将 `vocab-app/` 推送到 GitHub 仓库
2. 打开 Cloudflare Dashboard -> Pages -> Create -> Connect to Git
3. 选择仓库后设置：
   - Build command: `corepack pnpm build`
   - Build output directory: `dist`
4. 完成首次部署后得到一个 `https://<project>.pages.dev` 地址
5. 之后每次 push，Cloudflare Pages 会自动重新构建

## iPhone 加到主屏

1. 用 iPhone Safari 打开部署后的 HTTPS 地址
2. 点击底部分享按钮
3. 选择“添加到主屏幕”
4. 桌面图标安装后会以独立应用方式打开

## 数据说明

- 单词、学习进度、设置：保存在浏览器 IndexedDB
- JSON 导出：用于手动备份/恢复
- Gist 同步：用于 Mac / Windows / iPhone 间同步
- 清空数据：会删除当前设备本地数据

## 技术栈

- React 18
- TypeScript 5
- Vite 5
- Tailwind CSS 3
- IndexedDB + `idb`
- Vitest
- `vite-plugin-pwa`
