import { useDroppable } from '@dnd-kit/core'
import { useState } from 'react'
import type { Item, Member } from '../types'
import { Icon } from './Icon'
import { ItemCard } from './ItemCard'

interface Props {
  ideas: Item[]
  members: Member[]
  totalIdeas: number
  onCapture: (text: string) => void
  onOpen: (item: Item) => void
}

export function IdeasPane({ ideas, members, totalIdeas, onCapture, onOpen }: Props) {
  const [text, setText] = useState('')
  const { setNodeRef, isOver } = useDroppable({ id: 'ideas' })

  const submit = (value: string) => {
    if (!value.trim()) return
    onCapture(value.trim())
    setText('')
  }

  return (
    <section aria-label="Ideas" className={`pane pane-ideas${isOver ? ' is-over' : ''}`} ref={setNodeRef}>
      <div className="pane-head">
        <h2>
          Ideas <span className="muted">{totalIdeas} unplanned</span>
        </h2>
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
          placeholder="Paste a link or jot an idea…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onPaste={(e) => {
            const pasted = e.clipboardData.getData('text')
            if (!text && /^https?:\/\//i.test(pasted.trim())) {
              e.preventDefault()
              submit(pasted)
            }
          }}
        />
      </form>
      <div className="masonry">
        {ideas.map((item) => (
          <ItemCard key={item.id} item={item} members={members} variant="pin" onOpen={onOpen} />
        ))}
        {ideas.length === 0 && <p className="empty">Nothing here. Paste a link above to start collecting.</p>}
      </div>
    </section>
  )
}
