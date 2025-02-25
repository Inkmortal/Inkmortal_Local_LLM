import React, { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [theme, setTheme] = useState('catppuccin')

  // Apply the theme to the document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    // Save theme preference to localStorage
    localStorage.setItem('theme', theme)
  }, [theme])

  // Load theme from localStorage on initial render
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme) {
      setTheme(savedTheme)
    }
  }, [])

  return (
    <div className="app-container bg-themed">
      <div className="theme-switcher">
        <button
          className={`theme-button catppuccin ${theme === 'catppuccin' ? 'active' : ''}`}
          onClick={() => setTheme('catppuccin')}
          title="Catppuccin Theme"
        />
        <button
          className={`theme-button dracula ${theme === 'dracula' ? 'active' : ''}`}
          onClick={() => setTheme('dracula')}
          title="Dracula Theme"
        />
        <button
          className={`theme-button matcha-cafe ${theme === 'matcha-cafe' ? 'active' : ''}`}
          onClick={() => setTheme('matcha-cafe')}
          title="Matcha Cafe Theme"
        />
      </div>

      <h1 className="app-title">Seadragon LLM</h1>
      <p className="app-subtitle">
        Your personal AI tutor powered by Llama 3
      </p>
      <div className="app-card">
        <p>
          This system is currently in development. Come back soon to experience
          assistance with math problems, coding questions, and textbook content.
        </p>
      </div>
    </div>
  )
}

export default App