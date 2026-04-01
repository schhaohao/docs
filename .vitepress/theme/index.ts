import DefaultTheme from 'vitepress/theme'
import GitHubStar from './components/GitHubStar.vue'
import './style.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('GitHubStar', GitHubStar)
  }
}
