import React from 'react'
import { AppProvider } from './provider'
import { AppRouter } from './router'
import '../App.css'

export const App: React.FC = () => {
  return (
    <AppProvider>
      <AppRouter />
    </AppProvider>
  )
}

export default App
