import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { WorkspaceMotionProvider } from './components/WorkspaceMotion'
import './styles.css'
import './sakura.css'
import './sakura-workspace.css'
import './sakura-polish.css'
import './mochi-motion.css'
import './workspace-motion.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WorkspaceMotionProvider>
      <App />
    </WorkspaceMotionProvider>
  </React.StrictMode>,
)
