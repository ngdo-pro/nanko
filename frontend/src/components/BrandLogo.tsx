import React from 'react'

export interface BrandIconProps {
  size?: number
  className?: string
}

export const BrandIcon: React.FC<BrandIconProps> = ({ size = 28, className }) => {
  const height = Math.round((size * 120) / 100)

  return (
    <svg
      width={size}
      height={height}
      viewBox="0 0 100 120"
      aria-hidden="true"
      role="img"
      className={className}
    >
      <g fill="none" stroke="var(--brand)" strokeWidth="4.5" strokeLinecap="round">
        <path d="M41,26 Q50,20 59,26" />
        <path d="M32,36 Q50,28.5 68,36" />
        <path d="M24,46 Q50,37.5 76,46" />
        <path d="M16,56 Q50,46.5 84,56" />
      </g>
      <g fill="none" stroke="var(--brand)" strokeWidth="4.5">
        <path d="M50,21 V70" />
        <path d="M13,62 H87" />
      </g>
      <g fill="none" stroke="var(--accent)" strokeWidth="3.6" strokeLinecap="round">
        <path d="M50,72 L33,85" />
        <path d="M50,72 L67,85" />
        <path d="M33,85 L24,96" />
        <path d="M33,85 L43,95" />
        <path d="M67,85 L57,95" />
        <path d="M67,85 L76,96" />
      </g>
      <g fill="var(--accent)">
        <circle cx="50" cy="72" r="5" />
        <circle cx="33" cy="85" r="4" />
        <circle cx="67" cy="85" r="4" />
        <circle cx="24" cy="96" r="3.4" />
        <circle cx="43" cy="95" r="3.4" />
        <circle cx="57" cy="95" r="3.4" />
        <circle cx="76" cy="96" r="3.4" />
      </g>
    </svg>
  )
}

export interface BrandLogoProps {
  size?: number
  withTagline?: boolean
  href?: string
  className?: string
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 28,
  withTagline = false,
  href = '/',
  className = '',
}) => {
  return (
    <div className={`brand-wrapper ${className}`.trim()}>
      <a
        href={href}
        className="nav-logo"
        data-testid="nav-logo"
        data-qa="nav-logo"
        aria-label="Nanko, accueil"
      >
        <BrandIcon size={size} />
        <span className="brand-name">NANKO</span>
      </a>
      {withTagline && (
        <span className="brand-tagline" data-qa="brand-tagline">
          ARCHITECTURE DE CODE
        </span>
      )}
    </div>
  )
}
