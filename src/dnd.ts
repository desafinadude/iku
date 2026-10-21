import type { DayPart } from './types'
import { createContext } from 'react'

/** Where a dragged card would land: before or after the card it is over. */
export const DropHintContext = createContext<{ id: string; after: boolean } | null>(null)

/** What a card's drop target sits in: the ideas list or a day column. */
/** In the day-parts view a day card also carries its part (null: All day); in columns it has none. */
export type CardZone = { zone: 'ideas' } | { zone: 'day'; day: string; part?: DayPart | null }
