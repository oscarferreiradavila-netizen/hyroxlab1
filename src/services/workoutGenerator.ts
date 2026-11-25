import { Workout, TrainingModality, UserProfile, StatEntry } from '../types/training';

interface GeneratorOptions {
  modality: TrainingModality;
  durationMin: number;
  fatigueLevel: 'fresh' | 'normal' | 'tired';
  equipment?: string[];
  userProfile: UserProfile;
  recentWorkouts?: Workout[];
  statEntries?: StatEntry[];
  variantSeed?: number;
}

function getBestWeight(statEntries: StatEntry[] | undefined, keyword: string, fallback: number): number {
  if (!statEntries || statEntries.length === 0) return fallback;
  const matches = statEntries.filter(
    (e) => e.category === 'strength' && e.name.toLowerCase().includes(keyword.toLowerCase()) && e.weightKg
  );
  if (matches.length === 0) return fallback;
  const maxW = Math.max(...matches.map((m) => m.weightKg || 0));
  return maxW > 0 ? Math.round(maxW * 0.78) : fallback;
}

/**
 * Generador algorítmico inteligente de Entrenador Personal:
 * - Cero impacto articular
 * - Vatios absolutos y pesos reales basados en tus marcas
 * - Rotación de sesiones variadas según tu historial y fatiga reciente
 */
