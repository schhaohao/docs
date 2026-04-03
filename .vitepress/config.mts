import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'

export default withMermaid(
  defineConfig({
    title: 'Claude Code Java',
    description: '用 Java 从零实现 Claude Code — 面向初学者的深度学习文档',
    lang: 'zh-CN',
    base: '/docs/',

    themeConfig: {
      socialLinks: [
        { icon: 'github', link: 'https://github.com/schhaohao/OwnCode' }
      ],

      nav: [
        { text: '入门指南', link: '/guide/introduction' },
        { text: '架构设计', link: '/architecture/overview' },
        { text: '核心代码', link: '/core-code/entry-point' },
        { text: '工具系统', link: '/tools/overview' },
        { text: 'Skill 系统', link: '/architecture/skill-system' },
        { text: 'MCP 集成', link: '/architecture/mcp' },
      ],

      sidebar: {
        '/guide/': [
          {
            text: '入门指南',
            items: [
              { text: '项目简介', link: '/guide/introduction' },
              { text: '快速开始', link: '/guide/quick-start' },
              { text: '项目结构', link: '/guide/project-structure' },
            ]
          }
        ],
        '/architecture/': [
          {
            text: '架构设计',
            items: [
              { text: '整体架构', link: '/architecture/overview' },
              { text: 'Agent Loop 核心循环', link: '/architecture/agent-loop' },
              { text: 'API 通信层', link: '/architecture/api-layer' },
              { text: '权限管理', link: '/architecture/permission' },
              { text: 'Skill 系统架构', link: '/architecture/skill-system' },
              { text: 'MCP 集成架构', link: '/architecture/mcp' },
            ]
          }
        ],
        '/core-code/': [
          {
            text: '核心代码讲解',
            items: [
              { text: '启动入口 ClaudeCode', link: '/core-code/entry-point' },
              { text: 'AgentLoop 详解', link: '/core-code/agent-loop-impl' },
              { text: 'API Client 详解', link: '/core-code/api-client' },
              { text: 'SSE 流式组装', link: '/core-code/stream-assembler' },
              { text: '对话历史与上下文', link: '/core-code/conversation' },
              { text: '终端交互 REPL', link: '/core-code/repl' },
              { text: 'CommandRegistry 命令注册中心', link: '/core-code/command-registry' },
              { text: 'SkillLoader 磁盘加载器', link: '/core-code/skill-loader' },
              { text: 'MCP Manager 与适配器', link: '/core-code/mcp-manager' },
              { text: 'MCP Client 与传输层', link: '/core-code/mcp-client' },
              { text: 'MCP 配置加载', link: '/core-code/mcp-config' },
            ]
          }
        ],
        '/tools/': [
          {
            text: '工具系统',
            items: [
              { text: '工具机制概述', link: '/tools/overview' },
              { text: 'BashTool', link: '/tools/bash' },
              { text: 'ReadFileTool', link: '/tools/read-file' },
              { text: 'EditFileTool', link: '/tools/edit-file' },
              { text: 'WriteFileTool', link: '/tools/write-file' },
              { text: 'GlobTool', link: '/tools/glob' },
              { text: 'GrepTool', link: '/tools/grep' },
              { text: 'SkillTool', link: '/tools/skill-tool' },
            ]
          }
        ],
      },

      search: {
        provider: 'local',
        options: {
          translations: {
            button: { buttonText: '搜索文档', buttonAriaLabel: '搜索' },
            modal: {
              noResultsText: '无法找到相关结果',
              resetButtonTitle: '清除查询条件',
              footer: { selectText: '选择', navigateText: '切换', closeText: '关闭' }
            }
          }
        }
      },

      outline: { level: [2, 3], label: '页面导航' },
      lastUpdated: { text: '最后更新于' },
      docFooter: { prev: '上一页', next: '下一页' },

      footer: {
        message: '基于 MIT 许可发布',
        copyright: 'Copyright © 2026 claude-code-java'
      },
    },

    markdown: {
      lineNumbers: true,
      theme: {
        light: 'github-light',
        dark: 'github-dark'
      },
      image: {
        lazyLoading: true
      }
    },

    lastUpdated: true,

    mermaid: {
      theme: 'default',
    }
  })
)
