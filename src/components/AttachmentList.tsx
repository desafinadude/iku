import { useRef } from 'react'
import { formatSize } from '../lib'
import type { Attachment, Member } from '../types'
import { Avatar, memberFor } from './Avatar'
import { Icon, type IconName } from './Icon'

/** A file chosen for an entry that hasn't been saved yet (uploaded on save). */
export interface PendingFile {
  key: string
  file: File
}

interface Props {
  attachments: Attachment[]
  pending?: PendingFile[]
  members: Member[]
  offlineIds: Set<string>
  uploading?: boolean
  canAdd: boolean
  /** View mode: open and keep offline only; no adding or deleting. */
  readOnly?: boolean
  addLabel?: string
  emptyText?: string
  onAdd: (files: File[]) => void
  onRemovePending?: (key: string) => void
  onOpen: (a: Attachment) => void
  onDelete: (a: Attachment) => void
  onToggleOffline: (a: Attachment) => void
}

export function fileIcon(mime: string | null): IconName {
  return mime?.startsWith('image/') ? 'image' : 'file'
}

export function AttachmentList(props: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = [...(e.target.files ?? [])]
    e.target.value = ''
    if (files.length) props.onAdd(files)
  }
  const empty = !props.attachments.length && !props.pending?.length

  return (
    <div className="attachments">
      {empty && props.emptyText && <p className="muted small" style={{ margin: 0 }}>{props.emptyText}</p>}
      <ul className="file-list">
        {props.attachments.map((a) => {
          const who = memberFor(props.members, a.createdBy)
          const saved = props.offlineIds.has(a.id)
          return (
            <li key={a.id} className="file-row">
              <button type="button" className="file-main" onClick={() => props.onOpen(a)}>
                <span className={`file-icon${a.mime === 'application/pdf' ? ' is-pdf' : ''}`}>
                  <Icon name={fileIcon(a.mime)} size={20} />
                </span>
                <span className="file-text">
                  <b>{a.name}</b>
                  <span className="muted small">
                    {formatSize(a.size)}
                    {saved && <span className="saved-note"> · On this device</span>}
                  </span>
                </span>
                {who && <Avatar member={who} size={22} />}
              </button>
              <button
                type="button"
                className={`icon-btn file-action${saved ? ' is-saved' : ''}`}
                aria-label={saved ? `Remove offline copy of ${a.name}` : `Keep ${a.name} available offline`}
                aria-pressed={saved}
                title={saved ? 'Available offline (tap to remove)' : 'Make available offline'}
                onClick={() => props.onToggleOffline(a)}
              >
                <Icon name={saved ? 'offline' : 'download'} size={18} />
              </button>
              {!props.readOnly && (
              <button
                type="button"
                className="icon-btn file-action"
                aria-label={`Delete ${a.name}`}
                onClick={() => {
                  if (confirm(`Delete “${a.name}” for everyone?`)) props.onDelete(a)
                }}
              >
                <Icon name="trash" size={18} />
              </button>
              )}
            </li>
          )
        })}
        {props.pending?.map((p) => (
          <li key={p.key} className="file-row is-pending">
            <span className="file-main">
              <span className="file-icon">
                <Icon name={fileIcon(p.file.type)} size={20} />
              </span>
              <span className="file-text">
                <b>{p.file.name}</b>
                <span className="muted small">{formatSize(p.file.size)} · uploads when you save</span>
              </span>
            </span>
            <button type="button" className="icon-btn file-action" aria-label={`Don’t attach ${p.file.name}`} onClick={() => props.onRemovePending?.(p.key)}>
              <Icon name="close" size={18} />
            </button>
          </li>
        ))}
        {props.uploading && <li className="file-row is-pending muted small">Uploading…</li>}
      </ul>
      {props.canAdd && !props.readOnly && (
        <div className="file-add">
          <button type="button" className="secondary-btn" onClick={() => fileRef.current?.click()}>
            <Icon name="paperclip" size={16} /> {props.addLabel ?? 'Attach file'}
          </button>
          <button type="button" className="secondary-btn camera-btn" onClick={() => cameraRef.current?.click()}>
            <Icon name="camera" size={16} /> Photo
          </button>
          <input ref={fileRef} type="file" multiple hidden onChange={pick} />
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={pick} />
        </div>
      )}
      {!props.canAdd && !props.readOnly && <p className="muted small" style={{ margin: 0 }}>You’re offline. Files marked for offline use still open.</p>}
    </div>
  )
}
