import { useEffect, useState, type ImgHTMLAttributes } from 'react'
import { isCoverRef } from '../data/backend'
import { backend } from '../data/instance'

// Signed links last an hour; reuse them for 50 minutes so cards don't flicker or re-request.
const cache = new Map<string, { url: string; until: number }>()
const pending = new Map<string, Promise<string>>()

function resolve(ref: string): Promise<string> {
  const hit = cache.get(ref)
  if (hit && hit.until > Date.now()) return Promise.resolve(hit.url)
  let p = pending.get(ref)
  if (!p) {
    p = backend
      .coverUrl(ref)
      .then((url) => {
        cache.set(ref, { url, until: Date.now() + 50 * 60_000 })
        return url
      })
      .finally(() => pending.delete(ref))
    pending.set(ref, p)
  }
  return p
}

/** The displayable URL for an entry image: web images as-is, uploaded ones via a signed link. */
export function useImageSrc(imageUrl: string | null | undefined) {
  const [src, setSrc] = useState<string | null>(() => (imageUrl && !isCoverRef(imageUrl) ? imageUrl : (imageUrl && cache.get(imageUrl)?.url) || null))
  useEffect(() => {
    if (!imageUrl) return setSrc(null)
    if (!isCoverRef(imageUrl)) return setSrc(imageUrl)
    let live = true
    resolve(imageUrl)
      .then((u) => live && setSrc(u))
      .catch(() => live && setSrc(null))
    return () => {
      live = false
    }
  }, [imageUrl])
  return src
}

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & { imageUrl: string | null | undefined; onBroken?: () => void }

/** An entry's image (web or uploaded). Hides itself if the image can't load. */
export function CardImage({ imageUrl, onBroken, ...rest }: Props) {
  const src = useImageSrc(imageUrl)
  const [broken, setBroken] = useState(false)
  useEffect(() => setBroken(false), [src])
  if (!src || broken) return null
  return (
    <img
      {...rest}
      src={src}
      alt={rest.alt ?? ''}
      loading={rest.loading ?? 'lazy'}
      referrerPolicy="no-referrer"
      draggable={false}
      onError={() => {
        setBroken(true)
        onBroken?.()
      }}
    />
  )
}
