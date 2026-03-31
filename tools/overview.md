---
title: 工具机制概述
description: Tool 接口与 ToolRegistry — 可扩展的工具系统设计
---

# 工具机制概述

工具系统是 claude-code-java 的核心扩展点。LLM 本身只能生成文本，工具赋予了它与外部世界交互的能力。

## 为什么需要工具？

Claude 不能直接读文件、执行命令。它只能生成文本。那怎么让它 "读文件" 呢？

答案是 **工具协议**：

1. 我们在 API 请求中告诉 Claude："你有这些工具可以用"（`tools` 字段）
2. Claude 想用工具时，在回复中说："我想调用 Read 工具，参数是 `{file_path: '/pom.xml'}`"（`ToolUseBlock`）
3. 我们的代码负责**实际执行**，并把结果反馈给 Claude（`ToolResultBlock`）
4. Claude 基于工具结果继续思考

## Tool 接口 — 统一契约

📄 `claude-code-java/src/main/java/com/claudecode/tool/Tool.java`

所有工具都实现同一个接口：

```java
public interface Tool {
    String name();                              // 工具名称（LLM 用它引用工具）
    String description();                       // 工具描述（LLM 据此决定何时使用）
    Map<String, Object> inputSchema();          // 参数定义（JSON Schema 格式）
    boolean requiresPermission();               // 是否需要用户审批
    ToolResult execute(Map<String, Object> input); // 执行核心逻辑
}
```

### 五个方法的职责

| 方法 | 给谁看 | 用途 |
|------|--------|------|
| `name()` | LLM + 代码 | 唯一标识，LLM 在 tool_use 中引用 |
| `description()` | LLM | LLM 的"使用说明书"，决定何时选择该工具 |
| `inputSchema()` | LLM | 参数格式定义，LLM 据此生成合法参数 |
| `requiresPermission()` | 权限管理器 | 安全标记：只读(false) vs 写入(true) |
| `execute()` | 运行时 | 实际执行逻辑，返回结果 |

### description 的重要性

`description()` 直接影响 LLM 的工具选择行为。写得好，LLM 用得准；写得差，LLM 可能误用或不用。

::: tip 好的 description 应该包含
- **功能**：这个工具做什么
- **场景**：什么时候该用它
- **限制**：什么时候不该用它
- **参数说明**：关键参数的含义
:::

```java
// ✅ 好的 description
"Executes a given bash command and returns its output. "
+ "Use this for running system commands, scripts, builds, tests. "
+ "Avoid using this for tasks that have dedicated tools "
+ "(e.g., use Read instead of cat, use Grep instead of grep)."

// ❌ 差的 description
"Runs a command."
```

### inputSchema — JSON Schema 格式

```java
// 构建方式：用 LinkedHashMap 手动拼装
Map<String, Object> schema = new LinkedHashMap<>();
schema.put("type", "object");
schema.put("properties", Map.of(
    "file_path", Map.of("type", "string", "description", "文件绝对路径"),
    "limit", Map.of("type", "integer", "description", "最多读取行数")
));
schema.put("required", List.of("file_path"));
```

序列化后发送给 Claude API：
```json
{
  "type": "object",
  "properties": {
    "file_path": { "type": "string", "description": "文件绝对路径" },
    "limit": { "type": "integer", "description": "最多读取行数" }
  },
  "required": ["file_path"]
}
```

## ToolRegistry — 注册中心

📄 `claude-code-java/src/main/java/com/claudecode/tool/ToolRegistry.java`

### 核心职责

ToolRegistry 是工具的**集中管理者**，提供注册、查找、执行的统一入口。AgentLoop 不直接持有工具实例。

```java
public class ToolRegistry {
    private final Map<String, Tool> tools = new LinkedHashMap<>();

    public void register(Tool tool);              // 注册（重名则抛异常）
    public Tool getTool(String name);              // 按名查找
    public ToolResult execute(String name, Map input); // 查找 + 执行
    public List<ToolDefinition> getAllDefinitions(); // 获取所有工具定义
    public void registerBuiltinTools();            // 注册内置工具
}
```

### 双重安全保护

