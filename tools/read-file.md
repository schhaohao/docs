---
title: ReadFileTool
description: 文件读取 — 最常用的只读工具
---

# ReadFileTool

`ReadFileTool` 是使用频率最高的工具之一。Claude 需要了解代码时，第一步往往就是调用它。

## 源文件

📄 `claude-code-java/src/main/java/com/claudecode/tool/impl/ReadFileTool.java`

## 工具定义

| 属性 | 值 |
|------|-----|
| name | `Read` |
| requiresPermission | `false`（只读，自动放行） |
| 参数 | `file_path`(必填), `offset`(可选, 默认1), `limit`(可选, 默认2000) |

## 核心实现

```java
public ToolResult execute(Map<String, Object> input) {
    // 1. 参数提取
    String filePath = (String) input.get("file_path");
    int offset = /* 默认 1 */;
    int limit = /* 默认 2000 */;

    // 2. 文件校验
    Path path = Paths.get(filePath);
    if (!Files.exists(path)) return ToolResult.error("File not found");
    if (Files.isDirectory(path)) return ToolResult.error("Path is a directory");

    // 3. 逐行读取（BufferedReader 避免大文件 OOM）
    try (BufferedReader reader = Files.newBufferedReader(path, UTF_8)) {
        StringBuilder sb = new StringBuilder();
        String line;
        int lineNum = 0, linesRead = 0;

        while ((line = reader.readLine()) != null) {
            lineNum++;
            if (lineNum < offset) continue;    // 跳到 offset
            if (linesRead >= limit) break;      // 读够 limit 行

            sb.append(String.format("%6d\t%s", lineNum, line));
            linesRead++;

            if (sb.length() > MAX_OUTPUT_LENGTH) {  // 200KB 截断
                sb.append("... (output truncated)");
                break;
            }
        }
        return ToolResult.success(sb.toString());
    }
}
```

### 输出格式（cat -n 风格）

```
     1	package com.claudecode;
     2
     3	import com.claudecode.api.ClaudeApiClient;
     4	import com.claudecode.cli.Repl;
     5	import com.claudecode.core.AgentLoop;
```

行号右对齐 6 位 + Tab + 内容。Claude 可以据此精确定位代码位置。

### 关键设计选择

**BufferedReader 逐行读取 vs Files.readAllLines：**

```java
// ✅ 采用：逐行读取，内存友好
BufferedReader reader = Files.newBufferedReader(path);

// ❌ 避免：一次加载全部，大文件可能 OOM
List<String> lines = Files.readAllLines(path);
```

**offset/limit 支持部分读取：**
大文件不需要全部读取。Claude 可以先读前 100 行了解结构，再读特定区域深入分析。

### 边界情况处理

| 情况 | 处理 |
|------|------|
| 文件不存在 | `error("File not found")` |
| 路径是目录 | `error("Path is a directory")` |
| 空文件 | `success("File is empty")` |
| offset 超出范围 | `success("Offset N is beyond file length")` |
| 输出超 200KB | 截断并提示 |
| 编码问题 | `error("possibly binary or encoding issue")` |

## 思考题

1. 如果文件是 GBK 编码的中文文件，当前代码会怎么处理？如何改进？
2. 为什么选择 200KB 而不是更大的截断限制？
3. 如果要支持读取图片文件（返回 base64），你会怎么扩展？
