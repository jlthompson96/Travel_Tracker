import { useQuery } from '@tanstack/react-query';
import { getMonthlyClimate } from '../../../utils/weather';

/**
 * Reads the build-time climate index first (scripts/fetch-climate.mjs) and only
 * hits Open-Meteo for locations it doesn't cover — so the modal usually renders
 * its chart with no network call at all, and works offline.
 */
export function useDestinationClimate(lat: number | null | undefined, lng: number | null | undefined) {
  return useQuery({
    queryKey: ['climate', lat?.toFixed(2), lng?.toFixed(2)],
    queryFn: () => getMonthlyClimate(lat!, lng!),
    enabled: lat != null && lng != null,
    staleTime: 24 * 60 * 60 * 1000, // yesterday's weather doesn't change — cache generously
    retry: 1,
  });
}
