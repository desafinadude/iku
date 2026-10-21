import { useDroppable } from '@dnd-kit/core'
import { useRef, useState, type ReactNode } from 'react'
import type { Attachment, Item, Member } from '../types'
import type { CardShow } from '../usePrefs'
import { Icon } from './Icon'
import { ItemCard } from './ItemCard'
import { Masonry } from './Masonry'

interface Props {
  ideas: Item[]
  members: Member[]
  attachments: Attachment[]
  totalIdeas: number
  onCapture: (text: string) => void
  /** Turns image files into picture cards. */
  onCaptureImages: (files: File[]) => void
  onOpen: (item: Item) => void
  /** Full-width Pinterest-style board (wide screens). */
  full?: boolean
  selectedId?: string | null
  /** Extra controls in the header (e.g. "Include planned"). */
  headExtra?: ReactNode
  show?: CardShow
  /** Tile size: 1 is normal; bigger means wider (and so fewer) columns. */
  zoom?: number
  /** Wide screens: the pane's width in px (from its resize handle). */
  width?: number
}

export function IdeasPane({ ideas, members, attachments, totalIdeas, onCapture, onCaptureImages, onOpen, full = false, selectedId = null, headExtra, show, width, zoom = 1 }: Props) {
  const [fileOver, setFileOver] = useState(false)
  const photoInput = useRef<HTMLInputElement>(null)
  const images = (list: FileList | null | undefined) => [...(list ?? [])].filter((f) => f.type.startsWith('image/'))
  const [text, setText] = useState('')
  const { setNodeRef, isOver } = useDroppable({ id: 'ideas' })

  const submit = (value: string) => {
    if (!value.trim()) return
    onCapture(value.trim())
    setText('')
  }

  return (
    <section
      aria-label="Ideas"
      className={`pane pane-ideas${full ? ' pane-ideas-full' : ''}${isOver || fileOver ? ' is-over' : ''}`}
      ref={setNodeRef}
      style={width ? { flexBasis: width } : undefined}
      // Image files dragged in from the desktop become picture cards.
      onDragOver={(e) => {
        if ([...e.dataTransfer.items].some((i) => i.kind === 'file')) {
          e.preventDefault()
          setFileOver(true)
        }
      }}
      onDragLeave={() => setFileOver(false)}
      onDrop={(e) => {
        const files = images(e.dataTransfer.files)
        setFileOver(false)
        if (!files.length) return
        e.preventDefault()
        onCaptureImages(files)
      }}
    >
      <div className="pane-head">
        <h2>
          Ideas <span className="muted" title={`${totalIdeas} unplanned`}>{full ? `${totalIdeas} unplanned` : totalIdeas}</span>
        </h2>
        <span className="spacer" />
        {headExtra}
      </div>
      <form
        className="capture"
        onSubmit={(e) => {
          e.preventDefault()
          submit(text)
        }}
      >
        <Icon name="link" size={18} />
        <label className="sr-only" htmlFor="capture">
          Paste a link or jot an idea
        </label>
        <input
          id="capture"
          placeholder="Paste a link, an image, or jot an idea…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onPaste={(e) => {
            const pastedImages = images(e.clipboardData.files)
            if (pastedImages.length) {
              e.preventDefault()
              onCaptureImages(pastedImages)
              return
            }
            const pasted = e.clipboardData.getData('text')
            if (!text && /^https?:\/\//i.test(pasted.trim())) {
              e.preventDefault()
              submit(pasted)
            }
          }}
        />
        <button type="button" className="capture-photo" aria-label="Add a photo card" title="Add a photo card" onClick={() => photoInput.current?.click()}>
          <Icon name="image" size={18} />
        </button>
        <input
          ref={photoInput}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            const files = images(e.target.files)
            e.target.value = ''
            if (files.length) onCaptureImages(files)
          }}
        />
      </form>
      {ideas.length ? (
        // Tile width: ~150px in the side pane, ~190px beside an open idea, ~230px on the full board, times the zoom.
        <Masonry minWidth={(full ? (selectedId ? 190 : 230) : 150) * zoom} gap={full ? (selectedId ? 12 : 14) : 10}>
          {ideas.map((item) => (
            <ItemCard key={item.id} item={item} members={members} variant="pin" selected={item.id === selectedId} show={show} fileCount={attachments.filter((a) => a.itemId === item.id).length} onOpen={onOpen} />
          ))}
        </Masonry>
      ) : (
        <p className="empty">Nothing here. Paste a link above to start collecting.</p>
      )}
    </section>
  )
}
