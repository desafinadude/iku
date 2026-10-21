import { displayName } from '../lib'
import type { Member } from '../types'
import { Avatar, memberFor } from './Avatar'

/** The people on an entry as tag-like badges: their face and first name. */
export function PeopleBadges({ people, members, small = false }: { people: string[] | undefined; members: Member[]; small?: boolean }) {
  if (!people?.length) return null
  return (
    <>
      {people.map((email) => {
        const m = memberFor(members, email)!
        return (
          <span key={email} className={`person-badge${small ? ' is-small' : ''}`} title={displayName(m)}>
            <Avatar member={m} size={small ? 16 : 18} />
            {displayName(m).split(' ')[0]}
          </span>
        )
      })}
    </>
  )
}
