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
  - icon: "🔄"
    title: Agent Loop 核心循环
    details: 理解 "思考-行动" 循环如何驱动 AI 自主完成复杂任务，掌握 Agent 架构的核心设计模式
  - icon: "🛠️"
    title: 工具系统
    details: 7 大内置工具 — Read / Bash / Edit / Write / Glob / Grep / Skill，面向接口的可扩展架构
  - icon: "📜"
    title: Skill 系统
    details: 结构化提示词注入机制，支持 Inline 和 Fork 两种执行模式，让 LLM 按「工作手册」执行任务
  - icon: "🌊"
    title: SSE 流式通信
    details: 基于 OkHttp EventSource 的实时流式 API 调用，StreamAssembler 状态机逐事件组装完整响应
  - icon: "🔌"
    title: MCP 协议集成
    details: 通过 Model Context Protocol 即插即用接入外部工具服务器，适配器模式对 AgentLoop 完全透明
  - icon: "🔐"
    title: 权限管理
    details: Human-in-the-loop 权限审批机制，deny / allow / ask 三级权限评估，保障用户系统安全
  - icon: "💬"
    title: 多轮对话
    details: ConversationHistory 严格交替消息管理，ContextManager 智能上下文窗口压缩
  - icon: "💻"
    title: 终端交互
    details: JLine3 驱动的 REPL 交互界面，ANSI 颜色渲染，命令历史持久化
---

<GitHubStar />

<!-- 项目核心数字 -->
<div class="home-section">
  <div class="home-section-header">
    <div class="home-section-badge">PROJECT OVERVIEW</div>
    <h2 class="home-section-title">项目核心数字</h2>
    <p class="home-section-subtitle">一个「麻雀虽小，五脏俱全」的完整 AI Agent 实现</p>
  </div>
  <StatsCounter />
</div>

<div class="home-divider"><hr /></div>

<!-- Agent Loop 演示 -->
<div class="home-section">
  <div class="home-section-header">
    <div class="home-section-badge">LIVE DEMO</div>
    <h2 class="home-section-title">Agent Loop 如何工作？</h2>
    <p class="home-section-subtitle">Claude 不是一次性给出答案，而是像人一样「思考 → 行动 → 观察 → 再思考」</p>
  </div>
  <TerminalDemo />
</div>

<div class="home-divider"><hr /></div>

<!-- 模块架构图 -->
<div class="home-section">
  <div class="home-section-header">
    <div class="home-section-badge">ARCHITECTURE</div>
    <h2 class="home-section-title">八大模块，各司其职</h2>
    <p class="home-section-subtitle">单向依赖、零循环 — 清晰的模块化架构设计</p>
  </div>
  <ArchitectureGraph />
</div>

<div class="home-divider"><hr /></div>

<!-- 你将学到什么 -->
<div class="home-section">
  <div class="home-section-header">
    <div class="home-section-badge">WHAT YOU'LL LEARN</div>
    <h2 class="home-section-title">这个项目能教会你什么？</h2>
  </div>

<table class="skills-table">
<thead>
<tr><th>技能领域</th><th>你将学到的内容</th></tr>
</thead>
<tbody>
<tr><td><strong>AI Agent 架构</strong></td><td>Agent Loop 模式、工具调用协议、stop_reason 驱动的循环控制、Fork 子 Agent</td></tr>
<tr><td><strong>API 集成</strong></td><td>Claude Messages API、SSE 流式协议、HTTP 重试与错误处理</td></tr>
<tr><td><strong>设计模式</strong></td><td>接口抽象、注册表模式、Builder 模式、依赖注入、策略模式、适配器模式</td></tr>
<tr><td><strong>Skill 系统</strong></td><td>结构化提示词注入、YAML frontmatter 解析、Inline/Fork 双模式执行</td></tr>
<tr><td><strong>MCP 协议</strong></td><td>JSON-RPC 2.0 通信、子进程管理、外部工具服务器集成</td></tr>
<tr><td><strong>系统编程</strong></td><td>进程管理、文件 I/O、终端交互、并发同步（CountDownLatch）</td></tr>
<tr><td><strong>安全设计</strong></td><td>最小权限原则、Human-in-the-loop、通配符规则匹配</td></tr>
</tbody>
</table>

</div>

<div class="home-divider"><hr /></div>

<!-- 学习路径 -->
<div class="home-section">
  <div class="home-section-header">
    <div class="home-section-badge">LEARNING PATH</div>
    <h2 class="home-section-title">六阶段学习路径</h2>
    <p class="home-section-subtitle">从全景认知到动手实战，循序渐进掌握 AI Agent 全栈</p>
  </div>
  <LearningTimeline />
</div>

::: tip 前置知识
本文档假设你具备 **Java 基础**（类、接口、集合框架、Maven），了解 **HTTP 基本概念**。不需要有 AI 或 LLM 的使用经验。
:::
