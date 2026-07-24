import type { Trip } from '../../../../types/travel';

interface TripPicturesProps {
  trip: Trip;
}

const TripPictures = ({ trip }: TripPicturesProps) => {
  if (trip.photos.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {trip.photos.map((photo) => (
        <a
          key={photo.id}
          href={photo.url}
          target="_blank"
          rel="noreferrer"
          className="group aspect-square overflow-hidden rounded border border-slate/15"
        >
          <img
            src={photo.url}
            alt={photo.name || `${trip.destination} photo`}
            className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
          />
        </a>
      ))}
    </div>
  );
};

export default TripPictures;
