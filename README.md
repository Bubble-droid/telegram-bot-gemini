# Telegram Bot Gemini 🤖💬

**一个基于 Cloudflare Workers 和 Gemini API 的 Telegram Bot，提供智能对话、Google 搜索等功能。**

## ✨ 功能特性

本项目基于 Cloudflare Workers 平台和 Google 的 Gemini API 构建，旨在 Telegram 群组中提供智能助手服务。

### ✅ 已实现和已完善的功能

*   **核心对话功能:**
    *   🗣️ **群组 @Bot 文本提问 (带上下文):**  在群组中 `@Bot名称 + 提问内容`，机器人将结合上下文历史进行智能回复。
    *   🖼️ **群组 @Bot 图片提问 (带上下文):**  支持发送图片并 `@Bot名称 + 提问内容`，机器人能理解图片描述 (通过 `caption` 文本)，并结合上下文回复。
    *   ↩️ **回复 @Bot 提问 (不带上下文):**  回复群组内的消息并 `@Bot名称`，机器人会将**被回复消息**的内容作为提问内容，进行**不带上下文**的回复，同样支持文本和图片。
    *   🔎 **Google 搜索功能 (通过 `/search` 命令，不带上下文):**  使用 `/search @Bot名称 关键词` 命令，机器人将调用 Google 搜索工具，快速获取信息并返回结果。
    *   ⚡ **Gemini API 流式回复:**  对于 @Bot 提问和回复 @Bot 提问，采用流式传输方式，逐步展示回复内容，提供更流畅的对话体验。
    *   🎨 **消息格式化处理:**  机器人回复支持 HTML 格式化，包括代码块、加粗、斜体、链接等，提升信息呈现效果。

*   **群组和用户管理:**
    *   🛡️ **群组白名单:**  机器人仅在白名单群组中工作，保障服务范围可控。
    *   👤 **用户白名单 (命令白名单):**  管理命令 (如白名单管理、上下文清理) 仅限白名单用户使用，确保机器人安全。
    *   ➕ ➖ **群组白名单管理命令:**  提供 `/whitelist_group @Bot名称` 和 `/unwhitelist_group @Bot名称` 命令，方便群组管理员自助管理。

*   **冷却机制:**
    *   ⏳ **群组冷却:**  限制群组消息请求频率，防止 API 滥用，默认冷却时间为 1.5 分钟。
    *   ⏱️ **Google 搜索独立冷却:**  Google 搜索功能拥有独立的冷却时间 (默认 3 分钟)，与普通对话冷却互不干扰。
    *   ✅ **白名单用户免冷却:**  白名单用户不受群组冷却限制，畅享丝滑体验。

*   **上下文管理:**
    *   📖 **上下文记录:**  记录群组内用户的多轮对话上下文，实现连续对话能力。
    *   💾 **上下文存储 (KV):**  利用 Cloudflare KV 存储上下文历史，高效可靠。
    *   🧹 **上下文清理命令:**  `/clear_group_context @Bot名称` 命令，一键清理群组对话记忆。
    *   🗑️ **孤立图片数据清理:**  智能清理 KV 中不再使用的图片 Base64 数据，节省存储空间。

*   **Bot 命令和信息:**
    *   ⚙️ **Bot 命令菜单:**  Telegram Bot 命令菜单，方便用户快捷使用指令。
    *   ℹ️ **/start 命令:**  详细介绍机器人功能、使用方法等信息。
    *   ❓ **/help 命令:**  列出所有可用命令及简要说明。

*   **错误处理和日志:**
    *   ⚠️ **全面的错误处理:**  覆盖 API 调用、KV 操作、数据解析等各环节，保障程序健壮性。
    *   📝 **详细的日志记录:**  关键操作均有日志，方便问题追踪和调试。
    *   🚨 **流式回复错误处理:**  流式回复异常情况处理，保证用户体验。
    *   ❗ **Google 搜索错误提示:**  搜索功能异常时，提供清晰错误提示。

