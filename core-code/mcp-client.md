---
title: McpClient 与 StdioTransport
description: MCP 客户端协议通信 — JSON-RPC 握手、工具发现与子进程 IO
---

# McpClient 与 StdioTransport

这两个类实现了与 MCP Server 的**底层通信**。McpClient 负责 MCP 协议逻辑（握手、发现、调用），StdioTransport 负责字节级的传输（子进程 stdin/stdout + JSON-RPC 消息路由）。

## McpClient — MCP 协议的完整生命周期

📄 `claude-code-java/src/main/java/com/claudecode/mcp/client/McpClient.java`

### MCP 协议流程

一个 MCP Client 与 Server 的交互分为四个阶段：

```
┌─────────┐    initialize     ┌─────────┐
│         │ ───────────────→  │         │
│         │    capabilities   │         │
│ Client  │ ←──────────────── │ Server  │
│         │  notif/initialized│         │
│         │ ───────────────→  │         │
│         │                   │         │
│         │    tools/list     │         │
│         │ ───────────────→  │         │
│         │   tool definitions│         │
│         │ ←──────────────── │         │
│         │                   │         │
│         │    tools/call     │         │
│         │ ───────────────→  │         │
│         │      result       │         │
│         │ ←──────────────── │         │
│         │                   │         │
│         │      close        │         │
│         │ ───────────────→  │         │
└─────────┘                   └─────────┘
```

### 类结构

```java
public class McpClient implements Closeable {
    private static final String PROTOCOL_VERSION = "2024-11-05";

    private final String serverName;
    private final McpTransport transport;
    private final ObjectMapper mapper;
    private boolean initialized = false;

    public void initialize() throws IOException;                     // 阶段 1：握手
    public List<McpToolDefinition> listTools() throws IOException;   // 阶段 2：发现
    public McpToolCallResult callTool(String name, Map args);        // 阶段 3：调用
    public void close() throws IOException;                          // 阶段 4：关闭
}
```

### initialize() — MCP 握手

```java
public void initialize() throws IOException {
    // 1. 启动传输层（启动子进程）
    transport.start();

    // 2. 构建 initialize 请求
    Map<String, Object> params = new LinkedHashMap<>();
    params.put("protocolVersion", PROTOCOL_VERSION);  // "2024-11-05"
    params.put("capabilities", Collections.emptyMap());
    params.put("clientInfo", Map.of("name", "claude-code-java", "version", "1.0"));

    // 3. 发送 initialize 请求并等待响应
    int id = ((StdioTransport) transport).nextId();
    JsonRpcRequest request = JsonRpcRequest.request(id, "initialize", params);
    JsonRpcResponse response = transport.send(request);

    // 4. 检查响应
    if (response.isError()) {
        throw new IOException("MCP initialize failed...");
    }

    // 5. 解析 server 版本信息（可选）
    // ... 从 response.result.serverInfo.version 中提取

    // 6. 发送 initialized 通知（告知 Server："握手完成，可以开始工作了"）
    transport.sendNotification("notifications/initialized", null);

    initialized = true;
}
```

**握手的意义**：
- Client 告诉 Server 自己支持的协议版本和能力
- Server 返回自己的版本和能力
- Client 发送 `notifications/initialized` 确认就绪

### listTools() — 工具发现

```java
public List<McpToolDefinition> listTools() throws IOException {
    ensureInitialized();  // 必须先完成握手

    int id = ((StdioTransport) transport).nextId();
    JsonRpcRequest request = JsonRpcRequest.request(id, "tools/list", emptyMap());
    JsonRpcResponse response = transport.send(request);

    // 从 response.result.tools 中解析工具列表
    List<McpToolDefinition> tools = new ArrayList<>();
    // ... 遍历 result.tools，用 Jackson 转为 McpToolDefinition
    return tools;
}
```

`McpToolDefinition` 包含三个字段：

