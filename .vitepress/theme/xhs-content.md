---
emoji: "🔥"
title: "28个Java文件"
subtitle: "从零造一个Claude Code"
---

# 最近 Claude Code 太火了

但你有没有想过——它到底是怎么工作的？

我用 **Java 从零复刻**了一个 Claude Code CLI，只用了 28 个文件，把 AI Agent 的核心架构**拆得明明白白**。

---

# 🧠 核心架构：Agent Loop

完整实现了 Agent Loop 核心循环：

**思考 → 工具调用 → 反馈**

这是所有 AI Agent 的灵魂。Claude Code、Cursor、Windsurf 背后都是这套模式。

看懂这个循环，你就理解了 90% 的 AI Agent。

---

# 🛠️ 6 大内置工具系统

和 Claude Code 官方一致的工具链：

- **Bash** — Shell 命令执行
- **Read** — 文件读取
- **Edit** — 精确字符串替换
- **Write** — 文件创建/覆写
- **Glob** — 文件名模式搜索
- **Grep** — 内容正则搜索

面向接口设计，3 步即可扩展新工具。

---

# 🔌 MCP 协议：即插即用

支持 Model Context Protocol：

一个 `settings.json` 配置文件，就能接入外部工具服务器。

查文档、操作数据库、管理 GitHub……不用改代码，配置即生效。

这就是 **"AI 世界的 USB 接口"**。

---

# 📚 配套完整学习文档

不只是代码，还有一整套 **VitePress 文档站**：

- 架构设计图解（Mermaid 流程图）
- 核心代码逐行讲解
- 每章都有思考题

从入门到精通，一站式搞定。

---

# 📦 技术栈 & 资源

**Java 11 + OkHttp + Jackson + JLine3**

没有复杂框架，纯手工打造，代码量适中。

🔗 **文档站**：schhaohao.github.io/docs/

🔗 **GitHub**：github.com/schhaohao/OwnCode

**觉得有用，求个 ⭐ Star 支持！**
