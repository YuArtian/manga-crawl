# Comic Downloader

> 一个支持双模式（Browser/Direct）的漫画下载器

## 特性

- **双模式下载**：Browser 模式（Playwright）和 Direct 模式（HTTP 直连）
- **断点续传**：自动保存下载进度，支持中断恢复
- **并发控制**：智能资源管理，防止被封禁
- **状态管理**：完整的下载状态追踪
- **CLI 界面**：简洁的命令行操作

## 安装

```bash
# 安装依赖
npm install

# 安装 Playwright 浏览器（Browser 模式需要）
npx playwright install chromium
```

## 使用

### 下载章节

```bash
# Browser 模式（推荐，更稳定）
npm start -- download -u "https://m.manhuagui.com/comic/30252/405318.html" -m browser

# Direct 模式（更快，但可能被反爬）
npm start -- download -u "https://m.manhuagui.com/comic/30252/405318.html" -m direct

# 显示浏览器窗口（调试用）
npm start -- download -u "URL" -m browser --no-headless

# 指定输出目录
npm start -- download -u "URL" -o ./my-downloads
```

### 查看状态

```bash
npm start -- status
```

### 恢复下载

```bash
npm start -- resume
```

### 查看配置

```bash
npm start -- config
```

## 配置

配置文件位于 `config/default.json`：

```json
{
  "browser": {
    "headless": true,
    "maxInstances": 2,
    "timeout": 30000
  },
  "direct": {
    "maxConcurrency": 8,
    "timeout": 15000,
    "retries": 3
  },
  "download": {
    "outputDir": "./downloads",
    "stateDir": "./state"
  }
}
```

## 目录结构

```
comic-downloader/
├── src/
│   ├── index.js          # CLI 入口
│   ├── core/             # 核心调度
│   ├── strategies/       # 下载策略
│   ├── workers/          # 工作线程
│   ├── state/            # 状态管理
│   ├── parsers/          # 站点解析器
│   └── utils/            # 工具函数
├── config/               # 配置文件
├── downloads/            # 下载输出
└── state/                # 状态存储
```

## 下载模式对比

| 特性 | Browser 模式 | Direct 模式 |
|------|-------------|-------------|
| 速度 | 较慢 | 快 |
| 稳定性 | 高 | 中 |
| 反爬绕过 | 自动处理 | 需要正确 Header |
| 资源占用 | 高（需要浏览器） | 低 |
| 推荐场景 | 首次下载、调试 | 批量下载 |

## 断点续传

- 下载进度自动保存在 `state/` 目录
- 程序中断后运行 `npm start -- resume` 继续
- 已下载的页面会自动跳过

## License

MIT
