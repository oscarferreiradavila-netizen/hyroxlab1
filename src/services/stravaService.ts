import { Workout } from '../types/training';

export interface StravaActivitySummary {
  id: string;
  name: string;
  type: string;
  distance: number;
  movingTime: number;
  startDate: string;
  averageWatts?: number;
  maxWatts?: number;
  averageHeartrate?: number;
  maxHeartrate?: number;
}

/**
 * Servicio de integración con Strava API v3
 */
export const stravaService = {
  // URLs de autenticación OAuth 2.0
  getAuthUrl(clientId: string, redirectUri: string): string {
    const scope = 'read,activity:read_all,activity:write';
    return `https://www.strava.com/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&approval_prompt=auto&scope=${scope}`;
  },

  /**
   * Obtiene las actividades recientes directamente de la API de Strava con un Access Token
   */
  async fetchActivitiesFromStrava(accessToken: string): Promise<StravaActivitySummary[]> {
    const res = await fetch('https://www.strava.com/api/v3/athlete/activities?per_page=10', {
      headers: {
        Authorization: `Bearer ${accessToken.trim()}`,
      },
    });

    if (!res.ok) {
      if (res.status === 401) {
        throw new Error('Token de Strava inválido o caducado. Comprueba tu Access Token en strava.com/settings/api');
      }
      throw new Error(`Error en Strava API (HTTP ${res.status})`);
    }

    const data = await res.json();
    if (!Array.isArray(data)) {
      throw new Error('Formato inesperado recibido de Strava');
    }

    return data.map((act: any) => ({
      id: act.id.toString(),
      name: act.name || 'Actividad Strava',
      type: act.type || act.sport_type || 'Workout',
      distance: act.distance || 0,
      movingTime: act.moving_time || act.elapsed_time || 0,
      startDate: act.start_date || new Date().toISOString(),
      averageWatts: act.average_watts,
      maxWatts: act.max_watts,
      averageHeartrate: act.average_heartrate,
      maxHeartrate: act.max_heartrate,
    }));
  },

  /**
   * Transforma una actividad importada de Strava al formato Workout de HyroxLab
   * Evita duplicados verificando el stravaId
   */
  mapStravaToWorkout(activity: StravaActivitySummary): Workout {
    let modality: any = 'bike_erg';
    const typeUpper = activity.type.toUpperCase();
    if (typeUpper.includes('ROW')) modality = 'rowing';
    else if (typeUpper.includes('SWIM')) modality = 'swimming';
    else if (typeUpper.includes('RUN')) modality = 'running';
    else if (typeUpper.includes('WORKOUT') || typeUpper.includes('CROSSFIT')) modality = 'hyrox_adapted';

    return {
      id: 'strava_' + activity.id,
      stravaId: activity.id,
      title: `Strava: ${activity.name}`,
      modality,
      status: 'completed',
      scheduledDate: activity.startDate.split('T')[0],
      durationMin: Math.round(activity.movingTime / 60),
      actualDurationSec: activity.movingTime,
      completedAt: activity.startDate,
      heartRate: {
        avgHr: activity.averageHeartrate ? Math.round(activity.averageHeartrate) : undefined,
        maxHr: activity.maxHeartrate ? Math.round(activity.maxHeartrate) : undefined,
      },
      blocks: [
        {
          id: 'b_strava_main',
          blockType: 'main',
          title: 'Actividad Sincronizada Strava',
          sets: [
            {
              id: 's_strava_1',
              exerciseName: activity.name,
              actualWattsAvg: activity.averageWatts ? Math.round(activity.averageWatts) : undefined,
              actualWattsMax: activity.maxWatts ? Math.round(activity.maxWatts) : undefined,
              actualDistanceM: Math.round(activity.distance),
              actualDurationSec: activity.movingTime,
              completed: true,
            },
          ],
        },
      ],
    };
  },
};
