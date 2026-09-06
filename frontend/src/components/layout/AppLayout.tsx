import React from 'react'
import { Outlet } from 'react-router'
import { Navbar } from './Navbar'
import { Footer } from './Footer'

export const AppLayout: React.FC = () => {
  return (
    <div className="app-container">
      <Navbar />
      <main className="app-main">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
