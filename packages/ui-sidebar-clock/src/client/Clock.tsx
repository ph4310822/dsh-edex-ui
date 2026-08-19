/**
 * The brand-row clock: current date + time, ticking every second. Uses the
 * theme alias tokens so it matches whichever palette is active (including the
 * terminal theme).
 */
import { useEffect, useState } from 'react'
import css from './Clock.module.css'

/** The sidebar brand-row clock. */
export function Clock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => { clearInterval(timer) }
  }, [])
  return (
    <div className={css.clock} data-testid="sidebar-clock">
      <span className={css.date}>
        {now.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
      </span>
      <span className={css.time}>{now.toLocaleTimeString()}</span>
    </div>
  )
}
