import { useDroppable } from '@dnd-kit/core'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { Attachment, Item, Member } from '../types'
import type { CardShow } from '../usePrefs'
import { clipboardImages } from '../lib'
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
  /** Tiles, or a list with the picture beside the text. */
  layout?: 'grid' | 'list'
  /** How many columns of tiles. */
  columns?: number
  /** Wide screens: the pane's width in px (from its resize handle). */
  width?: number
}

export function IdeasPane({ ideas, members, attachments, totalIdeas, onCapture, onCaptureImages, onOpen, full = false, selectedId = null, headExtra, show, width, layout = 'grid', columns = 2 }: Props) {
  const [fileOver, setFileOver] = useState(false)
  const photoInput = useRef<HTMLInputElement>(null)
  const images = (list: FileList | null | undefined) => [...(list ?? [])].filter((f) => f.type.startsWith('image/'))
  const [text, setText] = useState('')
  const { setNodeRef, isOver } = useDroppable({ id: 'ideas' })

  // Paste anywhere (not in a field, with nothing open): images become picture cards, a link starts an idea.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t?.closest('input, textarea, [contenteditable="true"]') || document.querySelector('.sheet')) return
      const { files, url } = clipboardImages(e.clipboardData)
      const text = e.clipboardData?.getData('text').trim() ?? ''
      if (files.length) onCaptureImages(files)
      else if (url) onCapture(url)
      else if (/^https?:\/\//i.test(text)) onCapture(text)
      else return
      e.preventDefault()
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [onCapture, onCaptureImages])

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
            const { files: pastedImages, url } = clipboardImages(e.clipboardData)
            if (pastedImages.length) {
              e.preventDefault()
              onCaptureImages(pastedImages)
              return
            }
            if (url && !e.clipboardData.getData('text').trim()) {
              e.preventDefault()
              submit(url)
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
        <Masonry columns={columns} gap={layout === 'list' ? 8 : full ? (selectedId ? 12 : 14) : 10}>
          {ideas.map((item) => (
            <ItemCard key={item.id} item={item} members={members} variant="pin" row={layout === 'list'} selected={item.id === selectedId} show={show} fileCount={attachments.filter((a) => a.itemId === item.id).length} onOpen={onOpen} />
          ))}
        </Masonry>
      ) : (
        <p className="empty">Nothing here. Paste a link above to start collecting.</p>
      )}
    </section>
  )
}
