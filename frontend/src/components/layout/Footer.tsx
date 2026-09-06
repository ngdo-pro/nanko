import React from 'react'

export const Footer: React.FC = () => {
  return (
    <footer className="app-footer">
      <span>&copy; 2026 NANKO &middot; Architecture de code</span>
      <span className="footer-links">
        <a
          href="https://www.nanko.dev"
          target="_blank"
          rel="noopener noreferrer"
          data-qa="footer-link-docs"
        >
          Documentation &amp; Vision
        </a>
      </span>
    </footer>
  )
}