*   **代码质量和架构:**
    *   🧩 **模块化设计:**  代码结构清晰，功能模块化，易于维护和扩展。
    *   ✍️ **清晰的代码注释:**  代码逻辑注释详尽，方便理解。
    *   🎨 **代码风格统一:**  代码风格规范，易于阅读和协作。
    *   🔒 **安全性考虑:**  具备用户权限控制，保障机器人安全运行。

## 📂 项目目录结构

```bash
telegram-bot-gemini/
├── config/                      # 配置文件目录
│   ├── knowledge-base-v2.json   # (可选) 更高级的知识库配置 (目前未使用)
│   └── model-prompt.json        # (可选) 模型 Prompt 配置 (目前未使用)
├── kv/                          # Cloudflare KV 命名空间配置 (系统提示等)
│   ├── system_prompt.json       # 默认系统提示 (JSON 格式)
│   ├── system_prompt-lite.json  # (可选) 简化的系统提示 (JSON 格式，目前未使用)
│   └── system_search_prompt.json# Google 搜索功能系统提示 (JSON 格式)
├── LICENSE                      # 开源许可证文件 (MIT License)
├── package.json                 # 项目依赖和脚本配置
├── package-lock.json            # 锁定依赖版本 (npm)
├── README.md                    # 项目自述文件 (当前文件)
├── src/                         # 源代码目录
│   ├── gemini.js                # Gemini API 客户端初始化和封装
│   ├── handlers/                # 消息处理器目录
│   │   ├── command-handler.js   # Bot 命令消息处理器 (如 /start, /help 等)
│   │   ├── image-handler.js     # 图片消息处理器
│   │   └── search-handler.js    # Google 搜索命令消息处理器 (/search)
│   ├── index.js                 # Cloudflare Worker 入口文件 (消息处理主逻辑)
│   ├── storage/                 # 数据存储相关模块
│   │   └── context-storage.js   # 对话上下文存储和管理 (Cloudflare KV)
│   ├── utils/                   # 工具函数目录
│   │   ├── cooldown.js          # 冷却时间管理 (群组冷却, 搜索冷却)
│   │   └── formatter.js         # 消息格式化工具 (HTML 格式化)
│   │   └── utils.js             # 通用工具函数 (KV 读写, 白名单管理等)
│   └── utils.js                 # 通用工具函数 (KV 读写, 白名单管理等)
├── vitest.config.js           # Vitest 单元测试配置 (目前未使用)
└── wrangler.json                # Cloudflare Wrangler 配置文件 (Workers 部署配置)
```

**目录结构说明:**

*   **`config/`**: 存放项目配置文件，例如知识库配置、模型 Prompt 配置等。(目前部分配置未使用)
*   **`kv/`**: 存放 Cloudflare KV 命名空间中使用的 JSON 格式的系统提示信息。
*   **`src/`**: 项目的核心源代码目录，包含各种功能模块的实现。
    *   **`gemini.js`**: 封装了 Gemini API 的客户端初始化和调用方法，方便在其他模块中使用。
    *   **`handlers/`**: 存放各种消息处理器，例如命令处理器、图片处理器、搜索处理器等，负责处理不同类型的 Telegram 消息。
    *   **`index.js`**: Cloudflare Worker 的入口文件，负责接收 Telegram Webhook 事件，并根据消息类型分发到不同的处理器进行处理。
    *   **`storage/`**: 存放数据存储相关的模块，目前主要包含 `context-storage.js`，用于管理对话上下文的存储和读取。
    *   **`utils/`**: 存放各种工具函数，例如冷却时间管理、消息格式化、KV 读写、白名单管理等，提供常用的辅助功能。
*   **根目录文件:**
    *   **`LICENSE`**:  项目的开源许可证文件，本项目使用 MIT License。
    *   **`package.json` 和 `package-lock.json`**:  Node.js 项目的依赖管理文件，定义了项目所需的依赖包和版本信息。
    *   **`README.md`**:  项目自述文件，包含项目介绍、功能特性、使用方法、开发说明、部署指南等重要信息。(当前文件)
    *   **`vitest.config.js`**:  单元测试框架 Vitest 的配置文件 (目前项目尚未编写单元测试)。
    *   **`wrangler.json`**:  Cloudflare Wrangler 的配置文件，用于配置 Workers 项目的名称、入口文件、环境变量、KV 命名空间绑定等部署信息。

