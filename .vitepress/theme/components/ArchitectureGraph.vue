<template>
  <div ref="container" class="arch-graph" :class="{ 'is-visible': isVisible }">
    <div class="arch-canvas">
      <!-- SVG connection lines -->
      <svg class="arch-lines" viewBox="0 0 800 520" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="var(--vp-c-brand-1)" stop-opacity="0.5" />
            <stop offset="100%" stop-color="#0891b2" stop-opacity="0.3" />
          </linearGradient>
        </defs>
        <!-- Entry -> Core -->
        <line x1="400" y1="65" x2="200" y2="175" stroke="url(#lineGrad)" stroke-width="1.5"
          :class="{ 'line-active': activeModule === 'entry' || activeModule === 'core' }" />
        <!-- Entry -> API -->
        <line x1="400" y1="65" x2="400" y2="175" stroke="url(#lineGrad)" stroke-width="1.5"
          :class="{ 'line-active': activeModule === 'entry' || activeModule === 'api' }" />
        <!-- Entry -> Tool -->
        <line x1="400" y1="65" x2="600" y2="175" stroke="url(#lineGrad)" stroke-width="1.5"
          :class="{ 'line-active': activeModule === 'entry' || activeModule === 'tool' }" />
        <!-- Core -> API -->
        <line x1="200" y1="240" x2="400" y2="210" stroke="url(#lineGrad)" stroke-width="1.5"
          :class="{ 'line-active': activeModule === 'core' || activeModule === 'api' }" />
        <!-- Core -> Tool -->
        <line x1="200" y1="240" x2="600" y2="210" stroke="url(#lineGrad)" stroke-width="1"
          :class="{ 'line-active': activeModule === 'core' || activeModule === 'tool' }" />
        <!-- Core -> Permission -->
        <line x1="200" y1="270" x2="200" y2="365" stroke="url(#lineGrad)" stroke-width="1.5"
          :class="{ 'line-active': activeModule === 'core' || activeModule === 'permission' }" />
        <!-- Core -> Skill -->
        <line x1="200" y1="270" x2="400" y2="365" stroke="url(#lineGrad)" stroke-width="1.5"
          :class="{ 'line-active': activeModule === 'core' || activeModule === 'skill' }" />
        <!-- Tool -> MCP -->
        <line x1="600" y1="270" x2="600" y2="365" stroke="url(#lineGrad)" stroke-width="1.5"
          :class="{ 'line-active': activeModule === 'tool' || activeModule === 'mcp' }" />
        <!-- Entry -> CLI -->
        <line x1="400" y1="65" x2="130" y2="440" stroke="url(#lineGrad)" stroke-width="1" stroke-dasharray="4 4"
          :class="{ 'line-active': activeModule === 'entry' || activeModule === 'cli' }" />
      </svg>

      <!-- Module nodes -->
      <div
        v-for="mod in modules"
        :key="mod.id"
        class="arch-node"
        :class="[`node-${mod.id}`, { 'is-active': activeModule === mod.id }]"
        :style="{ left: mod.x + '%', top: mod.y + 'px' }"
        @mouseenter="activeModule = mod.id"
        @mouseleave="activeModule = null"
      >
        <div class="node-icon">{{ mod.icon }}</div>
        <div class="node-name">{{ mod.name }}</div>
        <div class="node-sub">{{ mod.sub }}</div>
      </div>
    </div>

    <!-- Legend -->
    <div class="arch-legend">
      <span class="legend-item">
        <span class="legend-line solid"></span> \u4F9D\u8D56\u5173\u7CFB
      </span>
      <span class="legend-item">
        <span class="legend-line dashed"></span> \u95F4\u63A5\u4F9D\u8D56
      </span>
      <span class="legend-hint">hover \u67E5\u770B\u8FDE\u63A5</span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const modules = [
  { id: 'entry', icon: '\u{1F680}', name: 'ClaudeCode', sub: '\u7A0B\u5E8F\u5165\u53E3', x: 45, y: 20 },
  { id: 'core', icon: '\u{1F9E0}', name: 'core/', sub: 'AgentLoop \u6838\u5FC3\u5F15\u64CE', x: 18, y: 160 },
  { id: 'api', icon: '\u{1F310}', name: 'api/', sub: 'HTTP + SSE \u901A\u4FE1', x: 43, y: 160 },
  { id: 'tool', icon: '\u{1F527}', name: 'tool/', sub: '7 \u4E2A\u5185\u7F6E\u5DE5\u5177', x: 68, y: 160 },
  { id: 'permission', icon: '\u{1F512}', name: 'permission/', sub: '\u6743\u9650\u5BA1\u6279', x: 18, y: 340 },
  { id: 'skill', icon: '\u{1F4DC}', name: 'command/', sub: 'Skill \u7CFB\u7EDF', x: 43, y: 340 },
  { id: 'mcp', icon: '\u{1F50C}', name: 'mcp/', sub: 'MCP \u5916\u90E8\u6269\u5C55', x: 68, y: 340 },
  { id: 'cli', icon: '\u{1F4BB}', name: 'cli/', sub: '\u7EC8\u7AEF REPL', x: 8, y: 410 },
]

