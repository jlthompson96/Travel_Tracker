import type { Trip } from '../../../../types/travel';

interface TripPicturesProps {
  trip: Trip;
  onSelect: (index: number) => void;
}

const TripPictures = ({ trip, onSelect }: TripPicturesProps) => {
  if (trip.photos.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {trip.photos.map((photo, index) => (
        <button
          key={photo.id}
          type="button"
          onClick={() => onSelect(index)}
          className="group aspect-square overflow-hidden rounded border border-slate/15"
        >
          <img
            src={photo.url}
            alt={photo.name || `${trip.destination} photo`}
            className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
          />
        </button>
      ))}
    </div>
  );
};

export default TripPictures;
