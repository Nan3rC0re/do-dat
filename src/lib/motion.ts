export const springs = {
  snappy: { type: 'spring', stiffness: 500, damping: 30 },
  smooth: { type: 'spring', stiffness: 300, damping: 30 },
  bouncy: { type: 'spring', stiffness: 400, damping: 20 },
  gentle: { type: 'spring', stiffness: 200, damping: 30 },
} as const
