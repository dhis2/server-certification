import './index.css'
import './suppress-defaultprops-error-message.ts'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './app/index.ts'

const root = ReactDOM.createRoot(document.getElementById('root')!)

if (import.meta.env.VITE_SUPRESS_STRICT_MODE) {
    root.render(<App />)
} else {
    root.render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    )
}
