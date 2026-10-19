import { useState } from 'react'
import { Icon } from './Icon'

interface Props {
  asksEmail: boolean
  onUnlock: (password: string, email: string) => Promise<void>
}

export function Unlock({ asksEmail, onUnlock }: Props) {
  const [email, setEmail] = useState('')
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
            await onUnlock(password, email)
          } catch (err) {
            setError((err as Error).message)
          } finally {
            setBusy(false)
          }
        }}
      >
        {asksEmail && (
          <>
            <label htmlFor="trip-email">Email</label>
            <input id="trip-email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
          </>
        )}
        <label htmlFor="trip-pass">{asksEmail ? 'Password' : 'Trip password'}</label>
        <div className="input-with-btn">
          <input id="trip-pass" type={show ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus={!asksEmail} />
          <button type="button" className="secondary-btn" onClick={() => setShow((v) => !v)}>
            {show ? 'Hide' : 'Show'}
          </button>
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button className="primary-btn wide" disabled={!password || (asksEmail && !email) || busy}>
          {busy ? 'Opening…' : 'Open trip'}
        </button>
      </form>
      <p className="muted small">Add Iku to your home screen to keep your bookings handy offline.</p>
    </main>
  )
}
