---
layout: home

hero:
  name: "Claude Code Java"
  text: "用 Java 从零实现 Claude Code"
  tagline: 深入理解 AI Agent 架构的学习型开源项目
  actions:
    - theme: brand
      text: 开始学习
      link: /guide/introduction
    - theme: alt
      text: 快速开始
      link: /guide/quick-start
    - theme: alt
      text: GitHub
      link: https://github.com/schhaohao/OwnCode

features:
  - icon: "\U0001F504"
    title: Agent Loop 核心循环
    details: 理解 "思考-行动" 循环如何驱动 AI 自主完成复杂任务，掌握 Agent 架构的核心设计模式
  - icon: "\U0001F6E0\uFE0F"
    title: 工具系统
    details: 6 大内置工具的设计与实现 — Read / Bash / Edit / Write / Glob / Grep，面向接口的可扩展架构
  - icon: "\U0001F30A"
    title: SSE 流式通信
    details: 基于 OkHttp EventSource 的实时流式 API 调用，StreamAssembler 状态机逐事件组装完整响应
  - icon: "\U0001F512"
    title: 权限管理
    details: Human-in-the-loop 权限审批机制，deny / allow / ask 三级权限评估，保障用户系统安全
  - icon: "\U0001F4AC"
    title: 多轮对话
    details: ConversationHistory 严格交替消息管理，ContextManager 智能上下文窗口压缩
  - icon: "\U0001F4BB"
    title: 终端交互
    details: JLine3 驱动的 REPL 交互界面，ANSI 颜色渲染，命令历史持久化
---

<GitHubStar />

## 这个项目能教会你什么？

**claude-code-java** 是一个完整的 Java 项目，用约 **28 个 Java 文件**实现了一个功能完备的 AI 编程助手 CLI 工具。通过学习这个项目，你将掌握：

| 技能领域 | 你将学到的内容 |
|---------|-------------|
| **AI Agent 架构** | Agent Loop 模式、工具调用协议、stop_reason 驱动的循环控制 |
| **API 集成** | Claude Messages API、SSE 流式协议、HTTP 重试与错误处理 |
| **设计模式** | 接口抽象、注册表模式、Builder 模式、依赖注入、策略模式 |
| **系统编程** | 进程管理、文件 I/O、终端交互、并发同步（CountDownLatch） |
| **安全设计** | 最小权限原则、Human-in-the-loop、通配符规则匹配 |

## 学习路径

```
阶段一：全景认知          →  了解项目是什么、整体怎么运转
阶段二：核心引擎          →  深入 Agent Loop、API 通信、流式处理
阶段三：工具系统          →  理解工具抽象设计，学会阅读和扩展
阶段四：安全与状态管理    →  权限管理、对话历史、上下文窗口
阶段五：界面与实战        →  CLI 实现，动手扩展项目
```

::: tip 前置知识
本文档假设你具备 **Java 基础**（类、接口、集合框架、Maven），了解 **HTTP 基本概念**。不需要有 AI 或 LLM 的使用经验。
:::