export function generatePrescribedWorkout(options: GeneratorOptions): Workout {
  const { modality, durationMin, fatigueLevel, userProfile, recentWorkouts = [], statEntries = [], variantSeed } = options;
  const todayStr = new Date().toISOString().split('T')[0];

  // Auto-detección de fatiga acumulada según últimas 2 sesiones
  const recentCompleted = recentWorkouts.filter((w) => w.status === 'completed').slice(0, 2);
  const highFatigueDetected =
    recentCompleted.length === 2 &&
    (recentCompleted[0].postRpe || 7) >= 9 &&
    (recentCompleted[1].postRpe || 7) >= 9;

  const effectiveFatigue = highFatigueDetected ? 'tired' : fatigueLevel;

  // Modificador de intensidad según fatiga y semana de progresión (ciclos de 4 semanas)
  const fatigueMultiplier = effectiveFatigue === 'tired' ? 0.85 : effectiveFatigue === 'fresh' ? 1.05 : 1.0;
  const week = userProfile.progressionWeek || 1;
  const weekInCycle = ((week - 1) % 4) + 1;
  const progressionMultiplier =
    weekInCycle === 1 ? 1.0 : weekInCycle === 2 ? 1.04 : weekInCycle === 3 ? 1.08 : 0.9;
  const totalMultiplier = fatigueMultiplier * progressionMultiplier;

  // Vatios base progresivos
  const bikeWattsZ2 = Math.round(userProfile.bikeFtpWatts * 0.65 * totalMultiplier);
  const bikeWattsZ4 = Math.round(userProfile.bikeFtpWatts * 0.95 * totalMultiplier);
  const bikeWattsZ5 = Math.round(userProfile.bikeFtpWatts * 1.12 * totalMultiplier);
  const rowWattsZ2 = Math.round(userProfile.rowFtpWatts * 0.68 * totalMultiplier);
  const rowWattsZ4 = Math.round(userProfile.rowFtpWatts * 0.96 * totalMultiplier);
  const rowWattsZ5 = Math.round(userProfile.rowFtpWatts * 1.1 * totalMultiplier);

  // Pesos personalizados según marcas registradas en Estadísticas
  const squatKg = Math.round(getBestWeight(statEntries, 'sentadilla', Math.round(userProfile.weightKg * 0.9)) * progressionMultiplier);
  const deadliftKg = Math.round(getBestWeight(statEntries, 'peso muerto', Math.round(userProfile.weightKg * 1.15)) * progressionMultiplier);
  const benchKg = Math.round(getBestWeight(statEntries, 'banca', Math.round(userProfile.weightKg * 0.7)) * progressionMultiplier);
  const pressKg = Math.round(getBestWeight(statEntries, 'militar', Math.round(userProfile.weightKg * 0.45)) * progressionMultiplier);

  // Elegir variante distinta a las últimas realizadas
  const modCount = recentWorkouts.filter((w) => w.modality === modality).length;
  const variant = (variantSeed !== undefined ? variantSeed : modCount) % 3;

  const workoutId = 'gen_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5);
  const recoveryTag = highFatigueDetected ? ' [Descarga por RPE Alto]' : '';

  switch (modality) {
    case 'hyrox_adapted': {
      const variants = [
        {
          title: `Hyrox Engine: Remo + Trineos (${durationMin} min)${recoveryTag}`,
          mainTitle: 'Bloque Hyrox: Ergómetros + Empuje/Tracción',
          instructions: `4 Rondas por tiempo. Mantén remo a ${rowWattsZ4} W constantes. Cero impacto.`,
          sets: [
            { id: 's_m1', exerciseName: 'Remo Ergómetro (RowErg)', targetWatts: rowWattsZ4, targetDistanceM: 500, targetDurationSec: 120, targetRestSec: 30, completed: false },
            { id: 's_m2', exerciseName: 'Sled Push (Trineo empuje)', targetWeightKg: 100, targetDistanceM: 50, targetRestSec: 45, completed: false },
            { id: 's_m3', exerciseName: 'Step-Down Burpee Broad Step (Sin salto)', isNoImpactAlternative: true, targetReps: 12, targetRestSec: 45, completed: false },
            { id: 's_m4', exerciseName: 'Farmers Carry', targetWeightKg: 24, targetDistanceM: 100, targetRestSec: 60, completed: false },
          ],
        },
        {
          title: `Hyrox Simulación: SkiErg + Wall Balls (${durationMin} min)${recoveryTag}`,
          mainTitle: 'Bloque Estaciones Metabólicas',
          instructions: `3 Rondas sostenidas. SkiErg constante a ${Math.round(rowWattsZ4 * 0.9)} W y Wall Balls sin salto.`,
          sets: [
            { id: 's_m1', exerciseName: 'SkiErg', targetWatts: Math.round(rowWattsZ4 * 0.9), targetDistanceM: 750, targetRestSec: 30, completed: false },
            { id: 's_m2', exerciseName: 'Sled Pull (Trineo tracción)', targetWeightKg: 80, targetDistanceM: 50, targetRestSec: 45, completed: false },
            { id: 's_m3', exerciseName: 'Sandbag Lunges (Zancadas)', targetWeightKg: 20, targetDistanceM: 60, targetRestSec: 45, completed: false },
            { id: 's_m4', exerciseName: 'Wall Balls (Sin salto)', isNoImpactAlternative: true, targetWeightKg: 9, targetReps: 25, targetRestSec: 60, completed: false },
          ],
        },
        {
          title: `Hyrox Umbral: BikeErg + Carries (${durationMin} min)${recoveryTag}`,
          mainTitle: 'Bloque Mixto Umbral Anaeróbico',
          instructions: `4 Rondas alternando BikeErg a ${bikeWattsZ4} W y fuerza funcional.`,
          sets: [
            { id: 's_m1', exerciseName: 'BikeErg', targetWatts: bikeWattsZ4, targetDistanceM: 1500, targetRestSec: 30, completed: false },
            { id: 's_m2', exerciseName: 'Weighted Step-Ups en Cajón', isNoImpactAlternative: true, targetWeightKg: 16, targetReps: 20, targetRestSec: 40, completed: false },
            { id: 's_m3', exerciseName: 'Farmers Carry Pesado', targetWeightKg: 28, targetDistanceM: 80, targetRestSec: 60, completed: false },
          ],
        },
      ];
      const chosen = variants[variant];
      return {
        id: workoutId,
        title: chosen.title,
        modality: 'hyrox_adapted',
        status: 'planned',
        scheduledDate: todayStr,
        durationMin,
        blocks: [
          {
            id: 'b_warmup',
            blockType: 'warmup',
            title: '1. Calentamiento Articular & Activación',
            instructions: 'Pedaleo suave y movilidad de cadera/hombros. Cero saltos.',
            sets: [
              { id: 's_w1', exerciseName: 'BikeErg / Bici estática', targetWatts: bikeWattsZ2, targetDurationSec: 300, completed: false },
            ],
          },
          { id: 'b_main', blockType: 'intervals', title: chosen.mainTitle, instructions: chosen.instructions, rounds: 4, sets: chosen.sets },
          {
            id: 'b_cooldown',
            blockType: 'cooldown',
            title: '3. Vuelta a la Calma',
            sets: [{ id: 's_c1', exerciseName: 'Remo Ergómetro Suave', targetWatts: Math.round(rowWattsZ2 * 0.8), targetDurationSec: 240, completed: false }],
          },
        ],
      };
    }

    case 'bike_erg': {
      const variants = [
        {
          title: `Bici: SweetSpot Umbral 4x5' (${durationMin} min)${recoveryTag}`,
          mainTitle: 'Bloque Principal: 4 x 5 min SweetSpot',
          instructions: `4 series de 5 min a ${bikeWattsZ4} W con 2 min suaves a ${bikeWattsZ2} W.`,
          rounds: 4,
          sets: [{ id: 's_b_m1', exerciseName: 'Bici Estática - Bloque Umbral', targetWatts: bikeWattsZ4, targetDurationSec: 300, targetRestSec: 120, completed: false }],
        },
        {
          title: `Bici: Sprints VO2max 10x1' (${durationMin} min)${recoveryTag}`,
          mainTitle: 'Bloque VO2max: 10 x 1 min Intenso',
          instructions: `10 repeticiones de 1 min a ${bikeWattsZ5} W con 1 min de recuperación a ${Math.round(bikeWattsZ2 * 0.8)} W.`,
          rounds: 10,
          sets: [{ id: 's_b_m1', exerciseName: 'BikeErg - Intervalo VO2max', targetWatts: bikeWattsZ5, targetDurationSec: 60, targetRestSec: 60, completed: false }],
        },
        {
          title: `Bici: Base Aeróbica Z2 + Cadencia (${durationMin} min)${recoveryTag}`,
          mainTitle: 'Bloque Continuo Aeróbico Z2',
          instructions: `Mantén cadencia alegre (85-95 rpm) y vatios constantes en ${bikeWattsZ2} W para mejorar eficiencia mitocondrial.`,
          rounds: 1,
          sets: [{ id: 's_b_m1', exerciseName: 'BikeErg Continuo Zona 2', targetWatts: bikeWattsZ2, targetDurationSec: Math.max(900, (durationMin - 15) * 60), completed: false }],
        },
      ];
      const chosen = variants[variant];
      return {
        id: workoutId,
        title: chosen.title,
        modality: 'bike_erg',
        status: 'planned',
        scheduledDate: todayStr,
        durationMin,
        blocks: [
          {
            id: 'b_warmup',
            blockType: 'warmup',
            title: 'Calentamiento Progresivo',
            sets: [{ id: 's_b_w1', exerciseName: 'Bici Estática Z1-Z2', targetWatts: bikeWattsZ2, targetDurationSec: 480, completed: false }],
          },
          { id: 'b_main', blockType: 'intervals', title: chosen.mainTitle, instructions: chosen.instructions, rounds: chosen.rounds, sets: chosen.sets },
          {
            id: 'b_cooldown',
            blockType: 'cooldown',
            title: 'Enfriamiento',
            sets: [{ id: 's_b_c1', exerciseName: 'Bici Estática Z1 Recuperación', targetWatts: Math.round(bikeWattsZ2 * 0.8), targetDurationSec: 300, completed: false }],
          },
        ],
      };
    }

    case 'rowing': {
      const variants = [
        {
          title: `Remo: Series 5 x 750m (${durationMin} min)${recoveryTag}`,
          mainTitle: 'Series 5 x 750m a Potencia Objetivo',
          instructions: `Mantén ritmo sostenido a ${rowWattsZ4} W. Descansa 90 seg entre series.`,
          rounds: 5,
          sets: [{ id: 's_r_m1', exerciseName: 'Remo Ergómetro (RowErg)', targetWatts: rowWattsZ4, targetDistanceM: 750, targetRestSec: 90, completed: false }],
        },
        {
          title: `Remo: Pirámide de Velocidad (${durationMin} min)${recoveryTag}`,
          mainTitle: 'Pirámide 250m - 500m - 750m - 500m - 250m',
          instructions: `Acelera en los tramos cortos (${rowWattsZ5} W) y estabiliza en 500/750m (${rowWattsZ4} W).`,
          rounds: 1,
          sets: [
            { id: 's_r_p1', exerciseName: 'Remo 250m Rápido', targetWatts: rowWattsZ5, targetDistanceM: 250, targetRestSec: 45, completed: false },
            { id: 's_r_p2', exerciseName: 'Remo 500m Fuerte', targetWatts: rowWattsZ4, targetDistanceM: 500, targetRestSec: 60, completed: false },
            { id: 's_r_p3', exerciseName: 'Remo 750m Umbral', targetWatts: rowWattsZ4, targetDistanceM: 750, targetRestSec: 90, completed: false },
            { id: 's_r_p4', exerciseName: 'Remo 500m Fuerte', targetWatts: rowWattsZ4, targetDistanceM: 500, targetRestSec: 60, completed: false },
            { id: 's_r_p5', exerciseName: 'Remo 250m Sprint Final', targetWatts: rowWattsZ5, targetDistanceM: 250, targetRestSec: 60, completed: false },
          ],
        },
        {
          title: `Remo: Resistencia 3 x 2.000m (${durationMin} min)${recoveryTag}`,
          mainTitle: 'Bloque Aeróbico 3 x 2.000m',
          instructions: `Ritmo constante y técnica limpia (22-24 paladas/min) a ${Math.round(rowWattsZ2 * 1.1)} W.`,
          rounds: 3,
          sets: [{ id: 's_r_m1', exerciseName: 'Remo 2.000m Controlado', targetWatts: Math.round(rowWattsZ2 * 1.1), targetDistanceM: 2000, targetRestSec: 120, completed: false }],
        },
      ];
      const chosen = variants[variant];
      return {
        id: workoutId,
        title: chosen.title,
        modality: 'rowing',
        status: 'planned',
        scheduledDate: todayStr,
        durationMin,
        blocks: [
          {
            id: 'b_warmup',
            blockType: 'warmup',
            title: 'Calentamiento Técnico',
            sets: [{ id: 's_r_w1', exerciseName: 'Remo Progresivo', targetWatts: Math.round(rowWattsZ2 * 0.8), targetDurationSec: 360, completed: false }],
          },
          { id: 'b_main', blockType: 'intervals', title: chosen.mainTitle, instructions: chosen.instructions, rounds: chosen.rounds, sets: chosen.sets },
          {
            id: 'b_cooldown',
            blockType: 'cooldown',
            title: 'Vuelta a la Calma',
            sets: [{ id: 's_r_c1', exerciseName: 'Remo Suave', targetWatts: Math.round(rowWattsZ2 * 0.75), targetDurationSec: 240, completed: false }],
          },
        ],
      };
    }

    case 'strength': {
      const variants = [
        {
          title: `Pesas A: Sentadilla + Empuje (${durationMin} min)${recoveryTag}`,
          mainTitle: 'Fuerza Tren Inferior & Empuje Horizontal',
          instructions: '4 series por ejercicio. Descansa 90-120 seg entre series pesadas.',
          sets: [
            { id: 's_s_1', exerciseName: 'Sentadilla (Back Squat)', targetWeightKg: squatKg, targetReps: 6, targetRestSec: 120, completed: false },
            { id: 's_s_2', exerciseName: 'Press Banca con Barra / Mancuernas', targetWeightKg: benchKg, targetReps: 8, targetRestSec: 90, completed: false },
            { id: 's_s_3', exerciseName: 'Remo con Barra / Polea', targetWeightKg: Math.round(benchKg * 0.85), targetReps: 10, targetRestSec: 75, completed: false },
          ],
        },
        {
          title: `Pesas B: Peso Muerto + Hombro (${durationMin} min)${recoveryTag}`,
          mainTitle: 'Cadena Posterior & Tracción Vertical',
          instructions: '4 series estrictas. Controla la bajada (excéntrica 2 seg).',
          sets: [
            { id: 's_s_1', exerciseName: 'Peso Muerto (Deadlift)', targetWeightKg: deadliftKg, targetReps: 5, targetRestSec: 120, completed: false },
            { id: 's_s_2', exerciseName: 'Press Militar (Strict Press)', targetWeightKg: pressKg, targetReps: 8, targetRestSec: 90, completed: false },
            { id: 's_s_3', exerciseName: 'Dominadas / Jalón al Pecho', targetWeightKg: Math.round(userProfile.weightKg * 0.8), targetReps: 10, targetRestSec: 75, completed: false },
          ],
        },
        {
          title: `Pesas C: Hipertrofia Full Body (${durationMin} min)${recoveryTag}`,
          mainTitle: 'Fuerza Unilateral & Potencia',
          instructions: '3-4 series controladas enfocadas en estabilidad y simetría articular.',
          sets: [
            { id: 's_s_1', exerciseName: 'Hip Thrust con Barra', targetWeightKg: Math.round(deadliftKg * 0.9), targetReps: 10, targetRestSec: 90, completed: false },
            { id: 's_s_2', exerciseName: 'Zancadas Búlgaras / Step-Ups', isNoImpactAlternative: true, targetWeightKg: 20, targetReps: 12, targetRestSec: 75, completed: false },
            { id: 's_s_3', exerciseName: 'Press Inclinado Mancuernas', targetWeightKg: Math.round(benchKg * 0.4), targetReps: 10, targetRestSec: 75, completed: false },
          ],
        },
      ];
      const chosen = variants[variant];
      return {
        id: workoutId,
        title: chosen.title,
        modality: 'strength',
        status: 'planned',
        scheduledDate: todayStr,
        durationMin,
        blocks: [
          {
            id: 'b_warmup',
            blockType: 'warmup',
            title: 'Activación y Series de Aproximación',
            sets: [{ id: 's_s_w1', exerciseName: 'Bici Estática Ligera', targetWatts: bikeWattsZ2, targetDurationSec: 300, completed: false }],
          },
          { id: 'b_main', blockType: 'main', title: chosen.mainTitle, instructions: chosen.instructions, rounds: 4, sets: chosen.sets },
          {
            id: 'b_cooldown',
            blockType: 'cooldown',
            title: 'Estiramientos y Core',
            sets: [{ id: 's_s_c1', exerciseName: 'Plancha Abdominal + Movilidad', targetDurationSec: 180, completed: false }],
          },
        ],
      };
    }

    case 'crossfit_no_impact': {
      const variants = [
        {
          title: `CrossFit EMOM 20' Zero Impact (${durationMin} min)${recoveryTag}`,
          blockType: 'emom' as const,
          mainTitle: 'EMOM 20 Minutos (Sin Impacto)',
          instructions: 'Minuto 1: Remo | Minuto 2: Thrusters | Minuto 3: Step-Burpees | Minuto 4: Descanso.',
          sets: [
            { id: 's_cf_1', exerciseName: 'Remo Ergómetro (Calorías/Metros)', targetWatts: rowWattsZ4, targetDistanceM: 250, completed: false },
            { id: 's_cf_2', exerciseName: 'Dumbbell Thrusters', targetWeightKg: 15, targetReps: 12, completed: false },
            { id: 's_cf_3', exerciseName: 'Step-Burpees (Sin salto)', isNoImpactAlternative: true, targetReps: 10, completed: false },
          ],
        },
        {
          title: `CrossFit AMRAP 18' Motor (${durationMin} min)${recoveryTag}`,
          blockType: 'amrap' as const,
          mainTitle: 'AMRAP 18 Minutos (Máximas Rondas)',
          instructions: 'Completa tantas rondas como puedas a ritmo constante sin pausas largas.',
          sets: [
            { id: 's_cf_1', exerciseName: 'SkiErg', targetWatts: Math.round(rowWattsZ4 * 0.9), targetDistanceM: 300, completed: false },
            { id: 's_cf_2', exerciseName: 'Kettlebell Swings (Rusos)', targetWeightKg: 20, targetReps: 15, completed: false },
            { id: 's_cf_3', exerciseName: 'Weighted Step-Ups', isNoImpactAlternative: true, targetWeightKg: 15, targetReps: 16, completed: false },
          ],
        },
        {
          title: `CrossFit Chipper For Time (${durationMin} min)${recoveryTag}`,
          blockType: 'for_time' as const,
          mainTitle: 'Chipper MetCon Por Tiempo',
          instructions: 'Completa todas las repeticiones de cada estación antes de pasar a la siguiente.',
          sets: [
            { id: 's_cf_1', exerciseName: 'BikeErg Sprint Controlado', targetWatts: bikeWattsZ4, targetDistanceM: 2000, completed: false },
            { id: 's_cf_2', exerciseName: 'Wall Balls (Sin salto)', isNoImpactAlternative: true, targetWeightKg: 9, targetReps: 40, completed: false },
            { id: 's_cf_3', exerciseName: 'Peso Muerto Técnico', targetWeightKg: Math.round(deadliftKg * 0.65), targetReps: 30, completed: false },
          ],
        },
      ];
      const chosen = variants[variant];
      return {
        id: workoutId,
        title: chosen.title,
        modality: 'crossfit_no_impact',
        status: 'planned',
        scheduledDate: todayStr,
        durationMin,
        blocks: [
          {
            id: 'b_warmup',
            blockType: 'warmup',
            title: 'Calentamiento MetCon',
            sets: [{ id: 's_cf_w1', exerciseName: 'Remo + Movilidad Hombros', targetWatts: rowWattsZ2, targetDurationSec: 300, completed: false }],
          },
          { id: 'b_main', blockType: chosen.blockType, title: chosen.mainTitle, instructions: chosen.instructions, sets: chosen.sets },
        ],
      };
    }

    case 'swimming':
    default: {
      const cssSec = userProfile.swimCssPace100mSec || 105;
      const paceStr = `${Math.floor(cssSec / 60)}:${(cssSec % 60).toString().padStart(2, '0')}/100m`;
      const variants = [
        {
          title: `Natación: Series CSS 8x100m (${durationMin} min)${recoveryTag}`,
          mainTitle: 'Series CSS (Critical Swim Speed)',
          instructions: `8 x 100m crol al ritmo objetivo de ${paceStr} con 20 seg de descanso.`,
          rounds: 8,
          sets: [{ id: 's_sw_m1', exerciseName: '100m Crol a Ritmo CSS', targetPacePer100m: paceStr, targetDistanceM: 100, targetRestSec: 20, completed: false }],
        },
        {
          title: `Natación: Pirámide Aeróbica (${durationMin} min)${recoveryTag}`,
          mainTitle: 'Pirámide 100m - 200m - 400m - 200m - 100m',
          instructions: `Mantén brazada larga y constante. Descansa 30 seg entre bloques.`,
          rounds: 1,
          sets: [
            { id: 's_sw_1', exerciseName: '100m Crol Progresivo', targetDistanceM: 100, targetRestSec: 20, completed: false },
            { id: 's_sw_2', exerciseName: '200m Crol Ritmo Medio', targetDistanceM: 200, targetRestSec: 30, completed: false },
            { id: 's_sw_3', exerciseName: '400m Crol Continuo', targetDistanceM: 400, targetRestSec: 45, completed: false },
            { id: 's_sw_4', exerciseName: '200m Pull-Buoy + Palas', targetDistanceM: 200, targetRestSec: 30, completed: false },
            { id: 's_sw_5', exerciseName: '100m Crol Fuerte', targetDistanceM: 100, targetRestSec: 20, completed: false },
          ],
        },
        {
          title: `Natación: Técnica + Velocidad 12x50m (${durationMin} min)${recoveryTag}`,
          mainTitle: 'Bloque 12 x 50m Velocidad Controlada',
          instructions: `Alterna 50m técnica (recobro alto) y 50m rápido con 20 seg de descanso.`,
          rounds: 12,
          sets: [{ id: 's_sw_m1', exerciseName: '50m Crol Técnico / Rápido', targetDistanceM: 50, targetRestSec: 20, completed: false }],
        },
      ];
      const chosen = variants[variant];
      return {
        id: workoutId,
        title: chosen.title,
        modality: 'swimming',
        status: 'planned',
        scheduledDate: todayStr,
        durationMin,
        blocks: [
          {
            id: 'b_warmup',
            blockType: 'warmup',
            title: 'Calentamiento Técnico',
            sets: [{ id: 's_sw_w1', exerciseName: 'Nado continuo crol suave + patada', targetDistanceM: 300, targetRestSec: 60, completed: false }],
          },
          { id: 'b_main', blockType: 'intervals', title: chosen.mainTitle, instructions: chosen.instructions, rounds: chosen.rounds, sets: chosen.sets },
          {
            id: 'b_cooldown',
            blockType: 'cooldown',
            title: 'Vuelta a la Calma',
            sets: [{ id: 's_sw_c1', exerciseName: 'Nado suave estilos / espalda', targetDistanceM: 200, completed: false }],
          },
        ],
      };
    }
  }
}

