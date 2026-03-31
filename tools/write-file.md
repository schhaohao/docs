---
title: WriteFileTool
description: 文件创建/覆写工具
---

# WriteFileTool

`WriteFileTool` 用于创建新文件或完全覆写现有文件的内容。

## 工具定义

| 属性 | 值 |
|------|-----|
| name | `Write` |
| requiresPermission | `true` |
| 参数 | `file_path`(必填), `content`(必填) |

## 核心实现

WriteFileTool 的实现相对简单：

```java
public ToolResult execute(Map<String, Object> input) {
    String filePath = (String) input.get("file_path");
    String content = (String) input.get("content");

    // 参数校验
    if (filePath == null || filePath.isBlank())
        return ToolResult.error("Parameter 'file_path' is required");
    if (content == null)
        return ToolResult.error("Parameter 'content' is required");

    try {
        Path path = Paths.get(filePath);

        // 自动创建父目录（如果不存在）
        if (path.getParent() != null) {
            Files.createDirectories(path.getParent());
        }

        // 写入文件（UTF-8 编码）
        Files.writeString(path, content, StandardCharsets.UTF_8);

        return ToolResult.success("Successfully wrote to " + filePath);
    } catch (Exception e) {
        return ToolResult.error("Failed to write file: " + e.getMessage());
    }
}
```

### 关键特性

**自动创建父目录：**
```java
Files.createDirectories(path.getParent());
```

如果 Claude 要写入 `src/main/java/com/example/NewFile.java`，即使 `example/` 目录不存在，也会自动创建整个目录链。

**全量覆写：**
`Files.writeString()` 默认行为是覆盖。如果文件已存在，旧内容会被完全替换。

## 使用场景

| 场景 | 推荐工具 |
|------|---------|
| 创建全新文件 | **Write** |
| 修改现有文件的一部分 | Edit |
| 完全重写文件内容 | **Write** |
| 在文件中替换特定文本 | Edit |

::: warning 注意
Write 会**覆盖**整个文件内容。如果 Claude 只想修改文件的一部分，应该使用 `Edit` 而不是 `Write`。这也是为什么 description 中通常会提示 "prefer Edit for modifications"。
:::

## 思考题

1. 如果 content 是空字符串，写入后文件会变成什么状态？
2. 当前实现没有备份机制。如何添加"写入前自动备份"的功能？
3. 如果要限制可写入的目录范围（比如只允许写入工作目录下），你会怎么实现？