const container = ref(null)
const isVisible = ref(false)
const activeModule = ref(null)

let observer = null

onMounted(() => {
  observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        isVisible.value = true
        observer.unobserve(entry.target)
      }
    },
    { threshold: 0.15 }
  )
  if (container.value) observer.observe(container.value)
})

onUnmounted(() => observer?.disconnect())
</script>

<style scoped>
.arch-graph {
  padding: 32px 0 24px;
  opacity: 0;
  transform: translateY(20px);
  transition: all 0.7s cubic-bezier(0.4, 0, 0.2, 1);
}

.arch-graph.is-visible {
  opacity: 1;
  transform: translateY(0);
}

.arch-canvas {
  position: relative;
  max-width: 800px;
  margin: 0 auto;
  height: 520px;
}

/* SVG lines */
.arch-lines {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
}

.arch-lines line {
  transition: all 0.35s ease;
  opacity: 0.25;
}

.arch-lines line.line-active {
  opacity: 1;
  stroke-width: 2.5;
  filter: drop-shadow(0 0 6px rgba(5, 150, 105, 0.4));
}

/* Module nodes */
.arch-node {
  position: absolute;
  transform: translateX(-50%);
  text-align: center;
  padding: 14px 18px;
  border-radius: 14px;
  background: var(--forge-card-bg);
  border: 1px solid var(--forge-card-border);
  cursor: default;
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 1;
  min-width: 130px;
}

.arch-node:hover,
.arch-node.is-active {
  transform: translateX(-50%) translateY(-4px);
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08), 0 0 20px rgba(5, 150, 105, 0.1);
  z-index: 2;
}

.dark .arch-node:hover,
.dark .arch-node.is-active {
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), 0 0 24px rgba(52, 211, 153, 0.08);
}

.node-icon {
  font-size: 1.5rem;
  margin-bottom: 4px;
}

.node-name {
  font-family: var(--vp-font-family-mono);
  font-weight: 700;
  font-size: 0.85rem;
  color: var(--vp-c-text-1);
}

.node-sub {
  font-size: 0.72rem;
  color: var(--vp-c-text-2);
  opacity: 0.7;
  margin-top: 2px;
}

/* Legend */
.arch-legend {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
  margin-top: 16px;
  font-size: 0.78rem;
  color: var(--vp-c-text-2);
  opacity: 0.6;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.legend-line {
  display: inline-block;
  width: 24px;
  height: 0;
}

.legend-line.solid {
  border-top: 2px solid var(--vp-c-brand-1);
}

.legend-line.dashed {
  border-top: 2px dashed var(--vp-c-brand-1);
  opacity: 0.5;
}

.legend-hint {
  font-style: italic;
  opacity: 0.7;
}

/* Responsive */
@media (max-width: 768px) {
  .arch-canvas {
    height: 480px;
    overflow-x: auto;
    min-width: 600px;
  }

  .arch-graph {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .arch-node {
    min-width: 100px;
    padding: 10px 12px;
  }

  .node-icon {
    font-size: 1.2rem;
  }

  .node-name {
    font-size: 0.75rem;
  }
}
</style>
