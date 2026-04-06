<template>
  <div ref="container" class="stats-counter">
    <div class="stats-grid">
      <div
        v-for="(stat, i) in stats"
        :key="stat.label"
        class="stat-card"
        :style="{ '--delay': `${i * 0.1}s` }"
        :class="{ 'is-visible': isVisible }"
      >
        <div class="stat-icon">{{ stat.icon }}</div>
        <div class="stat-value">
          <span class="stat-number">{{ animatedValues[i] }}</span>
          <span class="stat-suffix">{{ stat.suffix }}</span>
        </div>
        <div class="stat-label">{{ stat.label }}</div>
        <div class="stat-desc">{{ stat.desc }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, reactive } from 'vue'

const stats = [
  { icon: '>', value: 40, suffix: '+', label: 'Java \u6E90\u6587\u4EF6', desc: '\u5B8C\u6574\u53EF\u8FD0\u884C\u7684\u4EE3\u7801' },
  { icon: '\u2588', value: 8, suffix: '', label: '\u5927\u6A21\u5757', desc: '\u6E05\u6670\u7684\u804C\u8D23\u5212\u5206' },
  { icon: '\u2699', value: 7, suffix: '', label: '\u5185\u7F6E\u5DE5\u5177', desc: 'Bash / Read / Edit / Write ...' },
  { icon: '\u21BB', value: 5000, suffix: '+', label: '\u884C\u6838\u5FC3\u4EE3\u7801', desc: '\u9EBB\u96C0\u867D\u5C0F\uFF0C\u4E94\u810F\u4FF1\u5168' },
]

const container = ref(null)
const isVisible = ref(false)
const animatedValues = reactive(stats.map(() => 0))

let observer = null
let animationFrames = []

function easeOutExpo(t) {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
}

function animateValue(index, target, duration = 1600) {
  const start = performance.now()
  function tick(now) {
    const elapsed = now - start
    const progress = Math.min(elapsed / duration, 1)
    const eased = easeOutExpo(progress)
    animatedValues[index] = Math.round(eased * target)
    if (progress < 1) {
      animationFrames[index] = requestAnimationFrame(tick)
    }
  }
  // Add staggered delay per card
  setTimeout(() => {
    animationFrames[index] = requestAnimationFrame(tick)
  }, index * 120)
}

onMounted(() => {
  observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting && !isVisible.value) {
        isVisible.value = true
        stats.forEach((stat, i) => {
          animateValue(i, stat.value)
        })
      }
    },
    { threshold: 0.3 }
  )
  if (container.value) {
    observer.observe(container.value)
  }
})

onUnmounted(() => {
  observer?.disconnect()
  animationFrames.forEach(id => cancelAnimationFrame(id))
})
</script>

<style scoped>
.stats-counter {
  padding: 48px 0;
  position: relative;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  max-width: 960px;
  margin: 0 auto;
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }
}

@media (max-width: 480px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}

.stat-card {
  position: relative;
  padding: 28px 24px;
  border-radius: 16px;
  background: var(--forge-card-bg);
  border: 1px solid var(--forge-card-border);
  text-align: center;
  overflow: hidden;
  opacity: 0;
  transform: translateY(24px);
  transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  transition-delay: var(--delay);
}

.stat-card.is-visible {
  opacity: 1;
  transform: translateY(0);
}

.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--vp-c-brand-1), rgba(8, 145, 178, 0.8));
  opacity: 0;
  transition: opacity 0.4s ease;
}

.stat-card:hover::before {
  opacity: 1;
}

.stat-card:hover {
  transform: translateY(-4px);
  border-color: rgba(5, 150, 105, 0.25);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.08), var(--forge-glow);
}

.dark .stat-card:hover {
  border-color: rgba(52, 211, 153, 0.2);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3), var(--forge-glow);
}

.stat-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  font-family: var(--vp-font-family-mono);
  font-size: 1.2rem;
  font-weight: 700;
  margin-bottom: 16px;
}

.stat-value {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 2px;
  margin-bottom: 8px;
}

.stat-number {
  font-family: var(--vp-font-family-mono);
  font-size: 2.4rem;
  font-weight: 800;
  letter-spacing: -0.04em;
  line-height: 1;
  background: linear-gradient(135deg, var(--vp-c-brand-1), #0891b2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.stat-suffix {
  font-family: var(--vp-font-family-mono);
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--vp-c-brand-1);
  opacity: 0.7;
}

.stat-label {
  font-weight: 700;
  font-size: 0.95rem;
  letter-spacing: -0.01em;
  margin-bottom: 4px;
}

.stat-desc {
  font-size: 0.8rem;
  opacity: 0.55;
  line-height: 1.4;
}
</style>
