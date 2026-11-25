export type TrainingModality =
  | 'hyrox_adapted'
  | 'crossfit_no_impact'
  | 'strength'
  | 'bike_erg'
  | 'rowing'
  | 'swimming';

export type BlockType = 'warmup' | 'main' | 'intervals' | 'amrap' | 'emom' | 'for_time' | 'cooldown';

export interface Exercise {
  id: string;
  name: string;
  modality: TrainingModality;
  muscleGroups: string[];
  equipmentNeeded: string[];
  isImpactFree: boolean;
  alternativeTo?: string; // Ej: 'Box Jump' -> 'Step-Up'
  description?: string;
}

export interface WorkoutSet {
  id: string;
  exerciseName: string;
  isNoImpactAlternative?: boolean;
  targetReps?: number;
  targetWeightKg?: number;
  targetWatts?: number; // Prescripción en vatios absolutos
  targetPacePer100m?: string; // Para natación (ej: "1:45/100m")
  targetDurationSec?: number;
  targetDistanceM?: number;
  targetRestSec?: number;
  
  // Rendimiento real registrado en vivo
  actualReps?: number;
  actualWeightKg?: number;
  actualWattsAvg?: number;
  actualWattsMax?: number;
  actualDurationSec?: number;
  actualDistanceM?: number;
  actualRpe?: number; // 1-10
  completed: boolean;
}

export interface WorkoutBlock {
  id: string;
  blockType: BlockType;
  title: string;
  instructions?: string;
  rounds?: number;
  timeCapSec?: number;
  sets: WorkoutSet[];
}

export interface HeartRateMetrics {
  avgHr?: number;
  maxHr?: number;
  restingHr?: number;
  timeInZ1Sec?: number;
  timeInZ2Sec?: number;
  timeInZ3Sec?: number;
  timeInZ4Sec?: number;
  timeInZ5Sec?: number;
}

export interface Workout {
  id: string;
  title: string;
  modality: TrainingModality;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  scheduledDate: string; // YYYY-MM-DD
  durationMin: number;
  actualDurationSec?: number;
  blocks: WorkoutBlock[];
  
  // Feedback
  preEnergyLevel?: number; // 1-5
  preSorenessLevel?: number; // 1-5
  postRpe?: number; // 1-10
  athleteNotes?: string;
  coachFeedback?: string;
  
  // Métricas fisiológicas
  heartRate?: HeartRateMetrics;
  
  // Origen
  generatedByAi?: boolean;
  isAssessment?: boolean;
  stravaId?: string;
  appleHealthId?: string;
  completedAt?: string;
}

export interface UserProfile {
  name: string;
  weightKg: number;
  heightCm: number;
  restingHr: number;
  maxHr: number;
  bikeFtpWatts: number; // FTP en W (test 20 min)
  rowFtpWatts: number;  // Potencia media 5min o 2000m en W
  row2000mBestSec?: number;
  swimCssPace100mSec?: number;
  noImpactEnforced: boolean;
  geminiApiKey?: string;
  stravaAccessToken?: string;
  assessmentCompleted?: boolean;
  fitnessLevel?: 'principiante' | 'intermedio' | 'avanzado' | 'elite';
  progressionWeek?: number;
}

export interface PersonalRecord {
  id: string;
  exerciseName: string;
  metricType: '1RM_kg' | 'max_watts' | 'best_time' | 'max_reps' | 'max_distance';
  recordValue: number;
  unit: string;
  date: string;
  workoutTitle?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'coach' | 'system';
  text: string;
  timestamp: string;
  suggestedWorkout?: Workout;
}

export type StatCategory = 'strength' | 'crossfit' | 'rowing' | 'bike' | 'swimming' | 'hyrox';

export interface StatEntry {
  id: string;
  category: StatCategory;
  name: string;         // Movimiento, Hero WOD, Distancia o Estación
  weightKg?: number;    // Para pesas o carga en CrossFit/Hyrox
  reps?: number;        // Para pesas o rondas/reps en CrossFit
  distanceM?: number;   // Para remo, bici, nadar, hyrox
  durationSec?: number; // Tiempo total en segundos
  watts?: number;       // Vatios medios
  notes?: string;
  date: string;         // YYYY-MM-DD
}
