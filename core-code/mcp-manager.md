---
title: McpManager 与 McpToolAdapter
description: MCP 集成层 — 子系统编排与远程工具适配
---

# McpManager 与 McpToolAdapter

这两个类构成了 MCP 集成的**最上层**——McpManager 负责编排整个 MCP 子系统的生命周期，McpToolAdapter 负责将远程工具"伪装"成本地工具。

## McpManager — MCP 子系统的总指挥

📄 `claude-code-java/src/main/java/com/claudecode/mcp/McpManager.java`

### 核心职责

McpManager 是 MCP 子系统的入口，负责三件事：

1. **连接**：为每个配置的 MCP Server 创建 Transport 和 Client
2. **发现**：通过 `tools/list` 获取每个 Server 暴露的工具
3. **注册**：为每个工具创建 McpToolAdapter 并注册到 ToolRegistry

### 类结构

```java
public class McpManager implements Closeable {
    private final ObjectMapper mapper;
    private final Map<String, McpClient> clients = new LinkedHashMap<>();

    // 入口方法：初始化所有 MCP Server 并注册工具
    public void initializeAndRegister(Map<String, McpServerConfig> configs, 
                                       ToolRegistry registry);

    // 资源清理：关闭所有 Client（销毁子进程）
    public void close() throws IOException;
}
```

### initializeAndRegister — 启动流程

这是整个 MCP 子系统的启动入口，在 `ClaudeCode.main()` 中被调用：

```java
public void initializeAndRegister(Map<String, McpServerConfig> configs, 
                                   ToolRegistry registry) {
    if (configs == null || configs.isEmpty()) {
        return;  // 没配置 MCP Server，直接返回
    }

    for (Map.Entry<String, McpServerConfig> entry : configs.entrySet()) {
        String serverName = entry.getKey();
        McpServerConfig config = entry.getValue();
        try {
            connectAndRegister(serverName, config, registry);
        } catch (Exception e) {
            // ⚡ 单个 Server 失败不影响其他 Server
            System.err.println("[MCP] Failed to connect to server '" 
                               + serverName + "': " + e.getMessage());
        }
    }
}
```

**容错设计**：每个 Server 的连接都在独立的 try-catch 中。如果配置了 3 个 Server，其中 1 个的 `command` 写错了，另外 2 个照常连接并注册工具。

### connectAndRegister — 单个 Server 的连接流程

```java
private void connectAndRegister(String serverName, McpServerConfig config,
                                ToolRegistry registry) throws IOException {
    // 1. 创建 Transport（启动子进程的准备）
    StdioTransport transport = new StdioTransport(
            serverName, config.getCommand(), config.getArgs(), 
            config.getEnv(), mapper);

    // 2. 创建 Client 并握手
    McpClient client = new McpClient(serverName, transport, mapper);
    client.initialize();       // 启动子进程 + initialize 握手
    clients.put(serverName, client);  // 记录连接

    // 3. 发现工具
    List<McpToolDefinition> tools = client.listTools();

    // 4. 为每个工具创建适配器并注册
    for (McpToolDefinition toolDef : tools) {
        McpToolAdapter adapter = new McpToolAdapter(
                serverName,
                toolDef.getName(),
                toolDef.getDescription(),
                toolDef.getInputSchema(),
                client);
        try {
            registry.register(adapter);
        } catch (IllegalArgumentException e) {
            // 工具名重复，跳过
            System.err.println("[MCP] Skipping duplicate tool: " + adapter.name());
        }
    }
}
```

四步流程，每一步都可能抛异常，整体在上层 catch 处理。

### close — 资源清理

```java
@Override
public void close() throws IOException {
    for (Map.Entry<String, McpClient> entry : clients.entrySet()) {
        try {
            entry.getValue().close();  // 关闭每个 Client（销毁子进程）
        } catch (IOException e) {
            System.err.println("[MCP] Error closing server '" 
                               + entry.getKey() + "': " + e.getMessage());
        }
    }
    clients.clear();
}
```

关闭也是容错的——一个 Client 关闭失败不影响关闭其他 Client。

### 在 ClaudeCode.main() 中的集成点

```java
// ClaudeCode.java 中的 MCP 初始化代码

// 1. 注册内置工具
ToolRegistry toolRegistry = new ToolRegistry(workingDirectory);
toolRegistry.registerBuiltinTools();

// 2. 加载 MCP 配置
ObjectMapper objectMapper = new ObjectMapper();
McpConfigLoader configLoader = new McpConfigLoader(objectMapper);
Map<String, McpServerConfig> mcpConfigs = configLoader.load(workingDirectory);

// 3. 连接 MCP Server 并注册工具
McpManager mcpManager = new McpManager(objectMapper);
if (!mcpConfigs.isEmpty()) {
    mcpManager.initializeAndRegister(mcpConfigs, toolRegistry);
}

// 4. 创建 AgentLoop（此时 ToolRegistry 已包含内置 + MCP 工具）
AgentLoop agentLoop = new AgentLoop(apiClient, toolRegistry, permissionManager, systemPrompt);

// 5. 注册 ShutdownHook 清理 MCP 子进程
Runtime.getRuntime().addShutdownHook(new Thread(() -> {
    try { mcpManager.close(); } catch (IOException ignored) {}
}));
```

