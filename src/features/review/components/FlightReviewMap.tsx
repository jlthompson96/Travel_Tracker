import { useEffect, useMemo } from 'react';
import { MapContainer, Marker, Polyline, TileLayer, Tooltip as LeafletTooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { LatLng } from '../../../utils/geo';
import { MapTouchGate } from '../../map/components/MapTouchGate';
import { evaluateFlightPosition, intermediatePoint } from '../utils/flightMath';
import { flightHomeIcon, flightStopIcon, planeMarkerIcon } from '../utils/planeIcon';
import type { FlightLeg } from '../utils/yearStats';

interface FlightReviewMapProps {
  home: LatLng;
  legs: FlightLeg[];
  activeLegIndex: number;
  legProgress: number; // 0 to 1
  onSelectLeg: (legIndex: number) => void;
  heightClassName?: string;
  prefersReducedMotion?: boolean;
}

export function FlightReviewMap({
  home,
  legs,
  activeLegIndex,
  legProgress,
  onSelectLeg,
  heightClassName = 'h-[440px] max-sm:h-[340px]',
  prefersReducedMotion = false,
}: FlightReviewMapProps) {
  const activeLeg = legs[activeLegIndex] ?? legs[0];

  // Calculate current plane position and heading
  const planeState = useMemo(() => {
    if (!activeLeg) {
      return { position: [home.lat, home.lng] as [number, number], heading: 0 };
    }
    return evaluateFlightPosition(activeLeg.origin, activeLeg.destination, legProgress);
  }, [activeLeg, home, legProgress]);

  // Divide active leg arc into traveled vs remaining
  const { traveledArc, remainingArc } = useMemo(() => {
    if (!activeLeg) return { traveledArc: [], remainingArc: [] };

    const totalPts = activeLeg.arcPoints;
    const splitIdx = Math.floor(legProgress * (totalPts.length - 1));

    const currentPos = intermediatePoint(activeLeg.origin, activeLeg.destination, legProgress);
    const midTuple: [number, number] = [currentPos.lat, currentPos.lng];

    const traveled = [...totalPts.slice(0, splitIdx + 1), midTuple];
    const remaining = [midTuple, ...totalPts.slice(splitIdx + 1)];

    return { traveledArc: traveled, remainingArc: remaining };
  }, [activeLeg, legProgress]);

  if (legs.length === 0) {
    return (
      <div className={`flex items-center justify-center rounded border border-dashed border-slate/20 bg-surface/30 p-6 text-sm text-slate/60 ${heightClassName}`}>
        No flight legs available to animate.
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded border border-slate/15 shadow-sm ${heightClassName}`}>
      <MapContainer
        center={[home.lat, home.lng]}
        zoom={3}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapTouchGate />
        <FlightViewportController activeLeg={activeLeg} prefersReducedMotion={prefersReducedMotion} />

        {/* 1. Completed Legs: Solid line */}
        {legs.map((leg, idx) => {
          if (idx >= activeLegIndex) return null;
          return (
            <Polyline
              key={`completed-${leg.id}`}
              positions={leg.arcPoints}
              pathOptions={{
                color: '#B98B3E',
                weight: 2.5,
                opacity: 0.85,
                lineCap: 'round',
              }}
            />
          );
        })}

        {/* 2. Active Leg Traveled: Solid vibrant brass line */}
        {traveledArc.length > 1 && (
          <Polyline
            positions={traveledArc}
            pathOptions={{
              color: '#B98B3E',
              weight: 3.5,
              opacity: 1,
              lineCap: 'round',
            }}
          />
        )}

        {/* 3. Active Leg Remaining: Dashed anticipation path */}
        {remainingArc.length > 1 && (
          <Polyline
            positions={remainingArc}
            pathOptions={{
              color: '#B98B3E',
              weight: 2,
              opacity: 0.45,
              dashArray: '3 6',
              lineCap: 'round',
            }}
          />
        )}

        {/* 4. Upcoming Legs: Faint dotted lines */}
        {legs.map((leg, idx) => {
          if (idx <= activeLegIndex) return null;
          return (
            <Polyline
              key={`upcoming-${leg.id}`}
              positions={leg.arcPoints}
              pathOptions={{
                color: '#8A9BA8',
                weight: 1.5,
                opacity: 0.35,
                dashArray: '2 6',
                lineCap: 'round',
              }}
            />
          );
        })}

        {/* Destination Stop Markers */}
        {legs.map((leg, idx) => {
          if (leg.isReturnHome) return null;

          const isCurrent = idx === activeLegIndex;
          const isCompleted = idx < activeLegIndex || (isCurrent && legProgress >= 0.98);

          return (
            <Marker
              key={leg.id}
              position={[leg.destination.lat, leg.destination.lng]}
              icon={flightStopIcon(idx, isCurrent, isCompleted)}
              eventHandlers={{
                click: () => onSelectLeg(idx),
              }}
              title={`Stop ${idx + 1}: ${leg.toLabel}`}
            >
              <LeafletTooltip direction="top" offset={[0, -10]}>
                <div className="font-body text-xs">
                  <span className="font-semibold">{leg.toLabel}</span>
                  <span className="block text-[10px] text-slate/70">
                    Stop {idx + 1} · {leg.distanceMiles.toLocaleString()} mi
                  </span>
                </div>
              </LeafletTooltip>
            </Marker>
          );
        })}

        {/* Home Base Marker */}
        <Marker
          position={[home.lat, home.lng]}
          icon={flightHomeIcon()}
          title="Home Base — Fort Mill, SC"
        >
          <LeafletTooltip direction="top" offset={[0, -10]}>
            <div className="font-body text-xs">
              <span className="font-semibold">Home Base</span>
              <span className="block text-[10px] text-slate/70">Fort Mill, SC</span>
            </div>
          </LeafletTooltip>
        </Marker>

        {/* The Animated Plane Marker */}
        <Marker
          position={planeState.position}
          icon={planeMarkerIcon(planeState.heading)}
          zIndexOffset={1000}
          title={`Flight to ${activeLeg?.toLabel ?? 'Destination'}`}
        >
          <LeafletTooltip direction="bottom" offset={[0, 10]} opacity={0.9}>
            <div className="font-body text-[11px] font-semibold text-ink">
              ✈ {legProgress >= 0.98 ? `Arrived at ${activeLeg?.toLabel}` : `En route to ${activeLeg?.toLabel}`}
            </div>
          </LeafletTooltip>
        </Marker>
      </MapContainer>
    </div>
  );
}

function FlightViewportController({
  activeLeg,
  prefersReducedMotion,
}: {
  activeLeg: FlightLeg | undefined;
  prefersReducedMotion: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    if (!activeLeg) return;

    const bounds: [[number, number], [number, number]] = [
      [activeLeg.origin.lat, activeLeg.origin.lng],
      [activeLeg.destination.lat, activeLeg.destination.lng],
    ];

    if (prefersReducedMotion) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 6 });
    } else {
      map.flyToBounds(bounds, {
        padding: [60, 60],
        maxZoom: 6,
        duration: 1.2,
        easeLinearity: 0.25,
      });
    }
  }, [map, activeLeg, prefersReducedMotion]);

  return null;
}
