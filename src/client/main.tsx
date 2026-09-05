import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'

import '../shared/zod-locale'

import App from './App'
import './config/styles/globals.css'

const container = document.getElementById('root')

if (!container) {
  throw new Error('Elemento #root nao encontrado em index.html.')
}

createRoot(container).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
