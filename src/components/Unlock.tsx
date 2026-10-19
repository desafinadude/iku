import { useState } from 'react'
import { Icon } from './Icon'

export function Unlock({ onUnlock }: { onUnlock: (password: string) => Promise<void> }) {
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  return (
    <main className="unlock">
      <div className="brand">
        <span className="brand-mark big">
          <Icon name="pin" size={24} strokeWidth={2.2} />
        </span>
        <span className="brand-name big">iku</span>
      </div>
      <form
        className="unlock-form"
        onSubmit={async (e) => {
          e.preventDefault()
          setBusy(true)
          setError(null)
          try {
            await onUnlock(password)
          } catch (err) {
            setError((err as Error).message)
          } finally {
            setBusy(false)
          }
        }}
      >
        <label htmlFor="trip-pass">Trip password</label>
        <div className="input-with-btn">
          <input id="trip-pass" type={show ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
          <button type="button" className="secondary-btn" onClick={() => setShow((v) => !v)}>
            {show ? 'Hide' : 'Show'}
          </button>
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button className="primary-btn wide" disabled={!password || busy}>
          {busy ? 'Opening…' : 'Open trip'}
        </button>
      </form>
      <p className="muted small">Add Iku to your home screen to keep your bookings handy offline.</p>
    </main>
  )
}
