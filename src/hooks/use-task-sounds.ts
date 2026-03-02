'use client'

import { useCallback, useEffect, useState } from 'react'
import { playSound } from '@/lib/sound'

const STORAGE_KEY = 'do-dat:sounds-enabled'

export function useTaskSounds() {
  const [enabled, setEnabled] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored !== null) setEnabled(stored === 'true')
  }, [])

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev
      localStorage.setItem(STORAGE_KEY, String(next))
      return next
    })
  }, [])

  const play = useCallback(
    (type: Parameters<typeof playSound>[0]) => {
      playSound(type, enabled)
    },
    [enabled],
  )

  return { enabled, toggle, play }
}