### 🚧 已实现但未完善的功能

*   **图片消息处理:**
    *   📏 **图片大小限制:**  可能受 Telegram API 文件大小限制，过大图片处理可能失败。
    *   🤔 **图片内容理解能力:**  目前主要依赖图片 `caption` 文本描述，多模态能力有待进一步挖掘。

*   **上下文管理:**
    *   ✂️ **上下文长度限制:**  上下文历史记录条数有限制，长对话可能丢失早期信息。
    *   🔄 **上下文清理策略:**  目前清理策略相对简单，未来可考虑更智能的自动清理机制。
    *   📦 **群组上下文批量清理:**  KV 批量删除 API 限制，批量清理效率有待提升。

*   **错误提示和用户体验:**
    *   💬 **错误提示信息:**  部分错误提示可以更友好、更具指导性。
    *   ⏳ **命令回复清理延迟:**  KV 轮询延迟删除机制，效率和实时性可进一步优化。

### 🚀 有计划但尚未实现的功能

*   **更精细化的用户权限管理:**  例如，基于用户角色进行更细致的权限划分。
*   **更丰富的 Bot 命令:**
    *   🔄 **模型切换命令:**  允许用户动态切换 Gemini 模型。
    *   🌡️ **温度 (temperature) 调整命令:**  用户自定义 Gemini 回复的随机性。
    *   📃 **最大输出 Token (maxOutputTokens) 调整命令:**  用户控制 Gemini 回复长度。
    *   📝 **系统提示语 (system prompt) 自定义命令:**  白名单用户可自定义系统提示语，定制机器人角色。
*   📊 **数据统计和监控:**  统计 API 调用次数、用户活跃度等数据，用于服务优化。
*   🌐 **多语言支持:**  支持更多语言的对话交互。

### 💡 计划新增的功能

*   👁️ **更智能的图片内容理解:**  利用 Gemini API 多模态能力，直接理解图片内容，无需 `caption` 辅助。
*   📚 **知识库集成:**  集成 Sing-box 和 GUI.for.SingBox 相关知识库，提供更专业、精准的解答。
*   🔗 **外部信息源集成 (除 Google 搜索外):**  例如 Wikipedia、Wolfram Alpha 等，扩展知识面。
*   📱 **更友好的用户交互界面:**  例如 Telegram Web App 或 Inline Bot，提供更丰富的交互组件。
*   🧩 **插件或扩展机制:**  支持开发者自定义功能，提高机器人可扩展性。

### 🛠️ 计划改进的功能

*   📈 **优化流式回复性能:**  降低编辑消息频率，提升在高并发场景下的性能。
*   ✨ **改进上下文清理策略:**  实现更智能、更灵活的上下文管理和清理机制。
*   💪 **增强错误处理和重试机制:**  提升系统稳定性和可靠性。
*   🚀 **代码性能优化:**  进一步优化代码执行效率，提升响应速度。
*   🧪 **更完善的单元测试和集成测试:**  提高代码质量和可维护性。

## ⚙️ 开发说明

### 环境准备

1.  **Node.js 和 npm:** 确保已安装 Node.js 和 npm (Node 包管理器)。
2.  **Cloudflare Wrangler:**  安装 Cloudflare Workers CLI 工具 `wrangler`。

    ```bash
    npm install -g wrangler
    ```

3.  **pnpm (可选):**  本项目使用 `pnpm` 包管理器，推荐安装使用，可提升依赖安装速度和磁盘空间利用率。

    ```bash
    npm install -g pnpm
    ```

### 安装依赖

在项目根目录下，使用 `pnpm install` 或 `npm install` 安装项目依赖。

```bash
pnpm install # 或 npm install
```

### 环境变量配置

在项目根目录下，创建 `.dev.vars` 文件，并配置以下环境变量 (或直接在 `wrangler.json` 文件中配置 `vars` 字段)：

