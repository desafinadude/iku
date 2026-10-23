import { DndContext, DragOverlay, MouseSensor, pointerWithin, rectIntersection, TouchSensor, useSensor, useSensors, type CollisionDetection, type DragEndEvent, type DragMoveEvent } from '@dnd-kit/core'
import { useEffect, useMemo, useState } from 'react'
import { CardShowMenu, DAY_ORDERS, DRAG_HINT, IDEA_ORDERS, SortMenu, ColumnsControl } from './components/CardControls'
import { DropHintContext, type CardZone } from './dnd'
import { Avatar, memberFor } from './components/Avatar'
import { useImageSrc } from './components/CardImage'
import { colorCss, firstColor, onColor, PANEL_DEFAULTS } from './colors'
import { DayPlan } from './components/DayPlan'
import type { FoundPlace } from './maps/places'
import { DaySheet } from './components/DaySheet'
import { TripSheet } from './components/TripSheet'
import { DaySelect, IdeaPicker } from './components/DayAssign'
import { DaysBoard } from './components/DaysBoard'
import { DocsPane } from './components/DocsPane'
import { FileViewer } from './components/FileViewer'
import { InstallPrompt } from './components/InstallPrompt'
import { ItemView } from './components/ItemView'
import { Lightbox } from './components/Lightbox'
import { PANE_DEFAULTS, usePrefs } from './usePrefs'
import { Resizer } from './components/Resizer'
import { LabelsManager } from './components/LabelsManager'
import { LabelsProvider } from './labels/LabelsContext'
import { Sheet } from './components/Sheet'
import { FilterBar } from './components/FilterBar'
import { FilterSheet } from './components/FilterSheet'
import { Icon, type IconName } from './components/Icon'
import { IdeasPane } from './components/IdeasPane'
import { ItemSheet } from './components/ItemSheet'
import { MapPane } from './components/MapPane'
import { ProfileSheet } from './components/ProfileSheet'
import { Unlock } from './components/Unlock'
import { isCoverRef } from './data/backend'
import { backend } from './data/instance'
import { useTrip } from './data/useTrip'
import { bandOf, displayTitle, domainOf, isUrl, itemsForDay, partOfTime, matches, onDay, orderIdeas, prepareUpload, tripDays, tripRange, uid } from './lib'
import { EMPTY_FILTERS, type Attachment, type DayPart, type Filters, type Item } from './types'
import { useMediaQuery } from './useMediaQuery'


// Drop on whatever is under the pointer (small calendar cells and hour rows need this);
// fall back to overlap when the pointer is between targets.
// Over a card, the card wins (so cards can be arranged); a card is never its own target.
const collisions: CollisionDetection = (args) => {
  const self = 'card:' + String(args.active.id).split('@')[0]
  const isCard = (id: string | number) => String(id).startsWith('card:')
  const hits = pointerWithin(args).filter((h) => h.id !== self)
  const cards = hits.filter((h) => isCard(h.id))
  if (cards.length) return cards
  // A band of a day beats the day column around it.
  const parts = hits.filter((h) => String(h.id).startsWith('part:'))
  if (parts.length) return parts
  return hits.length ? hits : rectIntersection(args).filter((h) => !isCard(h.id))
}

/** Where the pointer is during a drag (mouse or touch). */
function pointerY(e: { activatorEvent: Event | null; delta: { y: number } }) {
  const a = e.activatorEvent as (MouseEvent & TouchEvent) | null
  const y = a?.touches?.length ? a.touches[0].clientY : (a?.clientY ?? 0)
  return y + e.delta.y
}

