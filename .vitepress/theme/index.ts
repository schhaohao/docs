import DefaultTheme from 'vitepress/theme'
import GitHubStar from './components/GitHubStar.vue'
import StatsCounter from './components/StatsCounter.vue'
import TerminalDemo from './components/TerminalDemo.vue'
import LearningTimeline from './components/LearningTimeline.vue'
import ArchitectureGraph from './components/ArchitectureGraph.vue'
import './style.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('GitHubStar', GitHubStar)
    app.component('StatsCounter', StatsCounter)
    app.component('TerminalDemo', TerminalDemo)
    app.component('LearningTimeline', LearningTimeline)
    app.component('ArchitectureGraph', ArchitectureGraph)
  }
}
