import { displayTitle } from '../lib'
import type { Attachment, Item, Member } from '../types'
import { AttachmentList } from './AttachmentList'
import { fileIcon } from './AttachmentList'
import { Icon } from './Icon'

interface Props {
  attachments: Attachment[]
  items: Item[]
  members: Member[]
  offlineIds: Set<string>
  online: boolean
  uploading: boolean
  onUpload: (files: File[]) => void
  onOpenFile: (a: Attachment) => void
  onDeleteFile: (a: Attachment) => void
  onToggleOffline: (a: Attachment) => void
  onOpenItem: (item: Item) => void
}

/** Trip-wide documents, plus every file attached to an entry, in one place. */
export function DocsPane(props: Props) {
  const tripDocs = props.attachments.filter((a) => !a.itemId)
  const byItem = props.items
    .map((item) => ({ item, files: props.attachments.filter((a) => a.itemId === item.id) }))
    .filter((g) => g.files.length)
    .sort((a, b) => (a.item.day ?? '9999').localeCompare(b.item.day ?? '9999'))
  const offlineCount = props.attachments.filter((a) => props.offlineIds.has(a.id)).length

  return (
    <div className="docs">
      <section className="group">
        <h3 className="group-title">Trip documents</h3>
        <AttachmentList
          attachments={tripDocs}
          members={props.members}
          offlineIds={props.offlineIds}
          uploading={props.uploading}
          canAdd={props.online}
          addLabel="Add document"
          emptyText="Passports, insurance, visas: anything for the whole trip."
          onAdd={props.onUpload}
          onOpen={props.onOpenFile}
          onDelete={props.onDeleteFile}
          onToggleOffline={props.onToggleOffline}
        />
      </section>
      <section className="group">
        <h3 className="group-title">Attached to entries</h3>
        {byItem.length === 0 && <p className="muted small" style={{ margin: 0 }}>Files added to an entry show up here too.</p>}
        <ul className="docs-groups">
          {byItem.map(({ item, files }) => (
            <li key={item.id}>
              <button type="button" className="docs-entry" onClick={() => props.onOpenItem(item)}>
                <b>{displayTitle(item)}</b>
                <Icon name="chevronRight" size={16} />
              </button>
              <ul className="file-list compact">
                {files.map((a) => (
                  <li key={a.id}>
                    <button type="button" className="file-main" onClick={() => props.onOpenFile(a)}>
                      <span className={`file-icon${a.mime === 'application/pdf' ? ' is-pdf' : ''}`}>
                        <Icon name={fileIcon(a.mime)} size={18} />
                      </span>
                      <span className="file-text">
                        <b>{a.name}</b>
                        {props.offlineIds.has(a.id) && <span className="saved-note small">On this device</span>}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>
      <p className="muted small" style={{ margin: 0 }}>
        <Icon name="offline" size={14} /> {offlineCount} {offlineCount === 1 ? 'file is' : 'files are'} saved on this device for offline use. Tap
        the download button on a file to keep it.
      </p>
    </div>
  )
}
