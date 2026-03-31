# Claude Code Java 学习文档

> 用 Java 从零实现 Claude Code — 面向初学者的深度学习文档

本站基于 [VitePress](https://vitepress.dev/) 构建，系统讲解 [claude-code-java](https://github.com/your-username/claude-code-java) 项目的架构设计与核心代码实现。

## 内容概览

- **入门指南** — 项目简介、快速开始、项目结构
- **架构设计** — 整体架构、Agent Loop 核心循环、API 通信层、权限管理
- **核心代码讲解** — 启动入口、AgentLoop、API Client、SSE 流式组装、对话历史与上下文、终端 REPL
- **工具系统** — 工具机制概述及 6 大内置工具（Bash / Read / Edit / Write / Glob / Grep）详解

## 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run docs:dev

# 构建静态站点
npm run docs:build

# 预览构建产物
npm run docs:preview
```

## 技术栈

- [VitePress](https://vitepress.dev/) — 静态站点生成
- [Mermaid](https://mermaid.js.org/) — 架构图与流程图渲染

## License

MIT
