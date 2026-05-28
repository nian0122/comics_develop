/**
 * 全局封面加载串行队列 — 同一时刻只加载 1 张封面，
 * 上一张完成后延迟 DONE_DELAY_MS 再推进到下一张。
 */
const MAX_CONCURRENT = 1
const DONE_DELAY_MS = 200

let activeCount = 0
const pending: Array<() => void> = []
let delayTimer: ReturnType<typeof setTimeout> | null = null

function flush() {
  if (delayTimer !== null) return
  while (activeCount < MAX_CONCURRENT && pending.length > 0) {
    const run = pending.shift()!
    activeCount++
    run()
  }
}

function scheduleNext() {
  activeCount = Math.max(0, activeCount - 1)
  delayTimer = setTimeout(() => {
    delayTimer = null
    flush()
  }, DONE_DELAY_MS)
}

export function useCoverQueue() {
  let queuedRun: (() => void) | null = null
  let slotHeld = false

  function schedule(run: () => void) {
    queuedRun = () => {
      slotHeld = true
      run()
    }
    pending.push(queuedRun)
    flush()
  }

  function release() {
    if (!slotHeld) return
    slotHeld = false
    queuedRun = null
    scheduleNext()
  }

  function dispose() {
    if (slotHeld) {
      release()
    } else if (queuedRun) {
      const idx = pending.indexOf(queuedRun)
      if (idx !== -1) pending.splice(idx, 1)
      queuedRun = null
    }
  }

  return { schedule, release, dispose }
}
