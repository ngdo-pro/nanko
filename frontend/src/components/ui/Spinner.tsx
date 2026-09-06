import React from 'react'
import { BrandIcon } from '../BrandLogo'
import { cn } from '@/utils/cn'

export interface SpinnerProps {
  size?: number
  className?: string
  message?: string
  'data-qa'?: string
}

export const Spinner: React.FC<SpinnerProps> = ({
  size = 54,
  className,
  message,
  'data-qa': dataQa = 'app-loading',
}) => {
  return (
    <div
      className={cn('app-loading-state', className)}
      data-qa={dataQa}
    >
      <BrandIcon size={size} className="spinner-logo" />
      {message && <p className="loading-message">{message}</p>}
    </div>
  )
}