const MODALITY_LABELS: Record<TrainingModality, string> = {
  bike_erg: 'Bici',
  rowing: 'Remo',
  crossfit_no_impact: 'CrossFit',
  hyrox_adapted: 'Hyrox',
  swimming: 'Nadar',
  strength: 'Pesas',
};

/**
 * Genera un entrenamiento combinando una o varias modalidades elegidas por el usuario
 */
export function generateCombinedWorkout(
  modalities: TrainingModality[],
  durationMin: number,
  fatigueLevel: 'fresh' | 'normal' | 'tired',
  userProfile: UserProfile,
  recentWorkouts: Workout[] = [],
  statEntries: StatEntry[] = []
): Workout {
  const safeModalities: TrainingModality[] = modalities.length > 0 ? modalities : ['hyrox_adapted'];
  if (safeModalities.length === 1) {
    return generatePrescribedWorkout({
      modality: safeModalities[0],
      durationMin,
      fatigueLevel,
      userProfile,
      recentWorkouts,
      statEntries,
    });
  }

  const perModalityMin = Math.max(10, Math.round(durationMin / safeModalities.length));
  const todayStr = new Date().toISOString().split('T')[0];
  const combinedBlocks: Workout['blocks'] = [];

  safeModalities.forEach((mod, idx) => {
    const subWorkout = generatePrescribedWorkout({
      modality: mod,
      durationMin: perModalityMin,
      fatigueLevel,
      userProfile,
      recentWorkouts,
      statEntries,
    });

    if (idx === 0) {
      const warmup = subWorkout.blocks.find((b) => b.blockType === 'warmup');
      if (warmup) {
        combinedBlocks.push({
          ...warmup,
          id: `b_w_${idx}_${Date.now()}`,
          title: `Calentamiento (${MODALITY_LABELS[mod]})`,
        });
      }
    }

    const mainBlocks = subWorkout.blocks.filter(
      (b) => b.blockType !== 'warmup' && b.blockType !== 'cooldown'
    );
    mainBlocks.forEach((b, bIdx) => {
      combinedBlocks.push({
        ...b,
        id: `b_m_${idx}_${bIdx}_${Date.now()}`,
        title: `${MODALITY_LABELS[mod]}: ${b.title}`,
        sets: b.sets.map((s, sIdx) => ({
          ...s,
          id: `s_${idx}_${bIdx}_${sIdx}_${Date.now()}`,
        })),
      });
    });

    if (idx === safeModalities.length - 1) {
      const cooldown = subWorkout.blocks.find((b) => b.blockType === 'cooldown');
      if (cooldown) {
        combinedBlocks.push({
          ...cooldown,
          id: `b_c_${idx}_${Date.now()}`,
          title: `Vuelta a la Calma (${MODALITY_LABELS[mod]})`,
        });
      }
    }
  });

  const labelNames = safeModalities.map((m) => MODALITY_LABELS[m]).join(' + ');

  return {
    id: 'gen_mix_' + Date.now(),
    title: `${labelNames} (Sem ${userProfile.progressionWeek || 1} • ${durationMin} min)`,
    modality: safeModalities[0],
    status: 'planned',
    scheduledDate: todayStr,
    durationMin,
    generatedByAi: false,
    blocks: combinedBlocks,
  };
}