type Tab = 'ideas' | 'days' | 'map' | 'docs'
type SheetState = { kind: 'item'; item: Item; isNew: boolean; /** View sheet to return to after editing. */ back?: string } | { kind: 'view'; id: string } | { kind: 'filters' } | { kind: 'profile'; welcome: boolean } | { kind: 'docs' } | { kind: 'day'; day: string } | { kind: 'pick'; day: string } | { kind: 'trip' } | null

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
  const {
    dayInfos, saveDays, saveBackground, savePanels, saveTrip,
    labels, saveLabels, deleteLabel, renameLabel, deleteTag,
    trip, items, members, attachments, me, error, setError, offlineSince, offlineIds, uploading,
    save, remove, moveTo, placeIn, arrange, saveProfile, upload, deleteAttachment, toggleOffline, fileUrl
  } = useTrip(backend, true)
  const [online, setOnline] = useState(() => navigator.onLine)
  // The trip's page background: a colour, or a photo (lightly washed so the planner stays readable).
  const bg = trip?.background ?? null
  const bgIsColour = !!bg && /^#[0-9a-f]{6}(>#[0-9a-f]{6})?$/i.test(bg)
  const bgImage = useImageSrc(bg && !bgIsColour ? bg : null)
  const pageStyle = bgIsColour
    ? { background: colorCss(bg) }
    : bgImage
      ? { backgroundImage: `linear-gradient(rgba(244, 245, 241, .3), rgba(244, 245, 241, .3)), url("${bgImage.replace(/"/g, '%22')}")` }
      : undefined
  // Each panel's colour (and the text colour that reads on it), as CSS variables for the panes.
  const panelVars = Object.fromEntries(
    (Object.keys(PANEL_DEFAULTS) as (keyof typeof PANEL_DEFAULTS)[]).flatMap((key) => {
      const c = trip?.panels?.[key] ?? PANEL_DEFAULTS[key]
      return [
        [`--panel-${key}`, colorCss(c)],
        [`--panel-${key}-fg`, onColor(firstColor(c))]
      ]
    })
  )
  useEffect(() => {
    const on = () => setOnline(navigator.onLine)
    window.addEventListener('online', on)
    window.addEventListener('offline', on)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', on)
    }
  }, [])
  const canEdit = online && !offlineSince
  const [viewing, setViewing] = useState<Attachment | null>(null)
  const [prefs, setPrefs] = usePrefs()
  /** The entry open beside the wide ideas board. */
  const [activeId, setActiveId] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState<string | null>(null)
  /** Tags manager; opens on top of other sheets so an entry being edited isn't lost. */
  const [managing, setManaging] = useState(false)
  const wide = useMediaQuery('(min-width: 900px)')
  // Home-screen shortcuts open a tab directly (./?tab=days).
  const [tab, setTab] = useState<Tab>(() => {
    const t = new URLSearchParams(location.search).get('tab')
    return t === 'days' || t === 'map' || t === 'docs' ? t : 'ideas'
  })
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [sheet, setSheet] = useState<SheetState>(null)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [dragging, setDragging] = useState<Item | null>(null)
  const [dropHint, setDropHint] = useState<{ id: string; after: boolean } | null>(null)
  /** Wide screens: the days, hours or month view takes the whole workspace. */
  const [daysMax, setDaysMax] = useState(false)
  /** Pane widths while a resize handle is being dragged (saved to prefs on release). */
  const [liveWidth, setLiveWidth] = useState<{ ideas?: number; map?: number; detail?: number }>({})

  useEffect(() => {
    if (!daysMax) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !document.querySelector('.sheet, .menu') && setDaysMax(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [daysMax])

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

  // Where place searches should look first: the selected day's stops, else the whole trip.
  const near = useMemo(() => {
    const located = items.filter((x) => x.lat != null && x.lng != null)
    const today = located.filter((x) => selectedDay && onDay(x, selectedDay))
    const pts = today.length ? today : located
    if (!pts.length) return null
    return { lat: pts.reduce((n, x) => n + x.lat!, 0) / pts.length, lng: pts.reduce((n, x) => n + x.lng!, 0) / pts.length }
  }, [items, selectedDay])

  const visible = useMemo(() => items.filter((x) => matches(x, filters)), [items, filters])
  const ideas = orderIdeas(visible.filter((x) => !x.day), prefs.ideasOrder)
  const boardEntries = prefs.ideasIncludePlanned ? orderIdeas(visible, prefs.ideasOrder) : ideas
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
    tags: [],
    day: null,
    endDay: null,
    time: null,
    endTime: null,
    booked: false,
    pinned: false,
    chapter: false,
    people: [],
    part: null,
    bookingRef: null,
    place: null,
    placeId: null,
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
    // A link straight to a picture becomes a picture card.
    if (isUrl(text) && /\.(jpe?g|png|webp|gif|avif)(\?|#|$)/i.test(text)) save(blank({ imageUrl: text }))
    else if (isUrl(text)) setSheet({ kind: 'item', item: blank({ url: text, title: domainOf(text) ?? '' }), isNew: true })
    else save(blank({ title: text }))
  }
  // Tapping an entry shows it read-only; Edit opens the editor. On the wide ideas board it opens beside the grid.
  const ideasBoard = wide && prefs.mainView === 'ideas'
  const activeEntry = ideasBoard && activeId ? (items.find((x) => x.id === activeId) ?? null) : null
  const open = (item: Item) => (ideasBoard ? setActiveId(item.id) : setSheet({ kind: 'view', id: item.id }))
  const edit = (item: Item) => setSheet({ kind: 'item', item, isNew: false, back: sheet?.kind === 'view' ? sheet.id : undefined })
  /** Pasted or dropped images become picture cards straight away. */
  const captureImages = async (files: File[]) => {
    for (const file of files) {
      try {
        const ref = await backend.uploadCover(trip.id, await prepareUpload(file))
        await save(blank({ imageUrl: ref }))
      } catch (e) {
        setError((e as Error).message)
      }
    }
  }

  const onDragMove = (e: DragMoveEvent) => {
    const over = e.over
    if (!over || !String(over.id).startsWith('card:')) return setDropHint(null)
    const id = String(over.id).slice(5)
    const after = pointerY(e) > over.rect.top + over.rect.height / 2
    setDropHint((h) => (h?.id === id && h.after === after ? h : { id, after }))
  }
  const onDragEnd = (e: DragEndEvent) => {
    setDragging(null)
    setDropHint(null)
    const target = e.over?.id
    if (!target) return
    const id = String(e.active.id).split('@')[0]
    if (String(target).startsWith('card:')) {
      // Dropped on a card: put it just before or after that card, and switch that list to custom order.
      const zone = e.over!.data.current as CardZone
      const targetId = String(target).slice(5)
      const after = pointerY(e) > e.over!.rect.top + e.over!.rect.height / 2
      const item = items.find((x) => x.id === id)
      if (!item) return
      if (zone.zone === 'day' && zone.part !== undefined) {
        // Day-parts view: the entry joins the target's part (keeping an exact time only if it fits there).
        const keepTime = !!item.time && zone.part !== null && partOfTime(item.time) === zone.part
        const samePart = zone.part === bandOf(item, zone.day)
        const patch = samePart ? {} : { part: keepTime ? null : zone.part, time: keepTime ? item.time : null, endTime: keepTime ? item.endTime : null }
        arrange(id, itemsForDay(items, zone.day, prefs.dayOrder).filter((x) => x.day === zone.day), targetId, after, zone.day, patch)
        // Re-ordering within a band of a day column switches the days to your own order, as in plain columns.
        if (samePart && item.day === zone.day && prefs.dayOrder !== 'custom') setPrefs({ dayOrder: 'custom' })
      } else if (zone.zone === 'day') {
        arrange(id, itemsForDay(items, zone.day, prefs.dayOrder).filter((x) => x.day === zone.day), targetId, after, zone.day)
        if (prefs.dayOrder !== 'custom') setPrefs({ dayOrder: 'custom' })
      } else {
        const list = orderIdeas(ideasBoard && prefs.ideasIncludePlanned ? items : items.filter((x) => !x.day), prefs.ideasOrder)
        arrange(id, list, targetId, after, list.some((x) => x.id === id) ? item.day : null)
        if (prefs.ideasOrder !== 'custom') setPrefs({ ideasOrder: 'custom' })
      }
    } else if (String(target).startsWith('part:')) {
      const [, day, part] = String(target).split(':')
      placeIn(id, day, part === 'none' ? null : (part as DayPart))
    } else if (target === 'ideas') moveTo(id, null)
    else if (String(target).startsWith('day:')) moveTo(id, String(target).slice(4))
  }

  const docsProps = {
    attachments,
    items,
    members,
    offlineIds,
    online: canEdit,
    uploading: uploading > 0,
    onUpload: (files: File[]) => upload(null, files),
    onOpenFile: setViewing,
    onDeleteFile: deleteAttachment,
    onToggleOffline: toggleOffline,
    onOpenItem: (item: Item) => setSheet({ kind: 'view', id: item.id })
  }

  const daysControls = (
    <>
      <CardShowMenu label="Days" show={prefs.daysShow} onChange={(v) => setPrefs({ daysShow: v })} layout={prefs.daysLayout} onLayout={(v) => setPrefs({ daysLayout: v })} />
      <SortMenu label="Days" order={prefs.dayOrder} orders={wide ? DAY_ORDERS : DAY_ORDERS.map((o) => (o.value === 'custom' ? { ...o, label: 'Custom (as arranged)' } : o))} onOrder={(v) => setPrefs({ dayOrder: v })} hint={wide ? DRAG_HINT : undefined} />
    </>
  )
  const ideasControls = (
    <>
      {/* A list is one column in the side pane; the full board can still spread it over several. */}
      {ideasBoard ? <ColumnsControl cols={prefs.boardCols} onChange={(n) => setPrefs({ boardCols: n })} /> : prefs.ideasLayout === 'grid' && <ColumnsControl cols={prefs.ideasCols} onChange={(n) => setPrefs({ ideasCols: n })} />}
      <CardShowMenu label="Ideas" show={prefs.ideasShow} onChange={(v) => setPrefs({ ideasShow: v })} layout={prefs.ideasLayout} onLayout={(v) => setPrefs({ ideasLayout: v })} />
      <SortMenu label="Ideas" order={prefs.ideasOrder} orders={IDEA_ORDERS} onOrder={(v) => setPrefs({ ideasOrder: v })} hint={DRAG_HINT} />
    </>
  )
  // Wide plan view: show or hide the map, and give the days view the whole workspace.
  const maxToggle = wide ? (
    <>
      {prefs.mainView === 'plan' && !daysMax && (
        <button className="icon-btn head-btn" aria-label={prefs.planIdeas ? 'Hide the ideas' : 'Show the ideas'} title={prefs.planIdeas ? 'Hide the ideas' : 'Show the ideas'} aria-pressed={prefs.planIdeas} onClick={() => setPrefs({ planIdeas: !prefs.planIdeas })}>
          <Icon name="ideas" size={16} />
        </button>
      )}
      {prefs.mainView === 'plan' && !daysMax && (
        <button className="icon-btn head-btn" aria-label={prefs.planMap ? 'Hide the map' : 'Show the map'} title={prefs.planMap ? 'Hide the map' : 'Show the map'} aria-pressed={prefs.planMap} onClick={() => setPrefs({ planMap: !prefs.planMap })}>
          <Icon name="map" size={16} />
        </button>
      )}
    <button className="icon-btn head-btn" aria-label={daysMax ? 'Exit full screen' : 'Use the whole screen'} title={daysMax ? 'Exit full screen (Esc)' : 'Use the whole screen'} aria-pressed={daysMax} onClick={() => setDaysMax((v) => !v)}>
      <Icon name={daysMax ? 'shrink' : 'expand'} size={16} />
    </button>
    </>
  ) : undefined
  const editDay = (day: string) => setSheet({ kind: 'day', day })

  const widths = { ideas: liveWidth.ideas ?? prefs.ideasWidth, map: liveWidth.map ?? prefs.mapWidth, detail: liveWidth.detail ?? prefs.detailWidth }
  const resizer = (key: 'ideas' | 'map' | 'detail', label: string, pane: 'left' | 'right', min: number, maxShare: number) => (
    <Resizer
      label={label}
      width={widths[key]}
      min={min}
      maxShare={maxShare}
      pane={pane}
      defaultWidth={PANE_DEFAULTS[key]}
      onLive={(w) => setLiveWidth((x) => ({ ...x, [key]: w }))}
      onCommit={(w) => {
        setPrefs({ [`${key}Width`]: w })
        setLiveWidth((x) => ({ ...x, [key]: undefined }))
      }}
    />
  )
  const ideasPane = <IdeasPane width={wide ? widths.ideas : undefined} ideas={ideas} show={prefs.ideasShow} layout={prefs.ideasLayout} columns={prefs.ideasLayout === 'list' ? 1 : prefs.ideasCols} headExtra={ideasControls} members={members} attachments={attachments} totalIdeas={unplannedCount} onCapture={capture} onCaptureImages={captureImages} onOpen={open} />
  /** A place tapped on the map, saved as an idea (with a copy of its photo, as Google's photo links expire). */
  const savePlace = async (p: FoundPlace) => {
    let imageUrl: string | null = null
    if (p.photo) {
      try {
        const blob = await (await fetch(p.photo)).blob()
        imageUrl = await backend.uploadCover(trip.id, await prepareUpload(new File([blob], 'place.jpg', { type: blob.type || 'image/jpeg' })))
      } catch {
        imageUrl = p.photo
      }
    }
    await save(blank({ title: p.name, place: p.address ? `${p.name}, ${p.address}` : p.name, lat: p.lat, lng: p.lng, placeId: p.placeId, imageUrl }))
  }
  const mapProps = { prefs, onPrefs: setPrefs, onSavePlace: savePlace }
  const mapPane = <MapPane width={wide ? widths.map : undefined} items={visible} days={days} selectedDay={selectedDay} onSelectDay={setSelectedDay} onOpen={open} {...mapProps} />

  return (
    <LabelsProvider tripId={trip.id} labels={labels} items={items} days={dayInfos}>
      <div className={`app ${wide ? 'is-wide' : 'is-narrow'}${pageStyle ? ' has-bg' : ''}${bgImage && !bgIsColour ? ' has-bg-image' : ''}`} style={{ ...panelVars, ...pageStyle }}>
        <header className="top-bar">
          <div className="brand">
            <span className="brand-mark">
              <Icon name="pin" size={18} strokeWidth={2.2} />
            </span>
            <span className="brand-name">iku</span>
          </div>
          <button type="button" className="trip-title" title="Trip name and dates" onClick={() => setSheet({ kind: 'trip' })}>
            <b>{trip.name}</b>
            <span className="muted">{tripRange(trip)}</span>
          </button>
          {wide && (
            <div className="seg main-switch" role="group" aria-label="Main view">
              {(
                [
                  ['plan', 'Plan'],
                  ['ideas', 'Ideas'],
                  ['map', 'Map']
                ] as const
              ).map(([v, label]) => (
                <button key={v} type="button" className={prefs.mainView === v ? 'is-on' : ''} aria-pressed={prefs.mainView === v} onClick={() => setPrefs({ mainView: v })}>
                  {label}
                </button>
              ))}
            </div>
          )}
          <span className="spacer" />
          {wide && (
            <button className="secondary-btn docs-btn" onClick={() => setSheet({ kind: 'docs' })}>
              <Icon name="paperclip" size={16} /> Docs
              {attachments.length > 0 && <span className="chip-count">{attachments.length}</span>}
            </button>
          )}
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

        <InstallPrompt />
        {(offlineSince || !online) && (
          <div className="offline-bar" role="status">
            <Icon name="offline" size={16} />
            {offlineSince
              ? `Offline: showing what was synced ${new Date(offlineSince).toLocaleString('en', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}. Files saved on this device still open.`
              : 'You’re offline. Changes won’t save until you’re back online.'}
          </div>
        )}

        {(wide || tab === 'ideas' || tab === 'map') && <FilterBar filters={filters} items={items} members={members} onChange={setFilters} onMore={() => setSheet({ kind: 'filters' })} />}

        {error && (
          <div className="error-bar" role="alert">
            {error}
            <button className="text-btn" onClick={() => setError(null)}>
              Dismiss
            </button>
          </div>
        )}

        <DndContext sensors={sensors} collisionDetection={collisions} onDragStart={(e) => setDragging(items.find((x) => x.id === e.active.id) ?? null)} onDragMove={onDragMove} onDragEnd={onDragEnd} onDragCancel={() => {
          setDragging(null)
          setDropHint(null)
        }}>
          <DropHintContext.Provider value={dropHint}>
          <main className={`workspace${daysMax && wide && prefs.mainView === 'plan' ? ' is-max' : ''}${wide ? '' : ' tab-' + tab}`}>
            {ideasBoard ? (
              <>
                <IdeasPane
                  full
                  ideas={boardEntries}
                  selectedId={activeEntry?.id ?? null}
                  members={members}
                  attachments={attachments}
                  totalIdeas={unplannedCount}
                  onCapture={capture}
                  onCaptureImages={captureImages}
                  onOpen={open}
                  headExtra={
                    <>
                      <label className="check small-check">
                        <input type="checkbox" checked={prefs.ideasIncludePlanned} onChange={(e) => setPrefs({ ideasIncludePlanned: e.target.checked })} /> Include planned
                      </label>
                      {ideasControls}
                    </>
                  }
                  show={prefs.ideasShow}
                  layout={prefs.ideasLayout}
                  columns={prefs.boardCols}
                />
                {activeEntry && resizer('detail', 'Resize the open idea', 'right', 320, 0.7)}
                {activeEntry && (
                  <section className="pane pane-detail" style={{ flexBasis: widths.detail }} aria-label={displayTitle(activeEntry)}>
                    <div className="detail-bar">
                      <button className="primary-btn" onClick={() => edit(activeEntry)}>
                        Edit
                      </button>
                      <DaySelect item={activeEntry} days={days} onMove={(day) => moveTo(activeEntry.id, day)} />
                      <PinButton item={activeEntry} onToggle={() => save({ ...activeEntry, pinned: !activeEntry.pinned })} />
                      <span className="spacer" />
                      <button className="icon-btn" aria-label="Close" onClick={() => setActiveId(null)}>
                        <Icon name="close" />
                      </button>
                    </div>
                    <div className="detail-scroll">
                      <ItemView
                        item={activeEntry}
                        members={members}
                        attachments={attachments.filter((a) => a.itemId === activeEntry.id)}
                        offlineIds={offlineIds}
                        onOpenFile={setViewing}
                        onToggleOffline={toggleOffline}
                        onViewImage={() => setLightbox(activeEntry.imageUrl)}
                      />
                    </div>
                  </section>
                )}
              </>
            ) : wide && prefs.mainView === 'map' ? (
              <MapPane full items={visible} days={days} selectedDay={selectedDay} onSelectDay={setSelectedDay} onOpen={open} {...mapProps} />
            ) : wide ? (
              <>
                {!daysMax && prefs.planIdeas && ideasPane}
                {!daysMax && prefs.planIdeas && resizer('ideas', 'Resize the ideas', 'left', 200, 0.5)}
                <DaysBoard
                  days={days}
                  items={visible}
                  members={members}
                  attachments={attachments}
                  prefs={prefs}
                  controls={daysControls}
                  maxToggle={maxToggle}
                  selectedDay={selectedDay}
                  onSelectDay={setSelectedDay}
                  onOpen={open}
                  onAdd={(day) => setSheet({ kind: 'item', item: blank({ day }), isNew: true })}
                  onEditDay={editDay}
                />
                {!daysMax && prefs.planMap && resizer('map', 'Resize the map', 'right', 240, 0.6)}
                {!daysMax && prefs.planMap && mapPane}
              </>
            ) : tab === 'ideas' ? (
              ideasPane
            ) : tab === 'days' ? (
                <DayPlan
                  tripName={trip.name}
                  days={days}
                  items={visible}
                  members={members}
                  attachments={attachments}
                  prefs={prefs}
                  selectedDay={selectedDay}
                  unplannedCount={unplannedCount}
                  onSelectDay={setSelectedDay}
                  onOpen={open}
                  onShowIdeas={() => setSheet({ kind: 'pick', day: selectedDay })}
                  onEditDay={editDay}
                  onAdd={(day) => setSheet({ kind: 'item', item: blank({ day }), isNew: true })}
                  controls={
                    <>
                      {daysControls}
                      <button className="icon-btn head-btn" aria-label="Filters and display options" onClick={() => setSheet({ kind: 'filters' })}>
                        <Icon name="filter" size={16} />
                      </button>
                    </>
                  }
                />
            ) : tab === 'docs' ? (
              <section aria-label="Docs" className="pane pane-docs">
                <div className="pane-head">
                  <h2>Docs</h2>
                </div>
                <DocsPane {...docsProps} />
              </section>
            ) : (
              <MapPane full items={visible} days={days} selectedDay={selectedDay} onSelectDay={setSelectedDay} onOpen={open} {...mapProps} />
            )}
          </main>
          </DropHintContext.Provider>
          <DragOverlay>{dragging && <div className="card drag-overlay">{displayTitle(dragging)}</div>}</DragOverlay>
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
                  ['map', 'Map', 'map'],
                  ['docs', 'Docs', 'paperclip']
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
            onManageLabels={() => setManaging(true)}
          onUploadCover={(file) => backend.uploadCover(trip.id, file)}
          onDiscardCover={(ref) => isCoverRef(ref) && backend.deleteCover(ref).catch(() => {})}
            defaultDay={selectedDay}
            near={near}
            attachments={attachments.filter((a) => a.itemId === sheet.item.id)}
            offlineIds={offlineIds}
            online={canEdit}
            uploading={uploading > 0}
            onUpload={(files) => upload(sheet.item.id, files)}
            onOpenFile={setViewing}
            onDeleteFile={deleteAttachment}
            onToggleOffline={toggleOffline}
            onClose={() => setSheet(sheet.back ? { kind: 'view', id: sheet.back } : null)}
            onSave={async (item, pendingFiles) => {
              setSheet(sheet.back ? { kind: 'view', id: sheet.back } : null)
              // Files need the entry to exist first.
              if ((await save(item)) && pendingFiles.length) upload(item.id, pendingFiles)
            }}
            onDelete={(id) => {
              remove(id)
              setSheet(null)
            }}
          />
        )}
        {sheet?.kind === 'filters' && <FilterSheet
            filters={filters}
            items={items}
            allTags={allTags}
            members={members}
            onManage={() => {
              setSheet(null)
              setManaging(true)
            }}
            prefs={prefs}
            onPrefs={setPrefs}
            onChange={setFilters} onClose={() => setSheet(null)} />}
        {sheet?.kind === 'profile' && meMember && (
          <ProfileSheet
            background={trip.background ?? null}
            onBackground={saveBackground}
            panels={trip.panels ?? {}}
            onPanels={savePanels}
            onUploadCover={(file) => backend.uploadCover(trip.id, file)}
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
        {sheet?.kind === 'view' &&
          (() => {
            const entry = items.find((x) => x.id === sheet.id)
            if (!entry) return null
            return (
              <Sheet
                title={entry.day ? 'Plan' : 'Idea'}
                onClose={() => setSheet(null)}
                footer={
                  <>
                    <DaySelect item={entry} days={days} onMove={(day) => moveTo(entry.id, day)} />
                    <PinButton item={entry} onToggle={() => save({ ...entry, pinned: !entry.pinned })} />
                    <button className="primary-btn wide" onClick={() => edit(entry)}>
                      Edit
                    </button>
                  </>
                }
              >
                <ItemView
                  item={entry}
                  members={members}
                  attachments={attachments.filter((a) => a.itemId === entry.id)}
                  offlineIds={offlineIds}
                  onOpenFile={setViewing}
                  onToggleOffline={toggleOffline}
                  onViewImage={() => setLightbox(entry.imageUrl)}
                />
              </Sheet>
            )
          })()}
        {sheet?.kind === 'pick' && <IdeaPicker day={sheet.day} ideas={orderIdeas(items.filter((x) => !x.day), prefs.ideasOrder)} onAdd={(id) => moveTo(id, sheet.day)} onClose={() => setSheet(null)} />}
        {sheet?.kind === 'trip' && (
          <TripSheet
            trip={trip}
            items={items}
            onClose={() => setSheet(null)}
            onSave={async (patch, unplan, clamp) => {
              // Save the dates first; only then move entries that fall outside them (nothing is deleted).
              if (!(await saveTrip(patch))) return
              unplan.forEach((x) => save({ ...x, day: null, endDay: null, time: null, endTime: null, part: null }))
              clamp.forEach((x) => save({ ...x, endDay: patch.endDate === x.day ? null : patch.endDate }))
            }}
          />
        )}
        {sheet?.kind === 'day' && <DaySheet day={sheet.day} days={days} onSave={saveDays} onAddTitleCard={(day, title) => setSheet({ kind: 'item', item: blank({ day, title, chapter: true }), isNew: true })} onClose={() => setSheet(null)} />}
        {lightbox && <Lightbox imageUrl={lightbox} onClose={() => setLightbox(null)} />}
        {sheet?.kind === 'docs' && (
          <Sheet title="Docs" onClose={() => setSheet(null)}>
            <DocsPane {...docsProps} />
          </Sheet>
        )}
        {managing && (
          <LabelsManager
            tripId={trip.id}
            items={items}
            onSave={saveLabels}
            onDelete={deleteLabel}
            onRename={renameLabel}
            onDeleteTag={deleteTag}
            onClose={() => setManaging(false)}
          />
        )}
        {viewing && <FileViewer attachment={viewing} getUrl={fileUrl} onClose={() => setViewing(null)} />}
      </div>
    </LabelsProvider>
  )
}

/** Pins an entry to the top of its day (or of the ideas), or unpins it. */
function PinButton({ item, onToggle }: { item: Item; onToggle: () => void }) {
  return (
    <button className={`secondary-btn pin-btn${item.pinned ? ' is-on' : ''}`} aria-pressed={item.pinned} onClick={onToggle} title={item.pinned ? 'Unpin' : `Keep at the top of ${item.day ? 'its day' : 'the ideas'}`}>
      <Icon name="pushpin" size={16} /> {item.pinned ? 'Pinned' : 'Pin'}
    </button>
  )
}
