/**
 * Utilidades de conversión de vatios a ritmo /500m (Remo/SkiErg) y km/h (BikeErg)
 * Basado en las fórmulas estándar de Concept2.
 */

export function wattsToRow500mSec(watts?: number): number | null {
  if (!watts || watts <= 0) return null;
  return Math.round(500 * Math.pow(2.8 / watts, 1 / 3));
}

export function formatPace500m(sec?: number | null): string {
  if (!sec || sec <= 0) return '-';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')} /500m`;
}

export function wattsToBikeKmh(watts?: number): number | null {
  if (!watts || watts <= 0) return null;
  // En BikeErg, 1000m equivale en tiempo al split de 500m en RowErg: v(m/s) = 2 * (watts / 2.8)^(1/3)
  const kmh = 7.2 * Math.pow(watts / 2.8, 1 / 3);
  return Math.round(kmh * 10) / 10;
}
