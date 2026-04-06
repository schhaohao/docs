<template>
  <div ref="container" class="learning-timeline">
    <div class="timeline-track">
      <div
        v-for="(phase, i) in phases"
        :key="i"
        class="timeline-item"
        :class="{ 'is-visible': visibleItems[i] }"
        :style="{ '--i': i }"
      >
        <div class="timeline-node">
          <div class="node-ring">
            <span class="node-number">{{ i + 1 }}</span>
          </div>
          <div v-if="i < phases.length - 1" class="node-line"></div>
        </div>
        <div class="timeline-content">
          <div class="phase-badge">{{ phase.badge }}</div>
          <h3 class="phase-title">{{ phase.title }}</h3>
          <p class="phase-desc">{{ phase.desc }}</p>
          <div class="phase-tags">
            <span v-for="tag in phase.tags" :key="tag" class="phase-tag">{{ tag }}</span>
          </div>
          <a v-if="phase.link" :href="phase.link" class="phase-link">
            {{ phase.linkText }} &rarr;
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'

const phases = [
  {
    badge: '\u9636\u6BB5\u4E00',
    title: '\u5168\u666F\u8BA4\u77E5',
    desc: '\u4E86\u89E3\u9879\u76EE\u662F\u4EC0\u4E48\u3001\u6574\u4F53\u600E\u4E48\u8FD0\u8F6C\uFF0C\u5EFA\u7ACB\u5BF9 AI Agent \u67B6\u6784\u7684\u521D\u6B65\u8BA4\u77E5\u3002',
    tags: ['\u9879\u76EE\u7B80\u4ECB', '\u76EE\u5F55\u7ED3\u6784', '\u6A21\u5757\u5173\u7CFB'],
    link: '/docs/guide/introduction',
    linkText: '\u5F00\u59CB\u5B66\u4E60'
  },
  {
    badge: '\u9636\u6BB5\u4E8C',
    title: '\u6838\u5FC3\u5F15\u64CE',
    desc: '\u6DF1\u5165 Agent Loop \u201C\u601D\u8003-\u884C\u52A8\u201D\u5FAA\u73AF\uFF0C\u7406\u89E3 stop_reason \u9A71\u52A8\u7684\u5FAA\u73AF\u63A7\u5236\u3002',
    tags: ['AgentLoop', 'ForkExecutor', 'stop_reason'],
    link: '/docs/architecture/agent-loop',
    linkText: '\u67E5\u770B\u67B6\u6784'
  },
  {
    badge: '\u9636\u6BB5\u4E09',
    title: 'API \u901A\u4FE1\u4E0E\u6D41\u5F0F\u5904\u7406',
    desc: '\u5B66\u4E60 SSE \u6D41\u5F0F\u534F\u8BAE\u3001StreamAssembler \u72B6\u6001\u673A\u3001HTTP \u91CD\u8BD5\u4E0E\u9519\u8BEF\u5904\u7406\u3002',
    tags: ['ClaudeApiClient', 'StreamAssembler', 'SSE'],
    link: '/docs/architecture/api-layer',
    linkText: '\u6DF1\u5165 API \u5C42'
  },
  {
    badge: '\u9636\u6BB5\u56DB',
    title: '\u5DE5\u5177\u7CFB\u7EDF',
    desc: '\u7406\u89E3\u5DE5\u5177\u62BD\u8C61\u8BBE\u8BA1\uFF0C\u5B66\u4F1A\u9605\u8BFB\u548C\u6269\u5C55 7 \u4E2A\u5185\u7F6E\u5DE5\u5177\u5B9E\u73B0\u3002',
    tags: ['Tool \u63A5\u53E3', 'ToolRegistry', 'Bash/Read/Edit/Write'],
    link: '/docs/tools/overview',
    linkText: '\u63A2\u7D22\u5DE5\u5177'
  },
  {
    badge: '\u9636\u6BB5\u4E94',
    title: 'Skill \u7CFB\u7EDF & MCP \u96C6\u6210',
    desc: 'Skill \u63D0\u793A\u8BCD\u6CE8\u5165\u673A\u5236\u3001Inline/Fork \u53CC\u6A21\u5F0F\u6267\u884C\u3001MCP \u5916\u90E8\u5DE5\u5177\u670D\u52A1\u5668\u96C6\u6210\u3002',
    tags: ['SkillLoader', 'PromptCommand', 'McpClient', 'JSON-RPC'],
    link: '/docs/architecture/skill-system',
    linkText: '\u8FDB\u5165 Skill & MCP'
  },
  {
    badge: '\u9636\u6BB5\u516D',
    title: '\u5B89\u5168\u3001\u72B6\u6001\u4E0E\u754C\u9762',
    desc: '\u6743\u9650\u7BA1\u7406\u3001\u5BF9\u8BDD\u5386\u53F2\u3001\u4E0A\u4E0B\u6587\u7A97\u53E3\u538B\u7F29\u3001CLI \u7EC8\u7AEF\u5B9E\u73B0\u3002\u52A8\u624B\u6269\u5C55\u9879\u76EE\uFF01',
    tags: ['PermissionManager', 'ConversationHistory', 'REPL'],
    link: '/docs/architecture/permission',
    linkText: '\u5B8C\u6210\u5B66\u4E60'
  },
]