这段代码体现了一个重要原则：**MCP 是可选的**。如果 `settings.json` 中没有 `mcpServers` 配置，`mcpConfigs` 为空，MCP 子系统完全不启动，不影响内置工具的正常使用。

---

## McpToolAdapter — 远程工具的本地外衣

📄 `claude-code-java/src/main/java/com/claudecode/mcp/McpToolAdapter.java`

### 设计思路

`McpToolAdapter` 是经典的**适配器模式**：

```
MCP Server 暴露的工具              McpToolAdapter              Tool 接口
┌───────────────────┐          ┌─────────────────┐        ┌──────────┐
│ name: "query-docs"│   wrap   │ Tool 接口实现     │  impl  │ name()   │
│ desc: "..."       │ ───────→ │ execute() 内部    │ ─────→ │ execute()│
│ schema: {...}     │          │ 调 McpClient.    │        │ ...      │
│                   │          │ callTool()       │        │          │
└───────────────────┘          └─────────────────┘        └──────────┘
```

### 命名规范

```java
private static final String SEPARATOR = "__";
private static final String PREFIX = "mcp";

// 构造函数中：
this.qualifiedName = PREFIX + SEPARATOR + serverName + SEPARATOR + originalToolName;
// 例如：mcp__context7__query-docs
```

这个命名格式与 Claude Code 官方保持一致。三段式命名确保：
- `mcp__` 前缀不会和内置工具（`Bash`、`Read` 等）冲突
- `serverName` 区分不同 Server 的同名工具

### Tool 接口的五个方法实现

```java
@Override
public String name() {
    return qualifiedName;  // "mcp__context7__query-docs"
}

@Override
public String description() {
    return description;  // 直接透传 MCP Server 提供的描述
}

@Override
public Map<String, Object> inputSchema() {
    return inputSchema;  // 直接透传 MCP Server 提供的 JSON Schema
}

@Override
public boolean requiresPermission() {
    return true;  // 外部工具一律需要用户确认
}
```

前四个方法都是简单的属性返回。关键在第五个：

### execute — 核心桥接逻辑

```java
@Override
public ToolResult execute(Map<String, Object> input) {
    try {
        // 通过 McpClient 发送 JSON-RPC tools/call 请求
        McpToolCallResult result = mcpClient.callTool(originalToolName, input);

        // 转换结果类型
        return result.isError()
                ? ToolResult.error(result.getText())
                : ToolResult.success(result.getText());
    } catch (Exception e) {
        return ToolResult.error("MCP tool '" + qualifiedName + "' failed: " + e.getMessage());
    }
}
```

这个方法做了三件事：

1. **委托调用**：把 `input` 参数原封不动传给 `McpClient.callTool()`
2. **结果转换**：把 `McpToolCallResult` 转为 `ToolResult`（两个不同的类型体系）
3. **异常兜底**：网络超时、子进程崩溃等异常都被 catch 并转为 error 结果

注意这里用的是 `originalToolName`（如 `query-docs`）而不是 `qualifiedName`（如 `mcp__context7__query-docs`）。MCP Server 只认识自己原始的工具名。

### 数据流全景

```
LLM 返回: tool_use { name: "mcp__context7__query-docs", input: {...} }
    ↓
AgentLoop → ToolRegistry.execute("mcp__context7__query-docs", input)
    ↓
ToolRegistry → McpToolAdapter.execute(input)    ← 查到适配器
    ↓
McpToolAdapter → McpClient.callTool("query-docs", input)    ← 用原始名
    ↓
McpClient → StdioTransport.send(JSON-RPC request)
    ↓
StdioTransport → 子进程 stdin → MCP Server 处理 → stdout → JsonRpcResponse
    ↓
McpClient → parseToolCallResult() → McpToolCallResult
    ↓
McpToolAdapter → ToolResult.success/error(text)
    ↓
ToolRegistry → AgentLoop → 追加到对话历史 → 继续调用 API
```

## 思考题

1. 如果 MCP Server 返回的工具 `description` 写得很差（比如空字符串），对 LLM 选择工具会有什么影响？能否在 `McpToolAdapter` 层面做优化？
2. `McpToolAdapter.execute()` 中为什么要 catch `Exception` 而不是只 catch `IOException`？
3. 如果需要实现 MCP 工具的"只读"判定（某些 MCP 工具不需要权限审批），你会怎么设计 `requiresPermission()` 的逻辑？

## 下一步

接下来了解底层通信的实现：[McpClient 与 StdioTransport](/core-code/mcp-client)。
