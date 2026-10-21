import { useState } from 'react'
import { addDays, dayLabel, daysBetween, displayTitle } from '../lib'
import type { Item, Trip } from '../types'
import { Sheet } from './Sheet'

interface Props {
  trip: Trip
  items: Item[]
  /** Saves the new name and dates; `unplan` are entries that start outside them (they go back to Ideas). */
  onSave: (patch: { name: string; startDate: string; endDate: string }, unplan: Item[], clamp: Item[]) => void
  onClose: () => void
}

/**
 * The trip's name and dates. Making the trip longer touches nothing else. Making it shorter never deletes
 * anything: entries on days that drop off go back to Ideas, and stays running past the new end are cut short
 * to it. The sheet lists them before you save.
 */
export function TripSheet({ trip, items, onSave, onClose }: Props) {
  const [name, setName] = useState(trip.name)
  const [start, setStart] = useState(trip.startDate)
  const [end, setEnd] = useState(trip.endDate)
  const valid = !!name.trim() && !!start && !!end && start <= end
  const nights = valid ? daysBetween(start, end) + 1 : 0
  const unplan = valid ? items.filter((x) => x.day && (x.day < start || x.day > end)) : []
  const clamp = valid ? items.filter((x) => x.day && x.day >= start && x.day <= end && x.endDay && x.endDay > end) : []
  const fmt = (d: string) => {
    const l = dayLabel(d)
    return `${l.dow} ${l.num} ${l.month}`
  }
  return (
    <Sheet
      title="Trip"
      onClose={onClose}
      footer={
        <button
          className="primary-btn wide"
          disabled={!valid}
          onClick={() => {
            onSave({ name: name.trim(), startDate: start, endDate: end }, unplan, clamp)
            onClose()
          }}
        >
          Save
        </button>
      }
    >
      <div className="field">
        <label htmlFor="trip-name">Name</label>
        <input id="trip-name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="trip-start">First day</label>
          <input id="trip-start" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="trip-end">Last day</label>
          <input id="trip-end" type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} />
        </div>
      </div>
      <div className="trip-quick">
        <button type="button" className="chip chip-small" onClick={() => setEnd(addDays(end, 1))}>
          + a day at the end
        </button>
        <button type="button" className="chip chip-small" onClick={() => setStart(addDays(start, -1))}>
          + a day at the start
        </button>
      </div>
      <p className="muted small" style={{ margin: 0 }}>
        {valid ? `${nights} days: ${fmt(start)} – ${fmt(end)}.` : 'The last day can’t be before the first.'}
      </p>

      {(unplan.length > 0 || clamp.length > 0) && (
        <div className="trip-warning" role="status">
          {unplan.length > 0 && (
            <>
              <b>
                {unplan.length} {unplan.length === 1 ? 'entry is' : 'entries are'} on days outside the new dates. {unplan.length === 1 ? 'It' : 'They'}’ll go back to Ideas, not be deleted:
              </b>
              <ul>
                {unplan.slice(0, 8).map((x) => (
                  <li key={x.id}>
                    {displayTitle(x)} <span className="muted">· {fmt(x.day!)}</span>
                  </li>
                ))}
                {unplan.length > 8 && <li className="muted">and {unplan.length - 8} more</li>}
              </ul>
            </>
          )}
          {clamp.length > 0 && (
            <>
              <b>
                {clamp.length} {clamp.length === 1 ? 'stay runs' : 'stays run'} past the new last day and will end on {fmt(end)}:
              </b>
              <ul>
                {clamp.map((x) => (
                  <li key={x.id}>{displayTitle(x)}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </Sheet>
  )
}
