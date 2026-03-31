---
title: 快速开始
description: 5 分钟内把项目跑起来
---

# 快速开始

本指南将帮助你在 5 分钟内完成项目的构建和运行。

## 前提条件

在开始之前，请确保你的环境已安装：

| 工具 | 最低版本 | 检查命令 |
|------|---------|---------|
| Java JDK | 11+ | `java -version` |
| Maven | 3.6+ | `mvn -version` |
| Git | 任意 | `git --version` |

## 第一步：克隆项目

```bash
git clone <your-repo-url>
cd OwnCode/claude-code-java
```

## 第二步：编译构建

```bash
mvn clean compile
```

如果一切正常，你会看到 `BUILD SUCCESS`。运行测试确认：

```bash
mvn test
```

::: tip
如果编译失败，最常见的原因是 Java 版本不匹配。确保 `JAVA_HOME` 指向 JDK 11 或更高版本。
:::

## 第三步：打包

```bash
mvn clean package -DskipTests
```

这会在 `target/` 目录下生成可执行的 JAR 文件。

## 第四步：配置 API Key

claude-code-java 需要一个 Anthropic API Key 来调用 Claude。

**方式一：环境变量（推荐）**
```bash
export ANTHROPIC_API_KEY=sk-ant-api03-xxxxx
```

**方式二：命令行参数**
```bash
java -jar target/claude-code-java-1.0-SNAPSHOT.jar --api-key sk-ant-api03-xxxxx
```

::: warning 安全提示
API Key 是敏感信息，永远不要将它提交到代码仓库中。推荐使用环境变量方式。
:::

## 第五步：启动运行

```bash
java -jar target/claude-code-java-1.0-SNAPSHOT.jar
```

你会看到欢迎界面：

```
╔══════════════════════════════════════╗
║         Claude Code Java v1.0        ║
║   Type /help for available commands  ║
╚══════════════════════════════════════╝
claude>
```

## 第六步：开始对话

输入你的第一个问题：

```
claude> 你好，请介绍一下你自己
```

Claude 会以流式方式实时输出回复，就像在打字一样。

试试让它使用工具：

```
claude> 帮我看看当前目录下有哪些文件
```

这时你会看到 Claude 调用 `Glob` 工具来列出文件，然后基于结果给出回答。

## 可用命令

| 命令 | 功能 |
|------|------|
| `/help` | 显示帮助信息 |
| `/clear` | 清空对话历史，开始新会话 |
| `/exit` 或 `/quit` | 退出程序 |
| `Ctrl+C` | 中断当前输入（不退出程序） |
| `Ctrl+D` | 退出程序 |

## 启动参数

```bash
java -jar claude-code-java.jar [options]

Options:
  --api-key <key>    Anthropic API Key
  --model <model>    模型名称（默认: claude-sonnet-4-6）
  --help             显示帮助信息
```

## 接下来

项目已经跑起来了！接下来让我们了解一下 [项目结构](/guide/project-structure)，看看这些代码是怎么组织的。
