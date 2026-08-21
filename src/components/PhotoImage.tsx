import { useState } from 'react';
import { ImageOff } from 'lucide-react';
import type { TripPhoto } from '../types/travel';

/**
 * A trip photo that degrades to a caption instead of the browser's broken-image
 * glyph. Build-time mirroring (scripts/fetch-notion-data.mjs) is what keeps
 * these URLs alive, but a photo can still fail to load: the dev proxy serves
 * Notion's one-hour signed URLs directly, a mirror can fail mid-build, and
 * formats like HEIC only decode in Safari.
 */
export function PhotoImage({
  photo,
  className,
  fallbackClassName = '',
  alt,
  loading = 'lazy',
}: {
  photo: TripPhoto;
  /** Applied to the <img>; the fallback fills the same box. */
  className: string;
  fallbackClassName?: string;
  alt: string;
  loading?: 'lazy' | 'eager';
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        role="img"
        aria-label={`${alt} (unavailable)`}
        className={`flex flex-col items-center justify-center gap-1 bg-surface/60 p-2 text-center ${className} ${fallbackClassName}`}
      >
        <ImageOff size={16} className="shrink-0 text-slate/40" aria-hidden />
        {photo.name && (
          <span className="line-clamp-2 break-all font-mono text-[10px] leading-tight text-slate/60">{photo.name}</span>
        )}
      </div>
    );
  }

  return (
    <img
      src={photo.url}
      alt={alt}
      loading={loading}
      decoding="async"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