```java
public static class McpToolDefinition {
    private String name;              // 工具名称
    private String description;       // 工具描述（给 LLM 看的）
    private Map<String, Object> inputSchema;  // 参数 JSON Schema
}
```

这三个字段正好对应 `Tool` 接口的 `name()`、`description()`、`inputSchema()` — 这就是适配的基础。

### callTool() — 工具调用

```java
public McpToolCallResult callTool(String toolName, Map<String, Object> arguments) 
        throws IOException {
    ensureInitialized();

    // 1. 构建 tools/call 请求
    Map<String, Object> params = new LinkedHashMap<>();
    params.put("name", toolName);
    params.put("arguments", arguments != null ? arguments : emptyMap());

    // 2. 发送请求
    int id = ((StdioTransport) transport).nextId();
    JsonRpcRequest request = JsonRpcRequest.request(id, "tools/call", params);
    JsonRpcResponse response = transport.send(request);

    // 3. 解析结果
    return parseToolCallResult(response.getResult());
}
```

### parseToolCallResult — 响应解析

MCP `tools/call` 的响应格式：

```json
{
  "content": [
    { "type": "text", "text": "实际的工具输出内容..." }
  ],
  "isError": false
}
```

解析逻辑：

```java
private McpToolCallResult parseToolCallResult(Object result) {
    Map<String, Object> resultMap = (Map<String, Object>) result;
    boolean isError = Boolean.TRUE.equals(resultMap.get("isError"));

    // 提取所有 text 类型的 content block
    StringBuilder textBuilder = new StringBuilder();
    List<Object> contentList = (List<Object>) resultMap.get("content");
    for (Object item : contentList) {
        Map<String, Object> block = (Map<String, Object>) item;
        if ("text".equals(block.get("type"))) {
            textBuilder.append(block.get("text"));
        }
    }

    String text = textBuilder.length() > 0 ? textBuilder.toString() : "(empty response)";
    return isError ? McpToolCallResult.error(text) : McpToolCallResult.success(text);
}
```

当前只处理 `text` 类型的内容块。MCP 协议还支持 `image`、`resource` 等类型，但当前实现只提取文本。

---

## StdioTransport — 子进程 IO 与消息路由

📄 `claude-code-java/src/main/java/com/claudecode/mcp/client/StdioTransport.java`

### 设计挑战

用子进程的 stdin/stdout 做 JSON-RPC 通信，面临几个问题：

1. **异步响应匹配**：发了 id=1 和 id=2 两个请求，响应可能先回来 id=2 再回来 id=1
2. **线程安全**：多个线程可能同时写 stdin
3. **进程管理**：子进程可能异常退出、超时、卡死

StdioTransport 用三个核心机制解决这些问题：

### 核心机制 1：Future Map — 请求-响应匹配

```java
private final ConcurrentHashMap<Integer, CompletableFuture<JsonRpcResponse>> pendingRequests
        = new ConcurrentHashMap<>();
```

发送请求时，为每个 `id` 注册一个 `CompletableFuture`：

```java
@Override
public JsonRpcResponse send(JsonRpcRequest request) throws IOException {
    CompletableFuture<JsonRpcResponse> future = new CompletableFuture<>();
    pendingRequests.put(request.getId(), future);  // 注册等待

    writeMessage(request);  // 写入 stdin

    try {
        return future.get(30_000, TimeUnit.MILLISECONDS);  // 阻塞等待响应
    } catch (TimeoutException e) {
        pendingRequests.remove(request.getId());
        throw new IOException("MCP request timed out...");
    }
}
```

读取线程从 stdout 读到响应后，按 `id` 找到对应的 Future 并完成它：

```java
// readerThread 中
JsonRpcResponse response = mapper.readValue(line, JsonRpcResponse.class);
if (response.getId() != null) {
    CompletableFuture<JsonRpcResponse> future = pendingRequests.remove(response.getId());
    if (future != null) {
        future.complete(response);  // 唤醒等待的 send() 调用
    }
}
```