| 变量名                      | 说明                                                                 | 示例值                                                                   |
| --------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `BOT_TOKEN`                 | Telegram Bot 的 Token，通过 [BotFather](https://t.me/BotFather) 获取。 | `YOUR_BOT_TOKEN`                                                         |
| `GEMINI_API_KEY`            | Google Gemini API 的 API Key，在 [Google AI Studio](https://makersuite.google.com/) 获取。 | `YOUR_GEMINI_API_KEY`                                                    |
| `OPENAI_API_BASE_URL`       | Gemini API 兼容 OpenAI 接口的 Base URL。                               | `https://generativelanguage.googleapis.com/v1beta/openai/`               |
| `GEMINI_MODEL_NAME`         | 默认使用的 Gemini 模型名称 (流式对话)。                                | `gemini-2.0-flash-001`                                                   |
| `DEFAULT_GEMINI_MODEL_NAME` | 默认使用的 Gemini 模型名称 (非流式对话/命令处理)。                          | `gemini-2.0-flash-001`                                                   |
| `TELEGRAM_BOT_NAME`         | Telegram Bot 的用户名 (不带 `@` 符号)。                                  | `YourBotName`                                                            |
| `GROUP_WHITELIST_KV_KEY`    | KV 命名空间中，用于存储群组白名单的 Key。                               | `group_whitelist`                                                        |
| `USER_WHITELIST_KV_KEY`     | KV 命名空间中，用于存储用户白名单 (命令白名单) 的 Key。                   | `user_whitelist`                                                         |
| `SYSTEM_PROMPT_KV_KEY`      | `SYSTEM_INIT_CONFIG_KV_KEY` KV 中，存储**默认系统提示**的 Key。             | `system_prompt`                                                          |
| `SYSTEM_SEARCH_PROMPT_KV_KEY`| `SYSTEM_INIT_CONFIG_KV_KEY` KV 中，存储 **Google 搜索系统提示** 的 Key。      | `system_search_prompt`                                                     |
| `COOLDOWN_DURATION`         | 群组消息冷却时间，例如 `1.5m` (1.5 分钟), `30s` (30 秒)。                  | `1.5m`                                                                   |
| `SEARCH_COOLDOWN_DURATION`    | Google 搜索功能冷却时间，例如 `3m` (3 分钟)。                             | `3m`                                                                     |

**请务必替换 `YOUR_BOT_TOKEN` 和 `YOUR_GEMINI_API_KEY` 为您自己的 Token 和 API Key。**

### KV 命名空间配置

在 `wrangler.json` 文件中，配置 KV 命名空间绑定，确保 `"binding"` 名称与 `vars` 中配置的 KV Key 名称一致。

```json
{
	"kv_namespaces": [
		{
			"binding": "SYSTEM_INIT_CONFIG",
			"id": "YOUR_SYSTEM_INIT_CONFIG_KV_NAMESPACE_ID"
		},
		{
			"binding": "BOT_CONFIG",
			"id": "YOUR_BOT_CONFIG_KV_NAMESPACE_ID"
		},
		{
			"binding": "CONTEXT",
			"id": "YOUR_CONTEXT_KV_NAMESPACE_ID"
		},
		{
			"binding": "IMAGE_DATA",
			"id": "YOUR_IMAGE_DATA_KV_NAMESPACE_ID"
		},
		{
			"binding": "TASK_QUEUE_KV",
			"id": "YOUR_TASK_QUEUE_KV_NAMESPACE_ID"
		}
	]
}
```

**请务必替换 `YOUR_*_KV_NAMESPACE_ID` 为您在 Cloudflare 控制台中创建的 KV 命名空间的 ID。**

### 系统提示上传

系统提示信息存储在 Cloudflare KV 命名空间 `SYSTEM_INIT_CONFIG` 中。

1.  **默认系统提示 (Key: `system_prompt`):**  用于普通对话场景，请上传 **JSON 格式** 的系统提示内容，例如：

    ```json
    {
        "role": "system",
        "content": "You are a helpful assistant in a Telegram group, specializing in Sing-box and GUI.for.SingBox. Be concise and informative."
    }
    ```

2.  **Google 搜索系统提示 (Key: `system_search_prompt`):**  用于 Google 搜索功能，请上传 **JSON 格式** 的系统提示内容，例如：

    ```json
    {
        "systemInstruction": "You are a helpful assistant, who answers questions using google search. Be concise and accurate."
    }
    ```

您可以使用 Cloudflare Workers KV CLI 或 Cloudflare 控制台上传 JSON 数据到 KV 命名空间。

**示例 (使用 Workers KV CLI 上传默认系统提示):**

```bash
npx wrangler kv:put --namespace-id="YOUR_SYSTEM_INIT_CONFIG_KV_NAMESPACE_ID" system_prompt '{"role": "system", "content": "You are a helpful assistant in a Telegram group..."}'
```

## 🚀 部署说明

1.  **登录 Cloudflare 账号:**  确保已登录 Cloudflare 账号并选择了正确的账户。

    ```bash
    wrangler login
    ```

2.  **部署到 Cloudflare Workers:**  在项目根目录下，使用 `wrangler deploy` 命令部署项目。

    ```bash
    wrangler deploy
    ```

    首次部署可能需要一些时间，部署成功后，`wrangler` 会输出 Workers 地址。

3.  **设置 Telegram Bot Webhook:**  将 Workers 地址设置为 Telegram Bot 的 Webhook。您可以使用 Telegram Bot API 的 `setWebhook` 方法，或者使用 [Set Webhook](https://t.me/setwebhook) Bot 等工具进行设置。

    **Webhook URL 格式:**  `https://YOUR_WORKERS_SUBDOMAIN.workers.dev`

## 🤖 默认 Bot 功能介绍和使用说明

Athena 助手是一个基于 Gemini API 和 Cloudflare Workers 构建的 Telegram Bot，专注于为用户提供 Sing-box 和 GUI.for.SingBox 相关的技术支持和信息查询服务。

**默认功能:**

1.  **Sing-box 设置助手:**  基于 Gemini API 的智能对话能力，解答用户关于 Sing-box 和 GUI.for.SingBox 的各种问题。
2.  **文本和图片消息支持:**  支持接收文本和图片消息，辅助理解用户问题。
3.  **上下文对话记忆:**  具备上下文对话记忆能力，记住之前的对话内容，实现更自然的连续对话。
4.  **Google 搜索功能:**  通过 `/search` 命令，快速查询互联网信息。

**使用方法:**

1.  **群组提问:**  在已添加到白名单的 Telegram 群组中，直接 `@Bot名称 + 你的问题` 即可提问。
2.  **图片提问:**  发送 Sing-box 或 GUI.for.SingBox 相关截图，并 `@Bot名称 + 你的问题`，机器人会尝试理解图片内容并回答。
3.  **回复提问:**  回复群组内的消息并 `@Bot名称`，将**被回复消息**的内容作为提问内容。
4.  **Google 搜索:**  使用 `/search @Bot名称 关键词` 命令进行 Google 搜索。

**示例:**

*   `@YourBotName Sing-box 怎么配置 Shadowsocks 节点？`
*   `[发送一张 GUI.for.SingBox 截图] @YourBotName  这个设置有问题吗？`
*   `回复 "Sing-box 怎么添加订阅？" 并 @YourBotName  我还是不太明白，可以更详细一点吗？`
*   `/search @YourBotName 最新 Sing-box 教程`

**⚠️  重要提示:**

*   机器人回复的信息基于 Gemini API 生成，仅供参考。对于 Sing-box 配置等重要操作，请务必仔细验证，并参考官方文档。
*   Google 搜索功能由 Gemini API 提供，搜索结果可能存在偏差或不准确性，请自行判断信息真伪。

## 📜 其他说明

*   **成本:**  本项目基于 Cloudflare Workers 和 Gemini API 构建，可能产生一定的 Cloudflare Workers 免费套餐外费用和 Gemini API 调用费用。请根据实际使用情况关注费用情况。
*   **速率限制:**  为防止滥用，本项目设置了群组冷却和 Google 搜索冷却机制。如遇请求频率限制，请稍后重试。
*   **免责声明:**  本项目代码及相关资源仅供学习和交流使用，不对使用本项目造成的任何损失承担责任。

---

**感谢您的使用！如有任何问题或建议，欢迎提出 Issue 或 Pull Request。**

**Let's build a smarter Telegram Bot together!** 🚀
