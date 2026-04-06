<template>
  <div ref="container" class="terminal-demo" :class="{ 'is-visible': isVisible }">
    <div class="terminal-window">
      <!-- Title bar -->
      <div class="terminal-titlebar">
        <div class="terminal-dots">
          <span class="dot dot-red"></span>
          <span class="dot dot-yellow"></span>
          <span class="dot dot-green"></span>
        </div>
        <div class="terminal-title">claude-code-java &mdash; Agent Loop</div>
        <button class="terminal-replay" @click="replay" title="Replay">
          &#x21BB;
        </button>
      </div>
      <!-- Content -->
      <div class="terminal-body" ref="termBody">
        <div
          v-for="(line, i) in visibleLines"
          :key="i"
          class="terminal-line"
          :class="[`line-${line.type}`, { 'is-typing': i === currentLine && isTyping }]"
        >
          <span v-if="line.prefix" class="line-prefix">{{ line.prefix }}</span>
          <span class="line-content" v-html="line.displayText"></span>
          <span v-if="i === currentLine && isTyping" class="cursor">&#x2588;</span>
        </div>
        <div v-if="isDone" class="terminal-line line-cursor-idle">
          <span class="line-prefix">&gt;</span>
          <span class="cursor blink">&#x2588;</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'

const SCRIPT = [
  { type: 'input', prefix: '>', text: '\u5E2E\u6211\u770B\u770B pom.xml \u91CC\u7528\u4E86\u54EA\u4E9B\u4F9D\u8D56', delay: 50 },
  { type: 'thinking', prefix: '\u2726', text: '\u601D\u8003\u4E2D... \u6211\u9700\u8981\u8BFB\u53D6 pom.xml \u6587\u4EF6\u6765\u67E5\u770B\u4F9D\u8D56\u4FE1\u606F', delay: 30 },
  { type: 'tool', prefix: '\u2699', text: '<span class="hl-tool">ReadFileTool</span> \u2192 pom.xml', delay: 40 },
  { type: 'result', prefix: '\u2190', text: '\u2714 \u6587\u4EF6\u8BFB\u53D6\u6210\u529F (142 \u884C)', delay: 20 },
  { type: 'thinking', prefix: '\u2726', text: '\u5206\u6790\u4F9D\u8D56\u4FE1\u606F... \u53D1\u73B0 4 \u4E2A\u6838\u5FC3\u4F9D\u8D56', delay: 30 },
  { type: 'output', prefix: '\u2500', text: '<span class="hl-key">OkHttp</span>    4.12.0  HTTP \u5BA2\u6237\u7AEF + SSE', delay: 35 },
  { type: 'output', prefix: '\u2500', text: '<span class="hl-key">Jackson</span>   2.17.0  JSON \u5E8F\u5217\u5316', delay: 35 },
  { type: 'output', prefix: '\u2500', text: '<span class="hl-key">JLine3</span>    3.25.0  \u7EC8\u7AEF\u4EA4\u4E92', delay: 35 },
  { type: 'output', prefix: '\u2500', text: '<span class="hl-key">JUnit 5</span>   5.10.0  \u5355\u5143\u6D4B\u8BD5', delay: 35 },
  { type: 'done', prefix: '\u2713', text: '\u5171 4 \u4E2A\u6838\u5FC3\u4F9D\u8D56\uFF0C\u9879\u76EE\u4FDD\u6301\u8F7B\u91CF\u7EA7\u8BBE\u8BA1\u3002', delay: 25 },
]

const container = ref(null)
const termBody = ref(null)
const isVisible = ref(false)
const visibleLines = ref([])
const currentLine = ref(-1)
const isTyping = ref(false)
const isDone = ref(false)

let observer = null
let timeout = null

function sleep(ms) {
  return new Promise(resolve => { timeout = setTimeout(resolve, ms) })
}

async function typeLines() {
  isDone.value = false
  visibleLines.value = []
  currentLine.value = -1

  await sleep(600)

  for (let i = 0; i < SCRIPT.length; i++) {
    const line = SCRIPT[i]
    currentLine.value = i
    isTyping.value = true

    // Push line with empty display text
    visibleLines.value.push({
      ...line,
      displayText: ''
    })

    // Type character by character
    const text = line.text
    for (let c = 0; c <= text.length; c++) {
      visibleLines.value[i].displayText = text.substring(0, c)
      await sleep(line.delay)
    }

    isTyping.value = false

    // Scroll to bottom
    await nextTick()
    if (termBody.value) {
      termBody.value.scrollTop = termBody.value.scrollHeight
    }

    // Pause between lines
    await sleep(300)
  }

  isDone.value = true
  currentLine.value = -1
}

