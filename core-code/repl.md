---
title: 终端交互 REPL
description: Repl 和 TerminalRenderer — 用户直接面对的层
---

# 终端交互 REPL

REPL（Read-Eval-Print Loop）是经典的交互式命令行模式，Python、Node.js 都有。`Repl.java` 就是 claude-code-java 的 REPL 实现。

## 源文件

📄 `claude-code-java/src/main/java/com/claudecode/cli/Repl.java`（约 208 行）
📄 `claude-code-java/src/main/java/com/claudecode/cli/TerminalRenderer.java`

## REPL 循环结构

```
┌─────────────────────────┐
│     打印欢迎信息         │
└───────────┬─────────────┘
            ▼
┌─────────────────────────┐
│  Read: 读取用户输入      │ ◄─── lineReader.readLine("claude> ")
└───────────┬─────────────┘
            ▼
┌─────────────────────────┐
│  Eval: 处理输入          │
│  - 特殊命令？→ 处理      │
│  - 普通输入？→ AgentLoop │
└───────────┬─────────────┘
            ▼
┌─────────────────────────┐
│  Print: 输出结果         │ ◄─── 流式输出由 outputCallback 实时处理
└───────────┬─────────────┘
            ▼
┌─────────────────────────┐
│  Loop: 回到 Read         │
└─────────────────────────┘
```

## JLine3 初始化

```java
// 终端（系统终端，支持 raw mode）
this.terminal = TerminalBuilder.builder()
    .system(true)
    .build();

// 历史文件：~/.claude-code-java/history
Path historyFile = Paths.get(System.getProperty("user.home"),
    ".claude-code-java", "history");

// 行读取器（支持方向键、历史浏览、行编辑）
this.lineReader = LineReaderBuilder.builder()
    .terminal(terminal)
    .history(new DefaultHistory())
    .variable(LineReader.HISTORY_FILE, historyFile)
    .build();
```

JLine3 提供了类似 Bash 的行编辑功能：
- **上下箭头**：浏览历史命令
- **左右箭头**：移动光标
- **Home/End**：跳到行首/行尾
- **Ctrl+A/E**：同上（Emacs 快捷键）
- 历史跨会话持久化到文件

## 主循环

```java
public void start() {
    renderer.renderWelcome();

    try {
        while (running) {
            String input;
            try {
                input = lineReader.readLine(PROMPT);  // "claude> "
            } catch (UserInterruptException e) {
                System.out.println();
                continue;    // Ctrl+C → 不退出，继续
            } catch (EndOfFileException e) {
                printGoodbye();
                break;       // Ctrl+D → 退出
            }

            if (input == null || input.trim().isEmpty()) {
                continue;
            }

            String trimmed = input.trim();
            if (handleCommand(trimmed)) {
                continue;    // 特殊命令已处理
            }

            try {
                agentLoop.run(trimmed);  // ← 核心：交给 AgentLoop
                System.out.println();
            } catch (Exception e) {
                renderer.renderError("Failed: " + e.getMessage());
            }
        }
    } finally {
        terminal.close();  // 恢复终端状态
    }
}
```

### 异常处理设计

| 异常 | 场景 | 处理 |
|------|------|------|
| `UserInterruptException` | Ctrl+C | 中断当前输入，不退出 |
| `EndOfFileException` | Ctrl+D | 优雅退出 |
| 其他 Exception | AgentLoop 出错 | 打印错误，继续循环 |

::: tip 为什么 AgentLoop 异常不退出？
一次请求失败不应该让整个程序崩溃。用户可能只是输入了一个导致 API 错误的请求，下一个请求可能完全正常。
:::

## 特殊命令处理

```java
private boolean handleCommand(String input) {
    switch (input.toLowerCase()) {
        case "/exit":
        case "/quit":
            running = false;
            return true;

        case "/clear":
            agentLoop.getHistory().clear();
            renderer.renderSystemMessage("Conversation history cleared.");
            return true;

        case "/help":
            renderer.renderHelp();
            return true;

        default:
            if (input.startsWith("/")) {
                renderer.renderError("Unknown command: " + input);
                return true;
            }
            return false;
    }
}
```

以 `/` 开头的输入被视为命令。未知命令给出提示，而不是当作普通输入发给 Claude。

## 暴露 readLine 给权限管理

```java
public String readLine(String prompt) {
    return lineReader.readLine(prompt);
}
```

这个方法被注入到 `PermissionManager`，让权限审批也通过 JLine 读取输入，避免 `Scanner(System.in)` 和 JLine raw mode 的冲突。

## TerminalRenderer

`TerminalRenderer` 负责统一的终端输出格式化：

```java
// 欢迎信息
renderer.renderWelcome();
// ╔══════════════════════════════════════╗
// ║       Claude Code Java v1.0          ║
// ╚══════════════════════════════════════╝

// 工具调用
renderer.renderToolCall("Bash", input);
// [Tool] Bash: npm install express

// 工具结果
renderer.renderToolResult("Read", result);
// [Result] Read: (文件内容摘要...)

// 错误
renderer.renderError("API call failed");
// [Error] API call failed

// 系统消息
renderer.renderSystemMessage("History cleared.");
// [System] History cleared.
```

### ANSI 颜色渲染

终端颜色通过 ANSI 转义码实现：

```java
// 检测是否连接到真实终端（管道/重定向时不用颜色）
boolean useColor = System.console() != null;

// ANSI 颜色码
String YELLOW = "\u001B[33m";
String RED    = "\u001B[31m";
String GRAY   = "\u001B[90m";
String RESET  = "\u001B[0m";

// 工具调用用黄色
System.out.println(YELLOW + "[Tool] " + toolName + RESET);

// 错误用红色
System.out.println(RED + "[Error] " + message + RESET);
```

## finally 中关闭 Terminal

```java
finally {
    try {
        terminal.close();
    } catch (IOException e) {
        // ignore
    }
}
```

::: warning 为什么必须关闭？
JLine 在初始化时将终端设为 **raw mode**（关闭回显、禁用行缓冲）。如果程序退出时不恢复，终端会处于异常状态 —— 用户敲键盘看不到字符。`terminal.close()` 负责恢复终端到正常模式。
:::

## 思考题

1. 为什么 `Repl` 在 `finally` 块中关闭 Terminal？如果在 try 块中关闭会有什么问题？
2. 如何实现一个 `/history` 命令来显示最近的对话摘要？
3. 如果要支持多行输入（用户输入 `{` 后等待 `}` 结束），你会怎么修改 `readLine` 逻辑？

## 章节总结

至此，核心代码讲解部分完成。我们从入口到终端，完整地走过了所有核心模块：

| 模块 | 核心类 | 关键概念 |
|------|--------|---------|
| 入口 | ClaudeCode | 组装者模式、依赖注入 |
| 循环 | AgentLoop | while 循环、stop_reason 分支 |
| API | ClaudeApiClient | SSE、429 重试、不可变对象 |
| 流式 | StreamAssembler | 状态机、CountDownLatch、JSON 片段拼接 |
| 历史 | ConversationHistory | 角色交替、不可变视图 |
| 上下文 | ContextManager | token 估算、截断压缩 |
| 终端 | Repl | JLine3、REPL 循环、异常处理 |

接下来进入 [工具系统](/tools/overview)，看看 AI 的 "双手" 是如何实现的。