这个模式保证了：即使响应乱序到达，每个请求都能正确匹配到自己的响应。

### 核心机制 2：Synchronized Writer — 写入串行化

```java
private void writeMessage(JsonRpcRequest request) throws IOException {
    String json = mapper.writeValueAsString(request);
    synchronized (writer) {  // 加锁！
        writer.write(json);
        writer.newLine();
        writer.flush();
    }
}
```

多个线程可能同时调用 `send()`，但写入 stdin 必须串行——否则两条 JSON 消息可能交错成乱码。

### 核心机制 3：守护线程 — 后台读取

```java
private void startReaderThread() {
    readerThread = new Thread(() -> {
        try {
            String line;
            while ((line = reader.readLine()) != null) {
                // 解析 JSON-RPC 响应，完成对应的 Future
                JsonRpcResponse response = mapper.readValue(line, JsonRpcResponse.class);
                if (response.getId() != null) {
                    CompletableFuture<JsonRpcResponse> future = 
                        pendingRequests.remove(response.getId());
                    if (future != null) {
                        future.complete(response);
                    }
                }
                // id 为 null 的是 Server 通知，当前忽略
            }
        } catch (IOException e) {
            // 子进程退出时流关闭，正常结束
        }
        // 进程结束，所有 pending 请求标记为异常
        for (CompletableFuture<JsonRpcResponse> f : pendingRequests.values()) {
            f.completeExceptionally(new IOException("MCP server disconnected"));
        }
    });
    readerThread.setDaemon(true);   // 守护线程，JVM 退出时自动结束
    readerThread.setName("mcp-reader-" + serverName);
    readerThread.start();
}
```

另外还有一个 stderr 守护线程，把子进程的错误输出转发到 `System.err`：

```java
private void startStderrThread() {
    stderrThread = new Thread(() -> {
        String line;
        while ((line = stderrReader.readLine()) != null) {
            System.err.println("[MCP:" + serverName + "] " + line);
        }
    });
    stderrThread.setDaemon(true);
    stderrThread.setName("mcp-stderr-" + serverName);
    stderrThread.start();
}
```

### start() — 启动子进程

```java
@Override
public void start() throws IOException {
    List<String> cmdList = new ArrayList<>();
    cmdList.add(command);       // e.g. "npx"
    cmdList.addAll(args);       // e.g. ["-y", "@modelcontextprotocol/server-filesystem"]

    ProcessBuilder pb = new ProcessBuilder(cmdList);
    pb.redirectErrorStream(false);  // stderr 不合并到 stdout

    if (env != null && !env.isEmpty()) {
        pb.environment().putAll(env);  // 设置环境变量
    }

    process = pb.start();
    writer = new BufferedWriter(new OutputStreamWriter(process.getOutputStream()));

    startReaderThread();   // 启动 stdout 读取守护线程
    startStderrThread();   // 启动 stderr 读取守护线程
}
```

### close() — 清理资源

```java
@Override
public void close() throws IOException {
    // 1. 完成所有 pending 请求为异常
    for (CompletableFuture<JsonRpcResponse> f : pendingRequests.values()) {
        f.completeExceptionally(new IOException("MCP transport closed"));
    }
    pendingRequests.clear();

    // 2. 关闭 stdin writer
    if (writer != null) {
        try { writer.close(); } catch (IOException ignored) {}
    }

    // 3. 强制终止子进程
    if (process != null) {
        process.destroyForcibly();
        try { process.waitFor(5, TimeUnit.SECONDS); } catch (InterruptedException ignored) {}
    }

    // 4. 中断守护线程
    if (readerThread != null) readerThread.interrupt();
    if (stderrThread != null) stderrThread.interrupt();
}
```

清理顺序很重要：先完成 pending 请求（让等待的线程不会永远阻塞），再关 writer，再杀进程，最后停线程。

