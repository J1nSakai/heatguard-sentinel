import { FortyGuardHeatTile } from '../types';

/**
 * Generates or provides FortyGuard thermal tiles around given coordinates
 */
export function generateThermalTiles(
  centerLat: number,
  centerLng: number,
  baseTemp: number,
  gridSize: number = 8
): FortyGuardHeatTile[] {
  const tiles: FortyGuardHeatTile[] = [];
  const step = 0.0012; // approx 130m tile resolution

  let tileId = 0;
  for (let i = -gridSize / 2; i < gridSize / 2; i++) {
    for (let j = -gridSize / 2; j < gridSize / 2; j++) {
      const lat1 = centerLat + i * step;
      const lng1 = centerLng + j * step;
      const lat2 = lat1 + step * 0.95;
      const lng2 = lng1 + step * 0.95;

      // Realistic urban microclimate variance (asphalt, roof radiant heat vs greenery)
      const distFromCenter = Math.sqrt(i * i + j * j);
      const heatIslandBonus = Math.sin(i * 1.5) * Math.cos(j * 1.5) * 3.5;
      const variance = (Math.sin(tileId * 13.37) * 2.2) + heatIslandBonus;

      const avgTemp = parseFloat((baseTemp + variance).toFixed(1));
      const minTemp = parseFloat((avgTemp - 3.2).toFixed(1));
      const maxTemp = parseFloat((avgTemp + 4.8).toFixed(1));

      tiles.push({
        tile_id: tileId++,
        average_temperature: avgTemp,
        min_temperature: minTemp,
        max_temperature: maxTemp,
        coordinates: [
          [
            [lng1, lat1],
            [lng2, lat1],
            [lng2, lat2],
            [lng1, lat2],
            [lng1, lat1],
          ],
        ],
      });
    }
  }

  return tiles;
}

/**
 * Maps temperature in Celsius to high-visibility thermal color code
 */
export function getThermalTileColor(tempC: number): string {
  if (tempC < 30) return '#3b82f6'; // Safe blue (<30°C)
  if (tempC < 34) return '#06b6d4'; // Cyan
  if (tempC < 37) return '#10b981'; // Greenish safe
  if (tempC < 39) return '#eab308'; // Amber / Caution
  if (tempC < 42) return '#f97316'; // Orange / Danger
  if (tempC < 45) return '#ef4444'; // Red / High Danger
  return '#dc2626'; // Dark Red / Extreme Heat (45°C+)
}

export function getThermalOpacity(tempC: number): number {
  if (tempC < 32) return 0.25;
  if (tempC < 38) return 0.45;
  if (tempC < 42) return 0.65;
  return 0.8;
}
