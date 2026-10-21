import { useRef, useState } from 'react'
import { avatarFromFile, displayName, isUrl, prepareUpload } from '../lib'
import { CardImage } from './CardImage'
import { Icon } from './Icon'
import { ColorField } from './ColorField'
import type { Item, Member } from '../types'
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
  /** The trip's shared page background: a colour, an image reference or URL, or null. */
  background: string | null
  onBackground: (background: string | null) => void
  onUploadCover: (file: File) => Promise<string>
}

export function ProfileSheet({ me, members, items, welcome, onSave, onClose, onShowPerson, background, onBackground, onUploadCover }: Props) {
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
        <ColorField label="Your colour" value={color} onChange={(c) => c && setColor(c)} />
      </fieldset>
      <TripBackground value={background} onChange={onBackground} onUploadCover={onUploadCover} />
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

const isColour = (v: string | null) => !!v && /^#[0-9a-f]{6}(>#[0-9a-f]{6})?$/i.test(v)

/** The page background everyone on the trip sees: a colour, or a photo (uploaded or by link). Saves straight away. */
function TripBackground({ value, onChange, onUploadCover }: { value: string | null; onChange: (v: string | null) => void; onUploadCover: (file: File) => Promise<string> }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [link, setLink] = useState('')
  const image = value && !isColour(value) ? value : null
  return (
    <fieldset className="group">
      <legend>Trip background</legend>
      <span className="muted small">Everyone on the trip sees this behind the planner.</span>
      {image && (
        <div className="sheet-image bg-preview">
          <CardImage imageUrl={image} loading="eager" />
          <div className="sheet-image-actions">
            <button type="button" className="chip" onClick={() => onChange(null)}>
              <Icon name="close" size={15} /> Remove
            </button>
          </div>
        </div>
      )}
      <div className="image-empty">
        <button type="button" className="secondary-btn" disabled={busy} onClick={() => fileRef.current?.click()}>
          <Icon name="image" size={16} /> {busy ? 'Uploading…' : image ? 'Change photo' : 'Use a photo'}
        </button>
        <input
          className="image-link-input"
          type="url"
          placeholder="or paste an image link"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && isUrl(link.trim())) {
              e.preventDefault()
              onChange(link.trim())
              setLink('')
            }
          }}
          onBlur={() => {
            if (isUrl(link.trim())) {
              onChange(link.trim())
              setLink('')
            }
          }}
        />
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (!file) return
          setBusy(true)
          setError(null)
          try {
            onChange(await onUploadCover(await prepareUpload(file)))
          } catch (err) {
            setError((err as Error).message)
          } finally {
            setBusy(false)
          }
        }}
      />
      {error && <p className="error">{error}</p>}
      <ColorField label="Colour" value={isColour(value) ? value : null} onChange={onChange} none="No background" gradient />
    </fieldset>
  )
}
