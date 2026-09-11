import { useState, useRef, useEffect, useCallback } from 'react'

export interface UseHoverTooltipOptions {
  delay?: number
  graceDelay?: number
}

export function useHoverTooltip(delayOrOptions: number | UseHoverTooltipOptions = 300) {
  const delay = typeof delayOrOptions === 'number' ? delayOrOptions : (delayOrOptions.delay ?? 300)
  const graceDelay = typeof delayOrOptions === 'number' ? 250 : (delayOrOptions.graceDelay ?? 250)

  const [isVisible, setIsVisible] = useState(false)
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimers = useCallback(() => {
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current)
      openTimerRef.current = null
    }
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }, [])

  const handleMouseEnter = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
    if (!isVisible) {
      openTimerRef.current = setTimeout(() => {
        setIsVisible(true)
      }, delay)
    }
  }, [delay, isVisible])

  const handleMouseLeave = useCallback(() => {
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current)
      openTimerRef.current = null
    }
    if (isVisible) {
      closeTimerRef.current = setTimeout(() => {
        setIsVisible(false)
      }, graceDelay)
    }
  }, [graceDelay, isVisible])

  const handleTooltipMouseEnter = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }, [])

  const handleTooltipMouseLeave = useCallback(() => {
    closeTimerRef.current = setTimeout(() => {
      setIsVisible(false)
    }, graceDelay)
  }, [graceDelay])

  useEffect(() => {
    return () => clearTimers()
  }, [clearTimers])

  return {
    isVisible,
    handleMouseEnter,
    handleMouseLeave,
    handleTooltipMouseEnter,
    handleTooltipMouseLeave,
  }
}
