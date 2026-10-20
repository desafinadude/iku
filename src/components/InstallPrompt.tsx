import { useEffect, useState } from 'react'
import { Icon } from './Icon'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISSED = 'iku:install-dismissed'

export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

// Chrome fires beforeinstallprompt once, possibly before React mounts: keep it for later.
let deferred: BeforeInstallPromptEvent | null = null
const listeners = new Set<() => void>()
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  deferred = e as BeforeInstallPromptEvent
  listeners.forEach((l) => l())
})
window.addEventListener('appinstalled', () => {
  deferred = null
  listeners.forEach((l) => l())
})

/** Whether the app can be installed here, and how (a native prompt, or iPhone's Share menu). */
export function useInstall() {
  const [, force] = useState(0)
  useEffect(() => {
    const l = () => force((n) => n + 1)
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  }, [])
  const mode: 'prompt' | 'ios' | null = isStandalone() ? null : deferred ? 'prompt' : isIos() ? 'ios' : null
  const install = async () => {
    if (!deferred) return
    await deferred.prompt()
    await deferred.userChoice
    deferred = null
    force((n) => n + 1)
  }
  return { mode, install }
}

/** A small banner offering to install the app on this device; dismissible. */
export function InstallPrompt() {
  const { mode, install } = useInstall()
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISSED) === '1'
    } catch {
      return false
    }
  })
  const [showIosHelp, setShowIosHelp] = useState(false)
  if (!mode || dismissed) return null
  const dismiss = () => {
    setDismissed(true)
    try {
      localStorage.setItem(DISMISSED, '1')
    } catch {
      /* ignore */
    }
  }
  return (
    <div className="install-banner" role="region" aria-label="Install the app">
      <img src={`${import.meta.env.BASE_URL}icons/icon-192.png`} alt="" width={36} height={36} />
      <div className="install-text">
        <b>Install Iku on this device</b>
        {mode === 'ios' && showIosHelp ? (
          <span className="small">
            Tap <b>Share</b> <ShareGlyph /> in Safari’s toolbar, then <b>Add to Home Screen</b>.
          </span>
        ) : (
          <span className="small muted">Opens full screen, works offline with your saved files.</span>
        )}
      </div>
      {mode === 'prompt' && (
        <button className="primary-btn install-btn" onClick={install}>
          Install
        </button>
      )}
      {mode === 'ios' && !showIosHelp && (
        <button className="primary-btn install-btn" onClick={() => setShowIosHelp(true)}>
          How?
        </button>
      )}
      <button className="icon-btn install-close" aria-label="Not now" onClick={dismiss}>
        <Icon name="close" size={16} />
      </button>
    </div>
  )
}

function ShareGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="Share icon" role="img" style={{ verticalAlign: '-2px' }}>
      <path d="M12 3v12" />
      <path d="M8 7l4-4 4 4" />
      <path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1" />
    </svg>
  )
}
