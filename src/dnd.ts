import { createContext } from 'react'

/** Where a dragged card would land: before or after the card it is over. */
export const DropHintContext = createContext<{ id: string; after: boolean } | null>(null)

/** What a card's drop target sits in: the ideas list or a day column. */
export type CardZone = { zone: 'ideas' } | { zone: 'day'; day: string }
