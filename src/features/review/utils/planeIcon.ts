import L from 'leaflet';

const MARKER_CLASS = 'tt-marker';

/**
 * Custom animated airplane marker.
 * The SVG plane naturally points North (0°).
 * Rotating it by `headingDeg` matches the airplane's flight direction along the great circle.
 */
export function planeMarkerIcon(headingDeg: number) {
  const size = 36;
  const roundedHeading = Math.round(headingDeg * 10) / 10;

  return L.divIcon({
    className: `${MARKER_CLASS} flight-plane-marker`,
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        display: flex;
        align-items: center;
        justify-content: center;
        transform: rotate(${roundedHeading}deg);
        filter: drop-shadow(0 2px 5px rgba(0,0,0,0.45));
        transition: transform 0.08s linear;
      ">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="#B98B3E" stroke="#14232E" stroke-width="1.2" stroke-linejoin="round">
          <!-- North-pointing airplane -->
          <path d="M12 2L8 10H3L2 12L8 14.5V19L6 20.5V22L12 20.5L18 22V20.5L16 19V14.5L22 12L21 10H16L12 2Z"/>
        </svg>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

/**
 * Numbered pin for stops along the flight path.
 */
export function flightStopIcon(index: number, isCurrent: boolean, isCompleted: boolean) {
  const size = isCurrent ? 28 : 22;
  const bg = isCurrent
    ? 'rgb(var(--color-brass))'
    : isCompleted
      ? 'rgb(var(--color-stamp-red))'
      : 'rgb(var(--color-slate) / 0.7)';

  const ring = isCurrent
    ? 'box-shadow: 0 0 0 4px rgba(185, 139, 62, 0.35), 0 2px 6px rgba(0,0,0,0.3);'
    : 'box-shadow: 0 1px 3px rgba(0,0,0,0.3);';

  return L.divIcon({
    className: `${MARKER_CLASS} flight-stop-marker`,
    html: `
      <span style="
        display: flex;
        align-items: center;
        justify-content: center;
        width: ${size}px;
        height: ${size}px;
        border-radius: 9999px;
        background: ${bg};
        border: 2px solid white;
        color: white;
        font: 700 ${isCurrent ? '12px' : '10px'}/1 ui-monospace, monospace;
        ${ring}
        transition: all 0.2s ease-out;
      ">
        ${index + 1}
      </span>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

/**
 * Diamond home base icon matching the app's home style.
 */
export function flightHomeIcon() {
  const size = 22;
  return L.divIcon({
    className: MARKER_CLASS,
    html: `
      <span style="
        display: flex;
        align-items: center;
        justify-content: center;
        width: ${size}px;
        height: ${size}px;
        border-radius: 6px;
        background: #14232E;
        border: 2px solid white;
        box-shadow: 0 1px 4px rgba(0,0,0,0.4);
        transform: rotate(45deg);
      ">
        <span style="
          display: block;
          width: 7px;
          height: 7px;
          border-radius: 9999px;
          background: #B98B3E;
          transform: rotate(-45deg);
        "></span>
      </span>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

