import { DndContext, DragOverlay, MouseSensor, pointerWithin, rectIntersection, TouchSensor, useSensor, useSensors, type CollisionDetection, type DragEndEvent } from '@dnd-kit/core'
import { useEffect, useMemo, useState } from 'react'
import { Avatar, memberFor } from './components/Avatar'
import { DayPlan } from './components/DayPlan'
import { DaysBoard } from './components/DaysBoard'
import { DocsPane } from './components/DocsPane'
import { FileViewer } from './components/FileViewer'
import { HourView } from './components/HourView'
import { InstallPrompt } from './components/InstallPrompt'
import { ItemView } from './components/ItemView'
import { Lightbox } from './components/Lightbox'
import { MonthView } from './components/MonthView'
import { usePrefs } from './usePrefs'
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
import { displayTitle, domainOf, isUrl, matches, onDay, prepareUpload, tripDays, tripRange, uid } from './lib'
import { EMPTY_FILTERS, type Attachment, type Filters, type Item } from './types'
import { useMediaQuery } from './useMediaQuery'


// Drop on whatever is under the pointer (small calendar cells and hour rows need this);
// fall back to overlap when the pointer is between targets.
const collisions: CollisionDetection = (args) => {
  const hits = pointerWithin(args)
  return hits.length ? hits : rectIntersection(args)
}

type Tab = 'ideas' | 'days' | 'map' | 'docs'
type SheetState = { kind: 'item'; item: Item; isNew: boolean; /** View sheet to return to after editing. */ back?: string } | { kind: 'view'; id: string } | { kind: 'filters' } | { kind: 'profile'; welcome: boolean } | { kind: 'docs' } | null

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
    labels, saveLabels, deleteLabel, renameLabel, deleteTag,
    trip, items, members, attachments, me, error, setError, offlineSince, offlineIds, uploading,
    save, remove, moveTo, moveToSlot, saveProfile, upload, deleteAttachment, toggleOffline, fileUrl
  } = useTrip(backend, true)
  const [online, setOnline] = useState(() => navigator.onLine)
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
  const ideas = visible.filter((x) => !x.day).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const boardEntries = prefs.ideasIncludePlanned ? [...visible].sort((a, b) => b.createdAt.localeCompare(a.createdAt)) : ideas
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
    if (isUrl(text)) setSheet({ kind: 'item', item: blank({ url: text, title: domainOf(text) ?? '' }), isNew: true })
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

  const onDragEnd = (e: DragEndEvent) => {
    setDragging(null)
    const target = e.over?.id
    if (!target) return
    const id = String(e.active.id).split('@')[0]
    if (String(target).startsWith('slot:')) {
      const [, day, hour] = String(target).split(':')
      moveToSlot(id, day, `${hour}:00`)
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

  const viewSwitch = (
    <div className="seg seg-small view-switch" role="group" aria-label="Days view">
      {(
        [
          ['board', wide ? 'Columns' : 'List'],
          ['hours', 'Hours'],
          ['month', 'Month']
        ] as const
      ).map(([v, label]) => (
        <button key={v} type="button" className={prefs.daysView === v ? 'is-on' : ''} aria-pressed={prefs.daysView === v} onClick={() => setPrefs({ daysView: v })}>
          {label}
        </button>
      ))}
    </div>
  )
  const addAt = (day: string, time: string) => setSheet({ kind: 'item', item: blank({ day, time }), isNew: true })
  const hourView = (
    <HourView day={selectedDay} days={days} items={visible} prefs={prefs} viewSwitch={wide ? viewSwitch : undefined} onSelectDay={setSelectedDay} onOpen={open} onAddAt={addAt} />
  )
  const monthView = (
    <MonthView
      days={days}
      items={visible}
      prefs={prefs}
      selectedDay={selectedDay}
      viewSwitch={wide ? viewSwitch : undefined}
      onOpenDay={(d) => {
        setSelectedDay(d)
        setPrefs({ daysView: 'hours' })
      }}
      onOpen={open}
    />
  )

  const ideasPane = <IdeasPane ideas={ideas} members={members} attachments={attachments} totalIdeas={unplannedCount} onCapture={capture} onCaptureImages={captureImages} onOpen={open} />
  const mapPane = <MapPane items={visible} days={days} selectedDay={selectedDay} onSelectDay={setSelectedDay} onOpen={open} />

  return (
    <LabelsProvider tripId={trip.id} labels={labels} items={items}>
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
          {wide && (
            <div className="seg main-switch" role="group" aria-label="Main view">
              {(
                [
                  ['plan', 'Plan'],
                  ['ideas', 'Ideas']
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

        {(wide || tab === 'ideas' || tab === 'map') && <FilterBar filters={filters} items={items} onChange={setFilters} onMore={() => setSheet({ kind: 'filters' })} />}

        {error && (
          <div className="error-bar" role="alert">
            {error}
            <button className="text-btn" onClick={() => setError(null)}>
              Dismiss
            </button>
          </div>
        )}

        <DndContext sensors={sensors} collisionDetection={collisions} onDragStart={(e) => setDragging(items.find((x) => x.id === e.active.id) ?? null)} onDragEnd={onDragEnd} onDragCancel={() => setDragging(null)}>
          <main className="workspace">
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
                    <label className="check small-check">
                      <input type="checkbox" checked={prefs.ideasIncludePlanned} onChange={(e) => setPrefs({ ideasIncludePlanned: e.target.checked })} /> Include planned
                    </label>
                  }
                />
                {activeEntry && (
                  <section className="pane pane-detail" aria-label={displayTitle(activeEntry)}>
                    <div className="detail-bar">
                      <button className="primary-btn" onClick={() => edit(activeEntry)}>
                        Edit
                      </button>
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
            ) : wide ? (
              <>
                {ideasPane}
                {prefs.daysView === 'hours' ? (
                hourView
              ) : prefs.daysView === 'month' ? (
                monthView
              ) : (
                <DaysBoard
                  days={days}
                  items={visible}
                  members={members}
                  attachments={attachments}
                  prefs={prefs}
                  viewSwitch={viewSwitch}
                  selectedDay={selectedDay}
                  onSelectDay={setSelectedDay}
                  onOpen={open}
                  onAdd={(day) => setSheet({ kind: 'item', item: blank({ day }), isNew: true })}
                />
              )}
                {mapPane}
              </>
            ) : tab === 'ideas' ? (
              ideasPane
            ) : tab === 'days' ? (
              <div className="days-tab">
              <div className="days-tab-bar">
                {viewSwitch}
                <button className="icon-btn" aria-label="Filters and display options" onClick={() => setSheet({ kind: 'filters' })}>
                  <Icon name="filter" size={18} />
                </button>
              </div>
              {prefs.daysView === 'hours' ? (
                hourView
              ) : prefs.daysView === 'month' ? (
                monthView
              ) : (
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
                  onShowIdeas={() => setTab('ideas')}
                />
              )}
            </div>
            ) : tab === 'docs' ? (
              <section aria-label="Docs" className="pane pane-docs">
                <div className="pane-head">
                  <h2>Docs</h2>
                </div>
                <DocsPane {...docsProps} />
              </section>
            ) : (
              mapPane
            )}
          </main>
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
                  <button className="primary-btn wide" onClick={() => edit(entry)}>
                    Edit
                  </button>
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