/**
 * Genera el Test de Evaluación Inicial para determinar el nivel real del atleta
 * en Bici, Remo y Fuerza sin impacto antes de iniciar la progresión.
 */
export function generateInitialAssessmentWorkout(userProfile: UserProfile): Workout {
  const todayStr = new Date().toISOString().split('T')[0];

  return {
    id: 'assessment_' + Date.now(),
    title: `Test Inicial de Nivel (${userProfile.name})`,
    modality: 'hyrox_adapted',
    status: 'planned',
    scheduledDate: todayStr,
    durationMin: 35,
    isAssessment: true,
    generatedByAi: false,
    blocks: [
      {
        id: 'b_test_warmup',
        blockType: 'warmup',
        title: '1. Calentamiento Articular',
        instructions: '5 minutos de movilidad articular y pedaleo muy suave antes de los tests.',
        sets: [
          {
            id: 's_test_w1',
            exerciseName: 'Movilidad + Bici Suave',
            targetWatts: 100,
            targetDurationSec: 300,
            completed: false,
          },
        ],
      },
      {
        id: 'b_test_cardio',
        blockType: 'main',
        title: '2. Tests de Potencia y Resistencia (Ergómetros)',
        instructions:
          'Haz cada test al máximo ritmo que puedas sostener de forma constante. Apunta tus vatios medios (W) y el tiempo real.',
        sets: [
          {
            id: 's_test_bike',
            exerciseName: 'Test Bici 10 min (Ritmo Máx Sostenible)',
            targetWatts: userProfile.bikeFtpWatts,
            targetDurationSec: 600,
            targetRestSec: 180,
            completed: false,
          },
          {
            id: 's_test_row',
            exerciseName: 'Test Remo 1.000m (Contrarreloj)',
            targetWatts: userProfile.rowFtpWatts,
            targetDistanceM: 1000,
            targetRestSec: 180,
            completed: false,
          },
        ],
      },
      {
        id: 'b_test_strength',
        blockType: 'main',
        title: '3. Test de Fuerza Base (Sin Impacto)',
        instructions:
          'Busca un peso exigente pero con técnica perfecta para 8 repeticiones (RIR 2) y anota los kg y reps.',
        sets: [
          {
            id: 's_test_squat',
            exerciseName: 'Sentadilla / Goblet Squat (Test 8RM)',
            targetWeightKg: Math.round(userProfile.weightKg * 0.7),
            targetReps: 8,
            targetRestSec: 90,
            completed: false,
          },
          {
            id: 's_test_press',
            exerciseName: 'Press con Mancuernas / Banca (Test 8RM)',
            targetWeightKg: Math.round(userProfile.weightKg * 0.45),
            targetReps: 8,
            targetRestSec: 90,
            completed: false,
          },
        ],
      },
    ],
  };
}
