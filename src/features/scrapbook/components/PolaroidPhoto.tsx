import { useMemo } from 'react';
import { PhotoImage } from '../../../components/PhotoImage';
import type { TripPhoto } from '../../../types/travel';
import { getPolaroidTilt, getWashiTapeStyle } from '../utils/scrapbookLayout';

interface PolaroidPhotoProps {
  photo: TripPhoto;
  index: number;
  tripId: string;
  destination: string;
  onSelect: (index: number) => void;
  size?: 'sm' | 'md' | 'lg';
  caption?: string;
  showTape?: boolean;
}

export function PolaroidPhoto({
  photo,
  index,
  tripId,
  destination,
  onSelect,
  size = 'md',
  caption,
  showTape = true,
}: PolaroidPhotoProps) {
  const tilt = useMemo(() => getPolaroidTilt(tripId, photo.id, index), [tripId, photo.id, index]);
  const tape = useMemo(() => getWashiTapeStyle(`${tripId}-${photo.id}`), [tripId, photo.id]);

  const cleanCaption = caption || photo.name || destination;

  const sizeClasses = {
    sm: 'w-40 sm:w-48 p-2.5 pb-6 text-[10px]',
    md: 'w-52 sm:w-64 p-3 pb-8 text-xs',
    lg: 'w-64 sm:w-80 p-4 pb-10 text-sm',
  }[size];

  // Alternates which corner gets the washi tape
  const tapePositionClass = index % 2 === 0 ? '-top-3 left-4' : '-top-3 right-4';

  return (
    <div
      className="relative shrink-0 select-none transition-all duration-300 hover:z-20"
      style={{
        transform: `rotate(${tilt}deg)`,
      }}
    >
      {/* Washi Tape Strip */}
      {showTape && (
        <div
          aria-hidden="true"
          className={`absolute z-10 h-4 w-14 sm:h-5 sm:w-16 ${tapePositionClass} ${tape.bgClass} shadow-sm backdrop-blur-[1px]`}
          style={{
            transform: `rotate(${tape.rotation}deg)`,
            clipPath: 'polygon(0% 10%, 5% 0%, 95% 0%, 100% 10%, 98% 90%, 95% 100%, 5% 100%, 2% 90%)',
          }}
        />
      )}

      {/* Polaroid Card */}
      <button
        type="button"
        onClick={() => onSelect(index)}
        aria-label={`View photo: ${cleanCaption}`}
        className={`group flex flex-col items-center rounded-sm border border-slate/15 bg-white shadow-md transition-all duration-200 hover:rotate-0 hover:scale-[1.03] hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-brass ${sizeClasses}`}
      >
        {/* Photo Box */}
        <div className="relative aspect-square w-full overflow-hidden rounded-xs bg-slate/10 shadow-inner">
          <PhotoImage
            photo={photo}
            alt={cleanCaption}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        </div>

        {/* Polaroid Caption Chin */}
        <div className="mt-2.5 flex w-full flex-col items-center justify-center px-1">
          <span className="line-clamp-1 max-w-full font-mono font-medium tracking-tight text-slate/80">
            {cleanCaption}
          </span>
        </div>
      </button>
    </div>
  );
}

