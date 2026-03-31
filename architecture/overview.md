---
title: 整体架构
description: 从全局视角理解 claude-code-java 的架构设计
---

# 整体架构

## 架构总览

claude-code-java 采用**分层架构**，从上到下分为四层：

```mermaid
graph TB
    subgraph UI["用户界面层 (cli/)"]
        Repl["Repl — REPL 循环"]
        TR["TerminalRenderer — 终端渲染"]
    end

    subgraph Engine["核心引擎层 (core/)"]
        AL["AgentLoop — Agent 循环 ⭐"]
        CH["ConversationHistory"]
        CM["ContextManager"]
    end

    subgraph Infra["基础设施层"]
        direction LR
        API["ClaudeApiClient<br/>+ StreamAssembler"]
        Tools["ToolRegistry<br/>+ 6个Tool实现"]
        Perm["PermissionManager<br/>+ PermissionRule"]
    end

    subgraph External["外部系统"]
        Claude["Claude API"]
        FS["文件系统"]
        Shell["Shell / 进程"]
    end

    Repl --> AL
    AL --> CH
    AL --> CM
    AL --> API
    AL --> Tools
    AL --> Perm
    API --> Claude
    Tools --> FS
    Tools --> Shell
```

## 核心数据流

一次完整的用户交互，数据流经所有模块：

```mermaid
sequenceDiagram
    participant U as 用户
    participant R as Repl
    participant AL as AgentLoop
    participant API as ClaudeApiClient
    participant SA as StreamAssembler
    participant Claude as Claude API
    participant TR as ToolRegistry
    participant PM as PermissionManager

    U->>R: 输入 "帮我读取 pom.xml"
    R->>AL: run("帮我读取 pom.xml")
    AL->>AL: history.addUserMessage()
    AL->>API: sendMessageStream(request)
    API->>Claude: POST /v1/messages (SSE)

    loop SSE 事件流
        Claude-->>SA: text_delta: "好的，"
        SA-->>U: 实时输出 "好的，"
        Claude-->>SA: text_delta: "让我读取..."
        SA-->>U: 实时输出 "让我读取..."
        Claude-->>SA: tool_use: Read(pom.xml)
        Claude-->>SA: message_delta: stop_reason=tool_use
    end

    SA-->>AL: 返回完整 ApiResponse
    AL->>AL: 检查 stop_reason = "tool_use"
    AL->>PM: evaluate("Read", input)
    PM-->>AL: ALLOW (只读工具)
    AL->>TR: execute("Read", {file_path: "pom.xml"})
    TR-->>AL: ToolResult(文件内容)
    AL->>AL: history.addToolResults()

    Note over AL: 继续循环 → 再次调用 API
    AL->>API: sendMessageStream(含工具结果的请求)
    API->>Claude: POST /v1/messages
    Claude-->>SA: text_delta: "pom.xml 包含以下依赖..."
    SA-->>U: 实时输出总结文本
    Claude-->>SA: message_delta: stop_reason=end_turn
    SA-->>AL: 返回 ApiResponse
    AL-->>R: 返回最终文本
```

## 两种核心场景

### 场景 A：简单问答（无工具调用）

```
用户: "Java 的 final 关键字有什么用？"
  → AgentLoop 调用 API
  → Claude 直接返回文本回答
  → stop_reason = "end_turn"
  → 循环结束，返回文本
```

只经历 **1 轮循环**。

### 场景 B：工具调用（多轮循环）

```
用户: "查看 src 目录结构并读取 pom.xml"
  → 第 1 轮: Claude 返回 tool_use(Glob) → 执行 Glob → 结果回传
  → 第 2 轮: Claude 返回 tool_use(Read) → 执行 Read → 结果回传
  → 第 3 轮: Claude 返回文本总结 → stop_reason = "end_turn"
  → 循环结束
```

经历 **3 轮循环**，Claude 自主决定何时使用什么工具。

## 关键设计决策

### 1. 依赖注入 vs 内部创建

```java
// ✅ 实际采用：构造函数注入
public AgentLoop(ClaudeApiClient apiClient,
                 ToolRegistry toolRegistry,
                 PermissionManager permissionManager, ...) {
    this.apiClient = apiClient;
    this.toolRegistry = toolRegistry;
    // ...
}
```

组件通过构造函数注入，而不是在内部 new 出来。这使得：
- 各模块可以独立测试（传入 mock 对象）
- 配置灵活（不同场景可以传入不同实现）
- 依赖关系显式可见

### 2. 回调驱动的实时输出

```java
// AgentLoop 的 outputCallback
Consumer<String> outputCallback = System.out::print;

// 传递给 API 客户端
apiClient.sendMessageStream(request, outputCallback);
```

文本通过回调函数实时输出到终端，而不是等 API 调用完成后才显示。这样用户可以看到 "打字机效果"。

### 3. 安全优先的工具执行

每次工具调用前都要经过权限检查：

```
工具调用请求 → PermissionManager.evaluate()
  → ALLOW → 直接执行
  → DENY  → 返回拒绝信息给 Claude
  → ASK   → 弹出终端提示，等用户确认
```

只读工具（Read、Glob、Grep）自动放行，写入工具（Bash、Edit、Write）需要用户审批。

### 4. 错误不扩散

```java
// ToolRegistry.execute() 的双重安全
public ToolResult execute(String toolName, Map<String, Object> input) {
    Tool tool = tools.get(toolName);
    if (tool == null) {
        return ToolResult.error("Unknown tool: " + toolName);  // 安全 1
    }
    try {
        return tool.execute(input);
    } catch (Exception e) {
        return ToolResult.error("Tool threw exception: " + e.getMessage());  // 安全 2
    }
}
```

工具执行的异常被捕获并转为 error 结果反馈给 Claude，而不是让异常传播到 AgentLoop。这保证了单个工具的失败不会导致整个系统崩溃。

## 下一步

接下来让我们深入 [Agent Loop 核心循环](/architecture/agent-loop) —— 整个系统最核心的设计。