---

## JSON-RPC 消息模型

### JsonRpcRequest — 请求 & 通知

📄 `claude-code-java/src/main/java/com/claudecode/mcp/client/JsonRpcRequest.java`

```java
@JsonInclude(JsonInclude.Include.NON_NULL)  // null 字段不序列化
public class JsonRpcRequest {
    private final String jsonrpc = "2.0";
    private final Integer id;      // 请求有 id，通知无 id
    private final String method;
    private final Map<String, Object> params;

    // 两个工厂方法
    public static JsonRpcRequest request(int id, String method, Map params);
    public static JsonRpcRequest notification(String method, Map params);
}
```

`@JsonInclude(NON_NULL)` 是关键——通知消息的 `id` 为 `null`，序列化时自动省略 `id` 字段：

```json
// 请求（有 id）
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{...}}

// 通知（无 id，id 字段被省略）
{"jsonrpc":"2.0","method":"notifications/initialized"}
```

### JsonRpcResponse — 成功 & 错误

📄 `claude-code-java/src/main/java/com/claudecode/mcp/client/JsonRpcResponse.java`

```java
@JsonIgnoreProperties(ignoreUnknown = true)  // 忽略未知字段（前向兼容）
public class JsonRpcResponse {
    private Integer id;
    private Object result;         // 成功时有值
    private JsonRpcError error;    // 失败时有值

    public boolean isError() { return error != null; }
}
```

`result` 用 `Object` 类型是因为不同 method 返回的数据结构完全不同（initialize 返回 capabilities，tools/list 返回工具列表，tools/call 返回 content blocks）。McpClient 按需用 `instanceof` + 强转解析。

---

## McpTransport — 传输层抽象

📄 `claude-code-java/src/main/java/com/claudecode/mcp/client/McpTransport.java`

```java
public interface McpTransport extends Closeable {
    void start() throws IOException;
    JsonRpcResponse send(JsonRpcRequest request) throws IOException;
    void sendNotification(String method, Map<String, Object> params) throws IOException;
    boolean isAlive();
    void close() throws IOException;
}
```

当前只有 `StdioTransport` 一个实现。接口存在的意义是为未来的 `HttpSseTransport` 预留扩展点。

::: warning 当前实现的一个耦合问题
`McpClient.initialize()` 中有一行：
```java
int id = ((StdioTransport) transport).nextId();
```
这里强转了 `McpTransport` 为 `StdioTransport`，破坏了抽象。如果要加第二种 Transport，需要把 `nextId()` 提升到接口层面。
:::

## 线程模型总结

```
主线程                  mcp-reader-xxx           mcp-stderr-xxx
  │                         │                         │
  ├─ send(request)          │                         │
  │    ├─ pendingReqs.put() │                         │
  │    ├─ writeMessage()    │                         │
  │    └─ future.get() ──┐  │                         │
  │         (blocking)   │  ├─ readLine()             ├─ readLine()
  │                      │  ├─ parse JSON             ├─ System.err.println()
  │                      │  ├─ pendingReqs.remove()   │
  │                      │  └─ future.complete() ─────┘
  │    ┌─ return ────────┘  │
  │    │                    │
  └────┘                    │
```

## 思考题

1. `StdioTransport.send()` 的超时时间是 30 秒。如果一个 MCP 工具需要执行很久（比如编译项目），30 秒够吗？怎么改？
2. 为什么 `readerThread` 设为守护线程（`setDaemon(true)`）？如果设为用户线程会怎样？
3. 如果子进程在 `initialize()` 之后、`listTools()` 之前崩溃了，会发生什么？追踪代码流程
4. `JsonRpcResponse.result` 为什么用 `Object` 而不是泛型？有什么优缺点？

## 下一步

了解配置是怎么加载的：[MCP 配置加载](/core-code/mcp-config)。
