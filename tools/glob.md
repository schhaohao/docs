---
title: GlobTool
description: 文件名模式搜索 — 快速定位文件
---

# GlobTool

`GlobTool` 根据 glob 模式搜索文件路径，是 Claude 探索项目结构的主要工具。

## 源文件

📄 `claude-code-java/src/main/java/com/claudecode/tool/impl/GlobTool.java`

## 工具定义

| 属性 | 值 |
|------|-----|
| name | `Glob` |
| requiresPermission | `false`（只读） |
| 参数 | `pattern`(必填), `path`(可选, 默认当前目录) |

## Glob 模式速查

| 模式 | 含义 | 示例 |
|------|------|------|
| `*` | 匹配任意文件名（不跨目录） | `*.java` |
| `**` | 匹配任意层级目录 | `**/*.java` |
| `?` | 匹配单个字符 | `Test?.java` |
| `[abc]` | 匹配方括号内任一字符 | `[A-Z]*.java` |
| `{a,b}` | 匹配花括号内任一模式 | `*.{java,xml}` |

常用示例：
```
**/*.java          → 所有 Java 文件
src/main/**/*.xml  → src/main 下所有 XML 文件
**/Test*.java      → 所有以 Test 开头的 Java 文件
pom.xml            → 当前目录的 pom.xml
```

## 核心实现

### Files.walkFileTree + PathMatcher

```java
PathMatcher matcher = FileSystems.getDefault().getPathMatcher("glob:" + pattern);

Files.walkFileTree(rootPath, new SimpleFileVisitor<Path>() {
    @Override
    public FileVisitResult preVisitDirectory(Path dir, BasicFileAttributes attrs) {
        String dirName = dir.getFileName().toString();
        if (SKIP_DIRS.contains(dirName)) {
            return FileVisitResult.SKIP_SUBTREE;  // 跳过无关目录
        }
        return FileVisitResult.CONTINUE;
    }

    @Override
    public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) {
        Path relative = rootPath.relativize(file);  // 转为相对路径
        if (matcher.matches(relative)) {
            matches.add(file);
        }
        return FileVisitResult.CONTINUE;
    }
});
```

### 智能跳过目录

```java
private static final Set<String> SKIP_DIRS = Set.of(
    ".git", "node_modules", "target", "build", ".idea", "__pycache__", ".gradle"
);
```

这些目录通常包含大量生成文件，搜索它们既浪费时间又产生噪音。

### 按修改时间排序

```java
matches.sort((a, b) -> {
    return Files.getLastModifiedTime(b).compareTo(Files.getLastModifiedTime(a));
});
```

最近修改的文件排在前面 —— 这样 Claude 更容易找到当前正在开发的文件。

### 结果限制

最多返回 **200** 个匹配结果。超出时提示截断：

```
/path/to/file1.java
/path/to/file2.java
... and 150 more files
```

## 思考题

1. 为什么用 `rootPath.relativize(file)` 将路径转为相对路径后再匹配？
2. 如果要支持 `.gitignore` 规则（忽略 .gitignore 中列出的文件），你会怎么实现？
3. 当前实现同步遍历文件树。对于超大项目（10万+文件），如何优化性能？