function replay() {
  clearTimeout(timeout)
  typeLines()
}

onMounted(() => {
  observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting && !isVisible.value) {
        isVisible.value = true
        typeLines()
      }
    },
    { threshold: 0.2 }
  )
  if (container.value) {
    observer.observe(container.value)
  }
})

onUnmounted(() => {
  observer?.disconnect()
  clearTimeout(timeout)
})
</script>

<style scoped>
.terminal-demo {
  max-width: 720px;
  margin: 0 auto;
  padding: 0;
  opacity: 0;
  transform: translateY(20px);
  transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.terminal-demo.is-visible {
  opacity: 1;
  transform: translateY(0);
}

.terminal-window {
  border-radius: 14px;
  overflow: hidden;
  background: #1a1a2e;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow:
    0 20px 60px rgba(0, 0, 0, 0.3),
    0 0 0 1px rgba(255, 255, 255, 0.05),
    0 0 80px rgba(5, 150, 105, 0.05);
}

.dark .terminal-window {
  background: #0d0d1a;
  box-shadow:
    0 20px 60px rgba(0, 0, 0, 0.5),
    0 0 0 1px rgba(255, 255, 255, 0.04),
    0 0 100px rgba(52, 211, 153, 0.04);
}

/* Title bar */
.terminal-titlebar {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.terminal-dots {
  display: flex;
  gap: 8px;
}

.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.dot-red { background: #ff5f57; }
.dot-yellow { background: #febc2e; }
.dot-green { background: #28c840; }

.terminal-title {
  flex: 1;
  text-align: center;
  color: rgba(255, 255, 255, 0.4);
  font-family: var(--vp-font-family-mono);
  font-size: 0.75rem;
  font-weight: 500;
  letter-spacing: 0.02em;
}

.terminal-replay {
  background: none;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.4);
  cursor: pointer;
  font-size: 1rem;
  padding: 2px 8px;
  border-radius: 6px;
  transition: all 0.2s ease;
  line-height: 1;
}

.terminal-replay:hover {
  color: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
  background: rgba(5, 150, 105, 0.1);
}

/* Body */
.terminal-body {
  padding: 20px 20px 24px;
  min-height: 280px;
  max-height: 380px;
  overflow-y: auto;
  font-family: var(--vp-font-family-mono);
  font-size: 0.85rem;
  line-height: 1.7;
}

.terminal-body::-webkit-scrollbar {
  width: 4px;
}

.terminal-body::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
}

/* Line types */
.terminal-line {
  display: flex;
  gap: 10px;
  align-items: baseline;
  white-space: pre-wrap;
  word-break: break-word;
}

.line-prefix {
  flex-shrink: 0;
  font-weight: 700;
  width: 18px;
  text-align: center;
}

.line-content {
  flex: 1;
}

/* Input line — user prompt */
.line-input { color: #e2e8f0; }
.line-input .line-prefix { color: #34d399; }

/* Thinking — muted */
.line-thinking { color: #94a3b8; font-style: italic; }
.line-thinking .line-prefix { color: #818cf8; }

/* Tool call — accent */
.line-tool { color: #22d3ee; }
.line-tool .line-prefix { color: #f59e0b; }

/* Result — success green */
.line-result { color: #34d399; }
.line-result .line-prefix { color: #34d399; }

/* Output — clean white */
.line-output { color: #cbd5e1; }
.line-output .line-prefix { color: rgba(255, 255, 255, 0.2); }

/* Done — bright green */
.line-done { color: #6ee7b7; font-weight: 600; }
.line-done .line-prefix { color: #34d399; }

/* Idle cursor line */
.line-cursor-idle {
  display: flex;
  gap: 10px;
  color: #34d399;
}

.line-cursor-idle .line-prefix {
  font-weight: 700;
  width: 18px;
  text-align: center;
}

/* Cursor */
.cursor {
  color: #34d399;
  animation: none;
  font-size: 0.8em;
  line-height: 1;
}

.cursor.blink {
  animation: cursorBlink 1s step-end infinite;
}

@keyframes cursorBlink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

/* Highlight classes used in v-html */
:deep(.hl-tool) {
  color: #f59e0b;
  font-weight: 600;
}

:deep(.hl-key) {
  color: #34d399;
  font-weight: 600;
}
</style>
