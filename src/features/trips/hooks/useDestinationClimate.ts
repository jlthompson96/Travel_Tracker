import { useQuery } from '@tanstack/react-query';
import { fetchMonthlyClimate } from '../../../utils/weather';

export function useDestinationClimate(lat: number | null | undefined, lng: number | null | undefined) {
  return useQuery({
    queryKey: ['climate', lat?.toFixed(2), lng?.toFixed(2)],
    queryFn: () => fetchMonthlyClimate(lat!, lng!),
    enabled: lat != null && lng != null,
    staleTime: 24 * 60 * 60 * 1000, // yesterday's weather doesn't change — cache generously
    retry: 1,
  });
}
