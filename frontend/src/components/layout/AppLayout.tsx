import React from 'react'
import { Outlet, useLocation } from 'react-router'
import { Navbar } from './Navbar'
import { Footer } from './Footer'

export const AppLayout: React.FC = () => {
  const location = useLocation()
  const isDocumentEditor = location.pathname.includes('/documents/')

  return (
    <div className={`app-container ${isDocumentEditor ? 'app-container-fullscreen' : ''}`}>
      <Navbar />
      <main className={`app-main ${isDocumentEditor ? 'app-main-fullscreen' : ''}`}>
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
