---
title: 启动入口 ClaudeCode
description: 程序入口 — 组件初始化与组装
---

# 启动入口 ClaudeCode

`ClaudeCode.java` 是整个应用的启动点，它的职责很简单：**解析参数、初始化组件、启动应用**。

## 源文件

📄 `claude-code-java/src/main/java/com/claudecode/ClaudeCode.java`

## 完整启动流程

```mermaid
graph LR
    A[main] --> B[解析命令行参数]
    B --> C[获取 API Key]
    C --> D[初始化 ClaudeApiClient]
    D --> E[初始化 ToolRegistry]
    E --> F[初始化 PermissionManager]
    F --> G[初始化 AgentLoop]
    G --> H[初始化 Repl]
    H --> I[注入 InputReader]
    I --> J[repl.start]
```

## 代码逐段解读

### 1. 命令行参数解析

```java
String apiKey = null;
String model = DEFAULT_MODEL;  // "claude-sonnet-4-6"

for (int i = 0; i < args.length; i++) {
    switch (args[i]) {
        case "--api-key":
            if (i + 1 < args.length) apiKey = args[++i];
            break;
        case "--model":
            if (i + 1 < args.length) model = args[++i];
            break;
        case "--help":
            printUsage();
            return;
    }
}
```

手动解析 `--api-key` 和 `--model` 两个参数。注意 `args[++i]` —— 先递增索引再取值，跳过参数名取参数值。

### 2. API Key 获取（优先级链）

```java
// 优先级: 命令行参数 > 环境变量
if (apiKey == null || apiKey.isEmpty()) {
    apiKey = System.getenv("ANTHROPIC_API_KEY");
}

if (apiKey == null || apiKey.isEmpty()) {
    System.err.println("Error: API key is required.");
    System.exit(1);
}
```

两级 fallback：先看命令行有没有传，没有就看环境变量。都没有则退出。

### 3. 组件初始化链

```java
// 1. API 客户端
ClaudeApiClient apiClient = new ClaudeApiClient(apiKey, model);

// 2. 工具注册中心 + 注册内置工具
ToolRegistry toolRegistry = new ToolRegistry(workingDirectory);
toolRegistry.registerBuiltinTools();

// 3. 权限管理器
PermissionManager permissionManager = new PermissionManager();

// 4. 核心循环引擎（注入前三个组件）
AgentLoop agentLoop = new AgentLoop(
    apiClient, toolRegistry, permissionManager, SYSTEM_PROMPT);

// 5. 交互式界面
Repl repl = new Repl(agentLoop);
```

注意初始化顺序 —— 每个组件只依赖它之前创建的组件：

```
ApiClient → (独立)
ToolRegistry → (独立)
PermissionManager → (独立)
AgentLoop → 依赖 ApiClient, ToolRegistry, PermissionManager
Repl → 依赖 AgentLoop
```

### 4. InputReader 注入（解决 JLine 冲突）

```java
permissionManager.setInputReader(prompt -> repl.readLine(prompt));
```

::: tip 为什么需要这一步？
JLine3 将终端设为 **raw mode** 来实现行编辑功能。如果 `PermissionManager` 内部使用 `Scanner(System.in)` 读取用户输入，两者会**抢占 System.in**，导致输入混乱。

解决方案：将 `Repl` 的 `readLine()` 方法注入到 `PermissionManager`，让权限审批也通过 JLine 读取输入。
:::

### 5. System Prompt

```java
private static final String SYSTEM_PROMPT =
    "You are an interactive agent that helps users with software engineering tasks. "
    + "You have access to tools for reading files, editing files, executing shell commands, "
    + "searching code, and more. ...";
```

这段文本会随每次 API 请求发送给 Claude，告诉它："你是一个编程助手，你有这些工具可以用"。

## 设计要点

### 组装者模式

`ClaudeCode.main()` 的角色是 **组装者（Assembler）** —— 它知道所有组件，负责创建和连接它们，但自身不包含业务逻辑。

这种模式的好处：
- **单一入口**：所有组件的创建集中在一处
- **依赖可见**：读 `main()` 就知道所有组件的依赖关系
- **易于测试**：测试时可以传入 mock 组件

## 思考题

1. 如果用户既没传 `--api-key` 参数也没设置环境变量，程序会做什么？
2. 为什么 `PermissionManager` 需要注入 `Repl` 的 `readLine` 方法？如果不注入会怎样？
3. 如果要支持从配置文件 `~/.claude-code-java/config.json` 读取默认配置，你会在哪里添加代码？

## 下一步

入口只是起点，真正的核心在 [AgentLoop 详解](/core-code/agent-loop-impl)。
