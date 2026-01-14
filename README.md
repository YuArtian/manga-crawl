# Manga Crawl

> 一个支持批量下载的漫画下载器，带有漫画库管理功能

## 特性

- **批量下载**：支持下载整部漫画的所有章节
- **漫画库管理**：通过 `index.json` 管理漫画配置，语义化命名
- **智能过滤**：自动过滤"卷"类型章节，避免重复下载
- **断点续传**：自动保存下载进度，支持中断恢复
- **代理支持**：支持 HTTP 代理，解决网络访问问题
- **双模式下载**：Browser 模式（Playwright）和 Direct 模式（HTTP）

## 安装

```bash
# 安装依赖
npm install

# 安装 Playwright 浏览器
npx playwright install chromium
```

## 快速开始

### 1. 添加漫画到库

在 `doc/manhuigui/index.json` 中添加漫画配置：

```json
{
  "site": "https://m.manhuagui.com",
  "lib": [
    {
      "name": "chainsawman",
      "id": "30252"
    }
  ]
}
```

> `name`: 语义化名称（用于文件夹命名）  
> `id`: 网站上的漫画 ID（从 URL 中获取）

### 2. 同步章节列表

```bash
npm start -- sync chainsawman -p "http://127.0.0.1:7890"
```

这会从网站获取所有章节信息并保存到 `index.json`。

### 3. 下载所有章节

```bash
npm start -- download -n chainsawman --all -p "http://127.0.0.1:7890"
```

## 命令参考

### sync - 同步章节列表

```bash
npm start -- sync <name> [options]

# 示例
npm start -- sync chainsawman -p "http://127.0.0.1:7890"
```

| 选项 | 说明 |
|------|------|
| `-p, --proxy <url>` | 代理地址 |

### download - 下载漫画

```bash
npm start -- download [options]

# 按名称下载所有章节
npm start -- download -n chainsawman --all -p "http://127.0.0.1:7890"

# 按 URL 下载单个章节
npm start -- download -u "https://m.manhuagui.com/comic/30252/405318.html" -m browser
```

| 选项 | 说明 |
|------|------|
| `-n, --name <name>` | 漫画名称（从库中） |
| `-u, --url <url>` | 章节 URL |
| `--all` | 下载所有章节 |
| `-m, --mode <mode>` | 下载模式：browser / direct（默认 browser） |
| `-p, --proxy <url>` | 代理地址 |
| `-o, --output <dir>` | 输出目录 |
| `--no-headless` | 显示浏览器窗口（调试用） |

### list - 查看漫画库

```bash
npm start -- list
```

### status - 查看下载状态

```bash
npm start -- status
```

### resume - 恢复下载

```bash
npm start -- resume
```

## 文件结构

```
manga-crawl/
├── src/
│   ├── index.js          # CLI 入口
│   ├── core/             # 核心调度
│   ├── strategies/       # 下载策略
│   ├── workers/          # 工作线程
│   ├── state/            # 状态管理
│   ├── parsers/          # 站点解析器
│   └── utils/            # 工具函数
├── doc/manhuigui/
│   └── index.json        # 漫画库配置
├── config/               # 配置文件
├── downloads/            # 下载输出
│   └── chainsawman/
│       ├── chapter_0001/
│       ├── chapter_0002/
│       └── ...
└── state/                # 状态存储
```

## 配置

配置文件位于 `config/default.json`：

```json
{
  "browser": {
    "headless": true,
    "timeout": 30000
  },
  "download": {
    "outputDir": "./downloads",
    "stateDir": "./state"
  },
  "proxy": {
    "enabled": false,
    "url": ""
  }
}
```

## 下载模式

| 特性 | Browser 模式 | Direct 模式 |
|------|-------------|-------------|
| 速度 | 较慢 | 快 |
| 稳定性 | 高 | 中 |
| 反爬绕过 | 自动处理 | 可能被拦截 |
| 推荐场景 | 默认使用 | 有稳定网络时 |

## 章节类型

程序会自动识别并过滤以下类型：

| 类型 | 示例 | 默认行为 |
|------|------|----------|
| 话/回 | 第01话、第01回 | ✅ 下载 |
| 卷 | 第01卷 | ❌ 跳过（内容重复） |
| 附录 | 第1卷附录 | ✅ 下载 |
| 番外 | 番外篇01 | ✅ 下载 |

## License

MIT
