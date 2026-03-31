---
title: AgentLoop 详解
description: 逐行解析 Agent 循环的 Java 实现
---

# AgentLoop 详解

`AgentLoop.java` 是整个项目最核心的类。本章将逐行解析它的实现。

## 源文件

📄 `claude-code-java/src/main/java/com/claudecode/core/AgentLoop.java`（约 295 行）

## 类结构概览

```java
public class AgentLoop {
    // 常量
    private static final int MAX_TURNS = 50;

    // 依赖（构造函数注入）
    private final ClaudeApiClient apiClient;
    private final ToolRegistry toolRegistry;
    private final PermissionManager permissionManager;

    // 内部状态
    private final ConversationHistory history;
    private final ContextManager contextManager;

    // 配置
    private final String systemPrompt;
    private final String model;

    // 输出
    private final TerminalRenderer renderer;
    private final Consumer<String> outputCallback;

    // 四个核心方法
    public String run(String userInput);          // 循环入口
    private ApiRequest buildRequest();             // 请求组装
    private List<ToolResultBlock> executeTools();   // 工具执行
    private boolean checkPermission();             // 权限检查
}
```

## 方法一：run() — 循环入口

这是外部调用的唯一入口，驱动整个 Agent Loop。

```java
public String run(String userInput) throws Exception {
    // 1. 用户输入加入历史
    history.addUserMessage(userInput);

    int turns = 0;
    while (turns < MAX_TURNS) {
        // 2. 上下文窗口检查
        if (contextManager.isNearLimit(history)) {
            contextManager.compact(history);
        }

        // 3. 构建请求并调用 API
        ApiRequest request = buildRequest();
        ApiResponse response = apiClient.sendMessageStream(request, outputCallback);

        // 4. 响应加入历史
        history.addAssistantMessage(response.toMessage());

        // 5. 根据 stop_reason 决策
        String stopReason = response.getStopReason();

        if ("end_turn".equals(stopReason) || "stop_sequence".equals(stopReason)) {
            return response.getTextContent();  // ← 任务完成，退出
        }
        if ("max_tokens".equals(stopReason)) {
            return response.getTextContent() + "\n[Warning] Response was truncated.";
        }
        if (!"tool_use".equals(stopReason)) {
            return response.getTextContent();  // ← 未知 stop_reason，安全退出
        }

        // 6. 提取并执行工具调用
        List<ToolUseBlock> toolUses = /* 从响应中提取 */;
        List<ToolResultBlock> results = executeTools(toolUses);

        // 7. 工具结果加入历史（作为 user 消息）
        history.addToolResults(results);

        turns++;
    }

    return "[Agent loop stopped] Reached maximum turns.";
}
```

### 关键观察

**消息流转模式**：
```
history: [user] → API → [assistant(tool_use)] → [user(tool_result)] → API → [assistant(text)] → end
```

每次调用 API 后，响应作为 `assistant` 消息加入历史。如果需要执行工具，工具结果作为 `user` 消息加入。这保证了 **user/assistant 严格交替**。

**未知 stop_reason 的处理**：
```java
if (!"tool_use".equals(stopReason)) {
    return response.getTextContent();  // 安全退出
}
```

如果 API 未来新增了 stop_reason 类型，代码不会崩溃 —— 它会安全返回已有的文本内容。这是**防御式编程**。

## 方法二：buildRequest() — 请求组装

```java
private ApiRequest buildRequest() {
    return ApiRequest.builder()
        .model(model)
        .system(systemPrompt)
        .tools(toolRegistry.getAllDefinitions())       // 所有工具的定义
        .messages(new ArrayList<>(history.getMessages())) // 历史副本
        .build();
}
```

::: warning 为什么要 `new ArrayList<>(history.getMessages())`？
`history.getMessages()` 返回的是不可变视图（`Collections.unmodifiableList`）。`ApiRequest.Builder` 内部可能会修改列表，所以需要**创建副本**，避免影响原始数据。
:::

## 方法三：executeTools() — 工具执行

```java
private List<ToolResultBlock> executeTools(List<ToolUseBlock> toolUses) {
    List<ToolResultBlock> results = new ArrayList<>();

    for (ToolUseBlock toolUse : toolUses) {
        String toolName = toolUse.getName();

        // 1. 渲染工具调用信息（让用户看到 Claude 在调用什么工具）
        renderer.renderToolCall(toolName, toolUse.getInput());

        // 2. 权限检查
        if (!checkPermission(toolUse)) {
            // 权限被拒 → 返回 error 给 Claude
            ToolResult denied = ToolResult.error("Permission denied by user");
            renderer.renderToolResult(toolName, denied);
            results.add(new ToolResultBlock(toolUse.getId(), denied.getContent(), true));
            continue;
        }

        // 3. 执行工具
        ToolResult result = toolRegistry.execute(toolName, toolUse.getInput());

        // 4. 渲染执行结果
        renderer.renderToolResult(toolName, result);

        // 5. 收集结果
        results.add(ToolResultBlock.from(toolUse.getId(), result));
    }

    return results;
}
```

### 关键设计

**权限拒绝不是异常**：当用户拒绝权限时，不会抛异常中断循环，而是返回 error 类型的 ToolResult。Claude 收到后会理解"这个操作被拒绝了"，并调整策略。

**tool_use_id 配对**：每个 `ToolResultBlock` 通过 `toolUse.getId()` 与对应的 `ToolUseBlock` 精确匹配。Claude 据此知道哪个结果对应哪个调用。

## 方法四：checkPermission() — 权限检查

```java
private boolean checkPermission(ToolUseBlock toolUse) {
    Tool tool = toolRegistry.getTool(toolUse.getName());
    boolean requiresPermission = tool != null && tool.requiresPermission();

    PermissionResult result = permissionManager.evaluate(
        toolUse.getName(), toolUse.getInput(), requiresPermission);

    switch (result) {
        case ALLOW: return true;
        case DENY:  return false;
        case ASK:   return permissionManager.promptUser(toolUse.getName(), toolUse.getInput());
        default:    return false;
    }
}
```

注意 **AgentLoop 不自己实现权限逻辑**，而是委托给 `PermissionManager`。这体现了**单一职责原则**：AgentLoop 负责循环调度，权限评估交给专门的组件。

## 构造函数：依赖注入

```java
public AgentLoop(ClaudeApiClient apiClient,
                 ToolRegistry toolRegistry,
                 PermissionManager permissionManager,
                 String systemPrompt) {
    this(apiClient, toolRegistry, permissionManager, systemPrompt,
         new TerminalRenderer(), System.out::print);
}
```

提供了两个构造函数：
- **简化版**：使用默认的渲染器和输出（生产环境）
- **完整版**：可注入自定义渲染器和回调（测试环境）

## 思考题

1. 如果 Claude 在一轮响应中同时返回了 2 个 tool_use（比如先 Glob 再 Read），当前代码会怎么处理？
2. `buildRequest()` 中为什么用 `new ArrayList<>()` 创建副本而不是直接传引用？
3. 如果要实现工具的并行执行（多个 tool_use 同时执行），你会怎么修改 `executeTools()`？

## 下一步

AgentLoop 调用 API 时，底层是 [ClaudeApiClient](/core-code/api-client) 在工作。