const container = ref(null)
const visibleItems = reactive(phases.map(() => false))

let observer = null

onMounted(() => {
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          // Trigger staggered reveal
          const el = entry.target
          const index = parseInt(el.dataset.index || '0')
          setTimeout(() => {
            visibleItems[index] = true
          }, index * 150)
          observer.unobserve(el)
        }
      })
    },
    { threshold: 0.15, rootMargin: '0px 0px -50px 0px' }
  )

  // Observe individual items
  if (container.value) {
    const items = container.value.querySelectorAll('.timeline-item')
    items.forEach((item, i) => {
      item.dataset.index = i
      observer.observe(item)
    })
  }
})

onUnmounted(() => {
  observer?.disconnect()
})
</script>

<style scoped>
.learning-timeline {
  padding: 24px 0 48px;
  max-width: 720px;
  margin: 0 auto;
}

.timeline-track {
  position: relative;
}

.timeline-item {
  display: flex;
  gap: 24px;
  opacity: 0;
  transform: translateX(-20px);
  transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.timeline-item.is-visible {
  opacity: 1;
  transform: translateX(0);
}

/* Node column */
.timeline-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  width: 48px;
}

.node-ring {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--vp-c-brand-soft);
  border: 2px solid var(--vp-c-brand-1);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 1;
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.timeline-item:hover .node-ring {
  background: var(--vp-c-brand-1);
  box-shadow: 0 0 20px rgba(5, 150, 105, 0.3);
}

.dark .timeline-item:hover .node-ring {
  box-shadow: 0 0 20px rgba(52, 211, 153, 0.3);
}

.node-number {
  font-family: var(--vp-font-family-mono);
  font-weight: 800;
  font-size: 0.85rem;
  color: var(--vp-c-brand-1);
  transition: color 0.3s ease;
}

.timeline-item:hover .node-number {
  color: #fff;
}

.node-line {
  width: 2px;
  flex: 1;
  min-height: 24px;
  background: linear-gradient(180deg, var(--vp-c-brand-1), var(--forge-card-border));
  opacity: 0.4;
}

/* Content */
.timeline-content {
  flex: 1;
  padding-bottom: 36px;
}

.phase-badge {
  display: inline-block;
  font-family: var(--vp-font-family-mono);
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
  padding: 3px 10px;
  border-radius: 20px;
  margin-bottom: 8px;
}

.phase-title {
  font-size: 1.15rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 0 0 6px;
  color: var(--vp-c-text-1);
}

.phase-desc {
  font-size: 0.9rem;
  line-height: 1.6;
  color: var(--vp-c-text-2);
  margin: 0 0 12px;
}

.phase-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}

.phase-tag {
  font-family: var(--vp-font-family-mono);
  font-size: 0.72rem;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 6px;
  background: var(--forge-surface);
  border: 1px solid var(--forge-card-border);
  color: var(--vp-c-text-2);
}

.dark .phase-tag {
  background: rgba(255, 255, 255, 0.04);
}

.phase-link {
  display: inline-flex;
  align-items: center;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--vp-c-brand-1);
  text-decoration: none;
  transition: all 0.2s ease;
}

.phase-link:hover {
  gap: 4px;
  text-decoration: underline;
}

/* Responsive */
@media (max-width: 640px) {
  .timeline-item {
    gap: 16px;
  }

  .timeline-node {
    width: 36px;
  }

  .node-ring {
    width: 32px;
    height: 32px;
  }

  .node-number {
    font-size: 0.75rem;
  }
}
</style>
