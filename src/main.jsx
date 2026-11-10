import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/chakra-petch/latin-600.css'
import '@fontsource/chakra-petch/latin-700.css'
import '@fontsource/ibm-plex-mono/latin-400.css'
import '@fontsource/ibm-plex-mono/latin-400-italic.css'
import '@fontsource/ibm-plex-mono/latin-500.css'
import '@fontsource/ibm-plex-mono/latin-600.css'
import './index.css'
import App from './App.jsx'
import { dataset } from '#dataset'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App dataset={dataset} />
  </StrictMode>,
)
