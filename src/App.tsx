import { DndContext, DragOverlay, MouseSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { useEffect, useMemo, useState } from 'react'
import { Avatar, memberFor } from './components/Avatar'
import { DayPlan } from './components/DayPlan'
import { DaysBoard } from './components/DaysBoard'
import { FilterBar } from './components/FilterBar'
import { FilterSheet } from './components/FilterSheet'
import { Icon, type IconName } from './components/Icon'
import { IdeasPane } from './components/IdeasPane'
import { ItemSheet } from './components/ItemSheet'
import { MapPane } from './components/MapPane'
import { ProfileSheet } from './components/ProfileSheet'
import { Unlock } from './components/Unlock'
import { createBackend } from './data/backend'
import { useTrip } from './data/useTrip'
import { domainOf, isUrl, matches, tripDays, tripRange, uid } from './lib'
import { EMPTY_FILTERS, type Filters, type Item } from './types'
import { useMediaQuery } from './useMediaQuery'

const backend = createBackend()

type Tab = 'ideas' | 'days' | 'map'
type SheetState = { kind: 'item'; item: Item; isNew: boolean } | { kind: 'filters' } | { kind: 'profile'; welcome: boolean } | null

export default function App() {
  const [unlocked, setUnlocked] = useState<boolean | null>(null)
  useEffect(() => {
    backend.isUnlocked().then(setUnlocked)
  }, [])

  if (unlocked === null) return null
  if (!unlocked)
    return (
      <Unlock
        asksEmail={backend.asksEmail}
        onUnlock={async (pw, email) => {
          await backend.unlock(pw, email)
          setUnlocked(true)
        }}
      />
    )
  return <Planner />
}

function Planner() {
  const { trip, items, members, me, error, setError, save, remove, moveTo, saveProfile } = useTrip(backend, true)
  const wide = useMediaQuery('(min-width: 900px)')
  const [tab, setTab] = useState<Tab>('ideas')
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [sheet, setSheet] = useState<SheetState>(null)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [dragging, setDragging] = useState<Item | null>(null)

  const sensors = useSensors(useSensor(MouseSensor, { activationConstraint: { distance: 6 } }), useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 6 } }))

  const days = useMemo(() => (trip ? tripDays(trip) : []), [trip])
  useEffect(() => {
    if (!days.length || (selectedDay && days.includes(selectedDay))) return
    const today = new Date().toISOString().slice(0, 10)
    setSelectedDay(days.includes(today) ? today : days[0])
  }, [days, selectedDay])

  const allTags = useMemo(() => {
    const counts = new Map<string, number>()
    items.forEach((x) => x.tags.forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1)))
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([t]) => t)
  }, [items])

  const meMember = memberFor(members, me)
  // First visit with a real login: ask for a name so others can see who added what.
  const [welcomed, setWelcomed] = useState(false)
  useEffect(() => {
    if (welcomed || backend.mode !== 'supabase' || !members.length || !meMember) return
    setWelcomed(true)
    if (!meMember.name) setSheet({ kind: 'profile', welcome: true })
  }, [members, meMember, welcomed])

  const visible = useMemo(() => items.filter((x) => matches(x, filters)), [items, filters])
  const ideas = visible.filter((x) => !x.day).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const unplannedCount = items.filter((x) => !x.day).length

  if (!trip || !selectedDay) {
    return <div className="loading">{error ?? 'Loading trip…'}</div>
  }

  const blank = (patch: Partial<Item> = {}): Item => ({
    id: uid(),
    tripId: trip.id,
    title: '',
    url: null,
    imageUrl: null,
    note: null,
    type: 'Sight',
    tags: [],
    day: null,
    time: null,
    booked: false,
    bookingRef: null,
    place: null,
    lat: null,
    lng: null,
    sort: Date.now(),
    createdAt: new Date().toISOString(),
    createdBy: me || null,
    updatedBy: null,
    updatedAt: null,
    ...patch
  })

  const capture = (text: string) => {
    if (isUrl(text)) setSheet({ kind: 'item', item: blank({ url: text, title: domainOf(text) ?? '' }), isNew: true })
    else save(blank({ title: text }))
  }
  const open = (item: Item) => setSheet({ kind: 'item', item, isNew: false })

  const onDragEnd = (e: DragEndEvent) => {
    setDragging(null)
    const target = e.over?.id
    if (!target) return
    const id = String(e.active.id)
    if (target === 'ideas') moveTo(id, null)
    else if (String(target).startsWith('day:')) moveTo(id, String(target).slice(4))
  }

  const ideasPane = <IdeasPane ideas={ideas} members={members} totalIdeas={unplannedCount} onCapture={capture} onOpen={open} />
  const mapPane = <MapPane items={visible} days={days} selectedDay={selectedDay} onSelectDay={setSelectedDay} onOpen={open} />

  return (
    <div className={`app ${wide ? 'is-wide' : 'is-narrow'}`}>
      <header className="top-bar">
        <div className="brand">
          <span className="brand-mark">
            <Icon name="pin" size={18} strokeWidth={2.2} />
          </span>
          <span className="brand-name">iku</span>
        </div>
        <div className="trip-title">
          <b>{trip.name}</b>
          <span className="muted">{tripRange(trip)}</span>
        </div>
        <span className="spacer" />
        {meMember && (
          <button className="member-stack" aria-label="Trip members and your profile" onClick={() => setSheet({ kind: 'profile', welcome: false })}>
            {[meMember, ...members.filter((m) => m.email !== me)].slice(0, 4).map((m) => (
              <Avatar key={m.email} member={m} size={32} ring />
            ))}
          </button>
        )}
        {backend.mode === 'local' && <span className="mode-badge" title="Data is saved in this browser only. Add Supabase keys to share.">Local</span>}
        {backend.mode === 'supabase' && (
          <button className="icon-btn" aria-label="Lock trip" onClick={() => backend.lock().then(() => location.reload())}>
            <Icon name="lock" />
          </button>
        )}
      </header>

      {(wide || tab !== 'days') && <FilterBar filters={filters} items={items} topTags={allTags.slice(0, 4)} onChange={setFilters} onMore={() => setSheet({ kind: 'filters' })} />}

      {error && (
        <div className="error-bar" role="alert">
          {error}
          <button className="text-btn" onClick={() => setError(null)}>
            Dismiss
          </button>
        </div>
      )}

      <DndContext sensors={sensors} onDragStart={(e) => setDragging(items.find((x) => x.id === e.active.id) ?? null)} onDragEnd={onDragEnd} onDragCancel={() => setDragging(null)}>
        <main className="workspace">
          {wide ? (
            <>
              {ideasPane}
              <DaysBoard days={days} items={visible} members={members} selectedDay={selectedDay} onSelectDay={setSelectedDay} onOpen={open} onAdd={(day) => setSheet({ kind: 'item', item: blank({ day }), isNew: true })} />
              {mapPane}
            </>
          ) : tab === 'ideas' ? (
            ideasPane
          ) : tab === 'days' ? (
            <DayPlan tripName={trip.name} days={days} items={visible} members={members} selectedDay={selectedDay} unplannedCount={unplannedCount} onSelectDay={setSelectedDay} onOpen={open} onShowIdeas={() => setTab('ideas')} />
          ) : (
            mapPane
          )}
        </main>
        <DragOverlay>{dragging && <div className="card drag-overlay">{dragging.title}</div>}</DragOverlay>
      </DndContext>

      {!wide && (
        <>
          {tab === 'ideas' && (
            <button className="fab" onClick={() => setSheet({ kind: 'item', item: blank(), isNew: true })}>
              <Icon name="plus" size={22} strokeWidth={2.2} /> Add idea
            </button>
          )}
          <nav className="tab-bar" aria-label="Main">
            {(
              [
                ['ideas', 'Ideas', 'ideas'],
                ['days', 'Days', 'days'],
                ['map', 'Map', 'map']
              ] as [Tab, string, IconName][]
            ).map(([id, label, icon]) => (
              <button key={id} className={tab === id ? 'is-on' : ''} aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)}>
                <Icon name={icon} size={22} />
                {label}
              </button>
            ))}
          </nav>
        </>
      )}

      {sheet?.kind === 'item' && (
        <ItemSheet
          key={sheet.item.id}
          item={sheet.item}
          isNew={sheet.isNew}
          days={days}
          allTags={allTags}
          members={members}
          onUnfurl={backend.unfurl}
          onClose={() => setSheet(null)}
          onSave={(item) => {
            save(item)
            setSheet(null)
          }}
          onDelete={(id) => {
            remove(id)
            setSheet(null)
          }}
        />
      )}
      {sheet?.kind === 'filters' && <FilterSheet filters={filters} items={items} allTags={allTags} members={members} onChange={setFilters} onClose={() => setSheet(null)} />}
      {sheet?.kind === 'profile' && meMember && (
        <ProfileSheet
          me={meMember}
          members={members}
          items={items}
          welcome={sheet.welcome}
          onClose={() => setSheet(null)}
          onSave={(profile) => {
            saveProfile(profile)
            setSheet(null)
          }}
          onShowPerson={(email) => {
            setFilters({ ...EMPTY_FILTERS, people: [email] })
            setSheet(null)
          }}
        />
      )}
    </div>
  )
}
