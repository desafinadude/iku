import { displayName, initials, memberColor } from '../lib'
import { onColor } from '../colors'
import type { Member } from '../types'

export function Avatar({ member, size = 28, ring = false }: { member: Member; size?: number; ring?: boolean }) {
  const style = { width: size, height: size, fontSize: Math.round(size * 0.4), background: memberColor(member), color: onColor(memberColor(member)) }
  return (
    <span className={`avatar${ring ? ' avatar-ring' : ''}`} style={style} title={displayName(member)}>
      {member.avatar ? <img src={member.avatar} alt="" /> : initials(member)}
    </span>
  )
}

/** Looks up a member by email; unknown emails still get a usable stand-in. */
export function memberFor(members: Member[], email: string | null): Member | null {
  if (!email) return null
  return members.find((m) => m.email === email) ?? { email, name: null, avatar: null, color: null }
}
