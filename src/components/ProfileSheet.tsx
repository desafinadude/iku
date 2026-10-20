import { useRef, useState } from 'react'
import { avatarFromFile, displayName } from '../lib'
import { MEMBER_COLORS, type Item, type Member } from '../types'
import type { Profile } from '../data/backend'
import { Avatar } from './Avatar'
import { Sheet } from './Sheet'
import { useInstall } from './InstallPrompt'

interface Props {
  me: Member
  members: Member[]
  items: Item[]
  welcome: boolean
  onSave: (profile: Profile) => void
  onClose: () => void
  onShowPerson: (email: string) => void
}

export function ProfileSheet({ me, members, items, welcome, onSave, onClose, onShowPerson }: Props) {
  const [name, setName] = useState(me.name ?? '')
  const [avatar, setAvatar] = useState(me.avatar)
  const [color, setColor] = useState(me.color)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const preview: Member = { ...me, name: name || me.name, avatar, color }
  const others = members.filter((m) => m.email !== me.email)
  const { mode: installMode, install } = useInstall()

  return (
    <Sheet
      title={welcome ? 'Welcome! Who are you?' : 'Your profile'}
      onClose={onClose}
      footer={
        <button className="primary-btn wide" disabled={!name.trim()} onClick={() => onSave({ name: name.trim(), avatar, color })}>
          Save
        </button>
      }
    >
      {welcome && <p className="muted" style={{ margin: 0 }}>Your name and picture show on everything you add, so the others know who found it.</p>}
      <div className="profile-row">
        <Avatar member={preview} size={72} />
        <div className="profile-photo-btns">
          <button type="button" className="secondary-btn" onClick={() => fileRef.current?.click()}>
            {avatar ? 'Change photo' : 'Add photo'}
          </button>
          {avatar && (
            <button type="button" className="text-btn" onClick={() => setAvatar(null)}>
              Remove
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={async (e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (!file) return
              try {
                setAvatar(await avatarFromFile(file))
                setPhotoError(null)
              } catch {
                setPhotoError('That image couldn’t be read. Try a JPEG or PNG.')
              }
            }}
          />
        </div>
      </div>
      {photoError && <p className="error">{photoError}</p>}
      <div className="field">
        <label htmlFor="p-name">Name</label>
        <input id="p-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="What the others call you" autoFocus={welcome} />
      </div>
      <fieldset className="group">
        <legend>Colour</legend>
        <div className="swatches">
          {MEMBER_COLORS.map((c) => (
            <button key={c} type="button" className={`swatch${(color ?? '') === c ? ' is-on' : ''}`} style={{ background: c }} aria-label={`Colour ${c}`} aria-pressed={color === c} onClick={() => setColor(c)} />
          ))}
        </div>
      </fieldset>
      {installMode && (
        <div className="group">
          <h3 className="group-title">This device</h3>
          {installMode === 'prompt' ? (
            <button type="button" className="secondary-btn" onClick={install}>
              Install Iku as an app
            </button>
          ) : (
            <p className="muted small" style={{ margin: 0 }}>
              To install on iPhone or iPad: open this page in Safari, tap <b>Share</b>, then <b>Add to Home Screen</b>.
            </p>
          )}
        </div>
      )}
      {others.length > 0 && (
        <div className="group">
          <h3 className="group-title">On this trip</h3>
          <ul className="member-list">
            {others.map((m) => {
              const count = items.filter((x) => x.createdBy === m.email).length
              return (
                <li key={m.email}>
                  <button type="button" className="member-row" onClick={() => onShowPerson(m.email)}>
                    <Avatar member={m} size={36} />
                    <span className="member-name">
                      <b>{displayName(m)}</b>
                      <span className="muted small">{m.name ? m.email : 'Hasn’t set a name yet'}</span>
                    </span>
                    <span className="muted small">{count} added</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </Sheet>
  )
}
