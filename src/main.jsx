import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { AuthProvider } from './auth.jsx'
import { initDefaults } from './lib/users.js'
import './index.css'

function Boot({ children }) {
  useEffect(() => { initDefaults() }, [])
  return children
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Boot>
          <App />
        </Boot>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