```java
public ToolResult execute(String toolName, Map<String, Object> input) {
    Tool tool = tools.get(toolName);
    if (tool == null) {
        return ToolResult.error("Unknown tool: " + toolName);  // 安全 1: 工具不存在
    }
    try {
        return tool.execute(input);
    } catch (Exception e) {
        return ToolResult.error("Tool threw exception: " + e.getMessage()); // 安全 2: 执行异常
    }
}
```

两种错误都不会抛异常，而是返回 error 类型的 ToolResult。Claude 收到后会理解"操作失败了"，并调整策略。

### 注册内置工具

```java
public void registerBuiltinTools() {
    registerIfReady(new ReadFileTool());
    registerIfReady(new BashTool(workingDirectory));
    registerIfReady(new EditFileTool());
    registerIfReady(new WriteFileTool());
    registerIfReady(new GlobTool());
    registerIfReady(new GrepTool());
}
```

`registerIfReady()` 只注册 `name()` 非空的工具 —— 未完成的 stub 不会被注册。

## 工具实现的通用四步模式

所有 6 个内置工具都遵循相同的 `execute()` 实现模式：

```
第 1 步：提取参数（从 Map 中获取，处理类型转换）
第 2 步：参数校验（必填检查、值域检查）
第 3 步：核心执行（文件 IO、进程调用等）
第 4 步：结果封装（ToolResult.success() 或 ToolResult.error()）
```

```java
// 典型的 execute() 骨架
public ToolResult execute(Map<String, Object> input) {
    // 1. 提取参数
    String filePath = (String) input.get("file_path");

    // 2. 参数校验
    if (filePath == null || filePath.isBlank()) {
        return ToolResult.error("Parameter 'file_path' is required");
    }

    // 3. 核心执行
    try {
        String content = Files.readString(Path.of(filePath));
        // 4. 成功返回
        return ToolResult.success(content);
    } catch (Exception e) {
        // 4. 失败返回
        return ToolResult.error("Failed: " + e.getMessage());
    }
}
```

## 6 个内置工具速览

| 工具 | 名称 | 功能 | 权限 |
|------|------|------|------|
| [BashTool](/tools/bash) | `Bash` | 执行 Shell 命令 | 需要审批 |
| [ReadFileTool](/tools/read-file) | `Read` | 读取文件内容 | 自动放行 |
| [EditFileTool](/tools/edit-file) | `Edit` | 精确字符串替换 | 需要审批 |
| [WriteFileTool](/tools/write-file) | `Write` | 创建/覆写文件 | 需要审批 |
| [GlobTool](/tools/glob) | `Glob` | 文件名模式搜索 | 自动放行 |
| [GrepTool](/tools/grep) | `Grep` | 文件内容正则搜索 | 自动放行 |

## 如何添加新工具？

添加新工具只需 3 步：

**第 1 步：实现 Tool 接口**
```java
public class HttpTool implements Tool {
    public String name() { return "Http"; }
    public String description() { return "发送 HTTP 请求..."; }
    public Map<String, Object> inputSchema() { ... }
    public boolean requiresPermission() { return true; }
    public ToolResult execute(Map<String, Object> input) { ... }
}
```

**第 2 步：在 ToolRegistry 中注册**
```java
public void registerBuiltinTools() {
    // ... 现有工具 ...
    registerIfReady(new HttpTool());  // 加这一行
}
```

**第 3 步：完成！** 不需要修改 AgentLoop 的任何代码。

这就是 **"面向接口编程"** 的威力 —— `AgentLoop` 只依赖 `Tool` 接口，不关心具体有哪些工具。

## 思考题

1. 如果 LLM 传入了一个不存在的工具名，完整追踪从 AgentLoop 到 ToolResult 的链路
2. `Tool.description()` 对 LLM 的行为有多大影响？如果设为空字符串会怎样？
3. 设计一个 `HttpTool`，定义它的 `name()`、`description()`、`inputSchema()` 和 `requiresPermission()`

## 下一步

接下来逐一了解每个内置工具的实现，从最复杂的 [BashTool](/tools/bash) 开始。
