type SoundType = 'complete' | 'add' | 'cycle' | 'delete'

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!('AudioContext' in window)) return null
  const ctx = new AudioContext()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

function playTone(
  ctx: AudioContext,
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  gain = 0.15,
  delay = 0,
) {
  const osc = ctx.createOscillator()
  const gainNode = ctx.createGain()

  osc.connect(gainNode)
  gainNode.connect(ctx.destination)

  osc.type = type
  osc.frequency.setValueAtTime(frequency, ctx.currentTime + delay)
  osc.frequency.exponentialRampToValueAtTime(
    frequency * 0.8,
    ctx.currentTime + delay + duration,
  )

  gainNode.gain.setValueAtTime(0, ctx.currentTime + delay)
  gainNode.gain.linearRampToValueAtTime(gain, ctx.currentTime + delay + 0.01)
  gainNode.gain.exponentialRampToValueAtTime(
    0.001,
    ctx.currentTime + delay + duration,
  )

  osc.start(ctx.currentTime + delay)
  osc.stop(ctx.currentTime + delay + duration)
}

function playComplete() {
  const ctx = getAudioContext()
  if (!ctx) return
  playTone(ctx, 523, 0.12, 'sine', 0.12)
  playTone(ctx, 659, 0.12, 'sine', 0.12, 0.08)
  playTone(ctx, 784, 0.18, 'sine', 0.12, 0.16)
}

function playAdd() {
  const ctx = getAudioContext()
  if (!ctx) return
  playTone(ctx, 440, 0.1, 'sine', 0.1)
  playTone(ctx, 554, 0.12, 'sine', 0.1, 0.07)
}

function playCycle() {
  const ctx = getAudioContext()
  if (!ctx) return
  playTone(ctx, 380, 0.08, 'sine', 0.08)
}

function playDelete() {
  const ctx = getAudioContext()
  if (!ctx) return
  playTone(ctx, 220, 0.15, 'sine', 0.1)
  playTone(ctx, 180, 0.12, 'sine', 0.08, 0.06)
}

export function playSound(type: SoundType, enabled = true) {
  if (!enabled) return
  switch (type) {
    case 'complete':
      playComplete()
      break
    case 'add':
      playAdd()
      break
    case 'cycle':
      playCycle()
      break
    case 'delete':
      playDelete()
      break
  }
}
