import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Workout, UserProfile, PersonalRecord, ChatMessage, WorkoutSet, StatEntry } from '../types/training';

export type AppUserId = 'oscar' | 'sara';

interface TrainingState {
  activeUserId: AppUserId | null;
  profile: UserProfile;
  workouts: Workout[];
  activeWorkout: Workout | null;
  records: PersonalRecord[];
  chatHistory: ChatMessage[];
  statEntries: StatEntry[];
  isLoaded: boolean;

  // Acciones
  loadState: () => Promise<void>;
  selectUser: (userId: AppUserId) => Promise<void>;
  logoutUser: () => void;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  setActiveWorkout: (workout: Workout | null) => Promise<void>;
  updateActiveSet: (blockIndex: number, setIndex: number, updates: Partial<WorkoutSet>) => void;
  toggleSetCompleted: (blockIndex: number, setIndex: number) => void;
  finishActiveWorkout: (feedback?: { postRpe?: number; notes?: string; durationMin?: number; actualDurationSec?: number; coachFeedback?: string }) => Promise<Workout | null>;
  addWorkout: (workout: Workout) => Promise<void>;
  addChatMessage: (msg: ChatMessage) => Promise<void>;
  addStatEntry: (entry: StatEntry) => Promise<void>;
  deleteStatEntry: (id: string) => Promise<void>;
  clearActiveWorkout: () => void;
}

const DEFAULT_PROFILE: UserProfile = {
  name: 'Atleta HyroxLab',
  weightKg: 78,
  heightCm: 180,
  restingHr: 52,
  maxHr: 186,
  bikeFtpWatts: 230,       // Test 20 min en bici
  rowFtpWatts: 215,        // Vatios equivalentes en remo 2000m / 5 min
  row2000mBestSec: 420,    // 7:00 en 2000m
  swimCssPace100mSec: 105, // 1:45 / 100m
  noImpactEnforced: true,
  geminiApiKey: '',
};

const INITIAL_MOCK_WORKOUTS: Workout[] = [
  {
    id: 'mock_1',
    title: 'Hyrox Engine: Remo + Trineo (Sin Impacto)',
    modality: 'hyrox_adapted',
    status: 'completed',
    scheduledDate: '2026-11-16',
    durationMin: 55,
    actualDurationSec: 3240,
    completedAt: '2026-11-16T18:30:00Z',
    postRpe: 8,
    athleteNotes: 'Sensaciones brutales en el remo. Cero dolor de rodilla.',
    heartRate: {
      avgHr: 154,
      maxHr: 178,
      restingHr: 52,
      timeInZ1Sec: 300,
      timeInZ2Sec: 900,
      timeInZ3Sec: 1200,
      timeInZ4Sec: 600,
      timeInZ5Sec: 240,
    },
    blocks: [
      {
        id: 'b1',
        blockType: 'warmup',
        title: 'Calentamiento Progresivo',
        sets: [
          {
            id: 's1',
            exerciseName: 'SkiErg',
            targetWatts: 150,
            actualWattsAvg: 152,
            targetDurationSec: 300,
            actualDurationSec: 300,
            completed: true,
          },
        ],
      },
      {
        id: 'b2',
        blockType: 'main',
        title: 'Bloque Principal Hyrox Aeróbico',
        rounds: 4,
        sets: [
          {
            id: 's2',
            exerciseName: 'Remo Ergómetro (RowErg)',
            targetWatts: 205,
            actualWattsAvg: 208,
            targetDistanceM: 1000,
            actualDistanceM: 1000,
            actualDurationSec: 228,
            completed: true,
          },
          {
            id: 's3',
            exerciseName: 'Sled Push (Trineo empuje)',
            targetWeightKg: 125,
            actualWeightKg: 125,
            targetDistanceM: 50,
            actualDistanceM: 50,
            completed: true,
          },
        ],
      },
    ],
  },
  {
    id: 'mock_2',
    title: 'Fuerza Máxima: Tren Inferior & Core',
    modality: 'strength',
    status: 'completed',
    scheduledDate: '2026-11-17',
    durationMin: 50,
    actualDurationSec: 3000,
    completedAt: '2026-11-17T19:00:00Z',
    postRpe: 7,
    blocks: [
      {
        id: 'b3',
        blockType: 'main',
        title: 'Sobrecarga Progresiva Trap Bar',
        sets: [
          {
            id: 's4',
            exerciseName: 'Peso Muerto (Trap Bar)',
            targetReps: 5,
            actualReps: 5,
            targetWeightKg: 130,
            actualWeightKg: 130,
            completed: true,
          },
          {
            id: 's5',
            exerciseName: 'Weighted Step-Ups',
            targetReps: 10,
            actualReps: 10,
            targetWeightKg: 24,
            actualWeightKg: 24,
            completed: true,
          },
        ],
      },
    ],
  },
];

const INITIAL_RECORDS: PersonalRecord[] = [
  {
    id: 'pr_1',
    exerciseName: 'Remo Ergómetro (RowErg)',
    metricType: 'max_watts',
    recordValue: 345,
    unit: 'W',
    date: '2026-11-10',
    workoutTitle: 'Test Potencia Anaeróbica',
  },
  {
    id: 'pr_2',
    exerciseName: 'Remo 2000m',
    metricType: 'best_time',
    recordValue: 420,
    unit: 'seg (7:00)',
    date: '2026-10-28',
    workoutTitle: 'Test 2k Row Erg',
  },
  {
    id: 'pr_3',
    exerciseName: 'Peso Muerto (Trap Bar)',
    metricType: '1RM_kg',
    recordValue: 155,
    unit: 'kg',
    date: '2026-11-12',
    workoutTitle: 'Test Fuerza Máxima',
  },
  {
    id: 'pr_4',
    exerciseName: 'BikeErg 20 min FTP',
    metricType: 'max_watts',
    recordValue: 242,
    unit: 'W',
    date: '2026-11-02',
    workoutTitle: 'FTP 20 min Test',
  },
];

const INITIAL_CHAT: ChatMessage[] = [
  {
    id: 'msg_welcome',
    sender: 'coach',
    text: '¡Hola! Soy tu entrenador personal de HyroxLab. Estoy configurado con restricción estricta de CERO IMPACTO: sustituimos toda carrera por remo, SkiErg o bici, y cualquier salto por step-ups o step-burpees. ¿Cuánto tiempo tienes hoy para entrenar y cómo te sientes?',
    timestamp: new Date().toISOString(),
  },
];

const INITIAL_STAT_ENTRIES: StatEntry[] = [
  {
    id: 'st_1a',
    category: 'strength',
    name: 'Sentadilla (Back Squat)',
    weightKg: 95,
    reps: 5,
    date: '2026-10-25',
  },
  {
    id: 'st_1b',
    category: 'strength',
    name: 'Sentadilla (Back Squat)',
    weightKg: 102.5,
    reps: 5,
    date: '2026-11-05',
  },
  {
    id: 'st_1',
    category: 'strength',
    name: 'Sentadilla (Back Squat)',
    weightKg: 110,
    reps: 5,
    date: '2026-11-16',
  },
  {
    id: 'st_2',
    category: 'strength',
    name: 'Press Banca',
    weightKg: 85,
    reps: 6,
    date: '2026-11-17',
  },
  {
    id: 'st_3a',
    category: 'crossfit',
    name: 'Fran',
    durationSec: 325, // 5:25
    notes: '21-15-9 Thrusters 42.5kg + Pull-ups',
    date: '2026-10-20',
  },
  {
    id: 'st_3b',
    category: 'crossfit',
    name: 'Fran',
    durationSec: 298, // 4:58
    notes: '21-15-9 Thrusters 42.5kg + Pull-ups',
    date: '2026-11-02',
  },
  {
    id: 'st_3',
    category: 'crossfit',
    name: 'Fran',
    durationSec: 275, // 4:35
    notes: '21-15-9 Thrusters 42.5kg + Pull-ups',
    date: '2026-11-15',
  },
  {
    id: 'st_4a',
    category: 'rowing',
    name: '2.000m Remo',
    distanceM: 2000,
    durationSec: 448, // 7:28
    watts: 195,
    date: '2026-10-18',
  },
  {
    id: 'st_4b',
    category: 'rowing',
    name: '2.000m Remo',
    distanceM: 2000,
    durationSec: 432, // 7:12
    watts: 208,
    date: '2026-11-01',
  },
  {
    id: 'st_4',
    category: 'rowing',
    name: '2.000m Remo',
    distanceM: 2000,
    durationSec: 420, // 7:00
    watts: 220,
    date: '2026-11-16',
  },
  {
    id: 'st_5a',
    category: 'bike',
    name: '4 km BikeErg',
    distanceM: 4000,
    durationSec: 418, // 6:58
    watts: 220,
    date: '2026-10-22',
  },
  {
    id: 'st_5',
    category: 'bike',
    name: '4 km BikeErg',
    distanceM: 4000,
    durationSec: 390, // 6:30
    watts: 245,
    date: '2026-11-17',
  },
  {
    id: 'st_6a',
    category: 'swimming',
    name: '400m Crol',
    distanceM: 400,
    durationSec: 435, // 7:15
    date: '2026-10-28',
  },
  {
    id: 'st_6',
    category: 'swimming',
    name: '400m Crol',
    distanceM: 400,
    durationSec: 410, // 6:50
    date: '2026-11-18',
  },
];

const getDefaultProfile = (userId: AppUserId): UserProfile => {
  if (userId === 'sara') {
    return {
      ...DEFAULT_PROFILE,
      name: 'Sara',
      weightKg: 62,
      heightCm: 168,
      restingHr: 56,
      maxHr: 190,
      bikeFtpWatts: 185,
      rowFtpWatts: 170,
      assessmentCompleted: false,
      progressionWeek: 1,
    };
  }
  return {
    ...DEFAULT_PROFILE,
    name: 'Oscar',
    assessmentCompleted: false,
    progressionWeek: 1,
  };
};

const getStorageKeys = (userId: AppUserId | null) => {
  const prefix = userId ? `@hyroxlab_${userId}` : '@hyroxlab';
  return {
    PROFILE: `${prefix}_profile`,
    WORKOUTS: `${prefix}_workouts`,
    ACTIVE_WORKOUT: `${prefix}_active_workout`,
    RECORDS: `${prefix}_records`,
    CHAT: `${prefix}_chat`,
    STAT_ENTRIES: `${prefix}_stat_entries`,
  };
};

export const useTrainingStore = create<TrainingState>((set, get) => ({
  activeUserId: null,
  profile: DEFAULT_PROFILE,
  workouts: INITIAL_MOCK_WORKOUTS,
  activeWorkout: null,
  records: INITIAL_RECORDS,
  chatHistory: INITIAL_CHAT,
  statEntries: INITIAL_STAT_ENTRIES,
  isLoaded: false,

  loadState: async () => {
    // Al iniciar, dejamos que el usuario elija entre Oscar y Sara
    set({ isLoaded: true });
  },

  selectUser: async (userId: AppUserId) => {
    set({ isLoaded: false });
    const keys = getStorageKeys(userId);
    const defaultProf = getDefaultProfile(userId);
    try {
      const [savedProfile, savedWorkouts, savedActive, savedRecords, savedChat, savedStats] = await Promise.all([
        AsyncStorage.getItem(keys.PROFILE),
        AsyncStorage.getItem(keys.WORKOUTS),
        AsyncStorage.getItem(keys.ACTIVE_WORKOUT),
        AsyncStorage.getItem(keys.RECORDS),
        AsyncStorage.getItem(keys.CHAT),
        AsyncStorage.getItem(keys.STAT_ENTRIES),
      ]);

      set({
        activeUserId: userId,
        profile: savedProfile ? JSON.parse(savedProfile) : defaultProf,
        workouts: savedWorkouts ? JSON.parse(savedWorkouts) : INITIAL_MOCK_WORKOUTS,
        activeWorkout: savedActive ? JSON.parse(savedActive) : null,
        records: savedRecords ? JSON.parse(savedRecords) : INITIAL_RECORDS,
        chatHistory: savedChat ? JSON.parse(savedChat) : INITIAL_CHAT,
        statEntries: savedStats ? JSON.parse(savedStats) : INITIAL_STAT_ENTRIES,
        isLoaded: true,
      });
    } catch (e) {
      console.warn('Error loading user storage, using defaults:', e);
      set({
        activeUserId: userId,
        profile: defaultProf,
        isLoaded: true,
      });
    }
  },

  logoutUser: () => {
    set({ activeUserId: null });
  },

  updateProfile: async (updates) => {
    const keys = getStorageKeys(get().activeUserId);
    const updated = { ...get().profile, ...updates };
    set({ profile: updated });
    await AsyncStorage.setItem(keys.PROFILE, JSON.stringify(updated));
  },

  setActiveWorkout: async (workout) => {
    const keys = getStorageKeys(get().activeUserId);
    set({ activeWorkout: workout });
    if (workout) {
      await AsyncStorage.setItem(keys.ACTIVE_WORKOUT, JSON.stringify(workout));
    } else {
      await AsyncStorage.removeItem(keys.ACTIVE_WORKOUT);
    }
  },

  updateActiveSet: (blockIndex, setIndex, updates) => {
    const active = get().activeWorkout;
    if (!active) return;

    const newBlocks = [...active.blocks];
    const targetBlock = { ...newBlocks[blockIndex] };
    const newSets = [...targetBlock.sets];
    newSets[setIndex] = { ...newSets[setIndex], ...updates };
    targetBlock.sets = newSets;
    newBlocks[blockIndex] = targetBlock;

    const updatedWorkout = { ...active, blocks: newBlocks };
    set({ activeWorkout: updatedWorkout });
    const keys = getStorageKeys(get().activeUserId);
    AsyncStorage.setItem(keys.ACTIVE_WORKOUT, JSON.stringify(updatedWorkout));
  },

  toggleSetCompleted: (blockIndex, setIndex) => {
    const active = get().activeWorkout;
    if (!active) return;
    const currentCompleted = active.blocks[blockIndex]?.sets[setIndex]?.completed ?? false;
    get().updateActiveSet(blockIndex, setIndex, { completed: !currentCompleted });
  },

  finishActiveWorkout: async (feedback) => {
    const active = get().activeWorkout;
    if (!active) return null;

    const completedWorkout: Workout = {
      ...active,
      status: 'completed',
      completedAt: new Date().toISOString(),
      durationMin: feedback?.durationMin ?? active.durationMin,
      actualDurationSec: feedback?.actualDurationSec ?? active.actualDurationSec,
      postRpe: feedback?.postRpe ?? 7,
      athleteNotes: feedback?.notes,
      coachFeedback: feedback?.coachFeedback,
    };

    // Detección automática de nuevos PRs
    const currentRecords = [...get().records];
    let newRecordsFound = false;

    for (const block of completedWorkout.blocks) {
      for (const s of block.sets) {
        if (!s.completed) continue;

        // Comprobar vatios máximos
        if (s.actualWattsAvg) {
          const existing = currentRecords.find(
            (r) => r.exerciseName === s.exerciseName && r.metricType === 'max_watts'
          );
          if (!existing || s.actualWattsAvg > existing.recordValue) {
            newRecordsFound = true;
            if (existing) {
              existing.recordValue = s.actualWattsAvg;
              existing.date = new Date().toISOString().split('T')[0];
              existing.workoutTitle = completedWorkout.title;
            } else {
              currentRecords.push({
                id: 'pr_' + Date.now() + Math.random().toString(36).substring(2, 5),
                exerciseName: s.exerciseName,
                metricType: 'max_watts',
                recordValue: s.actualWattsAvg,
                unit: 'W',
                date: new Date().toISOString().split('T')[0],
                workoutTitle: completedWorkout.title,
              });
            }
          }
        }

        // Comprobar peso máximo (kg)
        if (s.actualWeightKg) {
          const existing = currentRecords.find(
            (r) => r.exerciseName === s.exerciseName && r.metricType === '1RM_kg'
          );
          if (!existing || s.actualWeightKg > existing.recordValue) {
            newRecordsFound = true;
            if (existing) {
              existing.recordValue = s.actualWeightKg;
              existing.date = new Date().toISOString().split('T')[0];
              existing.workoutTitle = completedWorkout.title;
            } else {
              currentRecords.push({
                id: 'pr_' + Date.now() + Math.random().toString(36).substring(2, 5),
                exerciseName: s.exerciseName,
                metricType: '1RM_kg',
                recordValue: s.actualWeightKg,
                unit: 'kg',
                date: new Date().toISOString().split('T')[0],
                workoutTitle: completedWorkout.title,
              });
            }
          }
        }
      }
    }

    const updatedWorkouts = [completedWorkout, ...get().workouts];
    const currentProfile = get().profile;
    const keys = getStorageKeys(get().activeUserId);

    // Análisis de Test Inicial o Progresión Semanal Automática
    let updatedProfile = { ...currentProfile };
    let updatedChat = [...get().chatHistory];
    let profileChanged = false;
    let chatChanged = false;

    if (completedWorkout.isAssessment) {
      let measuredBikeW = currentProfile.bikeFtpWatts;
      let measuredRowW = currentProfile.rowFtpWatts;

      for (const b of completedWorkout.blocks) {
        for (const s of b.sets) {
          const nameLower = s.exerciseName.toLowerCase();
          if (nameLower.includes('bici') && s.actualWattsAvg) {
            measuredBikeW = Math.round(s.actualWattsAvg * 0.94);
          }
          if (nameLower.includes('remo') && s.actualWattsAvg) {
            measuredRowW = Math.round(s.actualWattsAvg * 0.95);
          }
        }
      }

      const avgWkg = ((measuredBikeW + measuredRowW) / 2) / (currentProfile.weightKg || 75);
      let level: UserProfile['fitnessLevel'] = 'intermedio';
      if (avgWkg < 2.2) level = 'principiante';
      else if (avgWkg < 2.95) level = 'intermedio';
      else if (avgWkg < 3.6) level = 'avanzado';
      else level = 'elite';

      updatedProfile = {
        ...currentProfile,
        bikeFtpWatts: measuredBikeW,
        rowFtpWatts: measuredRowW,
        fitnessLevel: level,
        assessmentCompleted: true,
        progressionWeek: 1,
      };
      profileChanged = true;

      updatedChat.push({
        id: 'msg_coach_test_' + Date.now(),
        sender: 'coach',
        text: `¡Brutal trabajo en el Test Inicial, ${currentProfile.name}! He analizado tus marcas: tu nivel actual es ${level.toUpperCase()} (FTP Bici: ${measuredBikeW} W | Potencia Remo: ${measuredRowW} W). A partir de ahora todos tus entrenamientos se ajustarán con sobrecarga progresiva semanal (Semana 1 Base). ¿Listo para empezar?`,
        timestamp: new Date().toISOString(),
      });
      chatChanged = true;
    } else {
      // Cada 3 entrenos completados avanzamos 1 semana de sobrecarga progresiva
      const completedCount = updatedWorkouts.filter((w) => w.status === 'completed' && !w.isAssessment).length;
      const nextWeek = Math.max(1, Math.floor(completedCount / 3) + 1);
      if (nextWeek !== (currentProfile.progressionWeek || 1)) {
        updatedProfile = { ...currentProfile, progressionWeek: nextWeek };
        profileChanged = true;
      }

      // Guardar impresiones del atleta y respuesta del Coach en la memoria del chat
      if (feedback?.notes || feedback?.coachFeedback) {
        const nowIso = new Date().toISOString();
        if (feedback.notes) {
          updatedChat.push({
            id: 'msg_post_user_' + Date.now(),
            sender: 'user',
            text: `He terminado "${completedWorkout.title}" (${completedWorkout.durationMin} min, RPE ${completedWorkout.postRpe}/10). Mis impresiones: ${feedback.notes}`,
            timestamp: nowIso,
          });
        }
        if (feedback.coachFeedback) {
          updatedChat.push({
            id: 'msg_post_coach_' + (Date.now() + 1),
            sender: 'coach',
            text: feedback.coachFeedback,
            timestamp: nowIso,
          });
        }
        chatChanged = true;
      }
    }

    set({
      workouts: updatedWorkouts,
      activeWorkout: null,
      records: currentRecords,
      profile: updatedProfile,
      chatHistory: updatedChat,
    });

    await Promise.all([
      AsyncStorage.setItem(keys.WORKOUTS, JSON.stringify(updatedWorkouts)),
      AsyncStorage.removeItem(keys.ACTIVE_WORKOUT),
      newRecordsFound ? AsyncStorage.setItem(keys.RECORDS, JSON.stringify(currentRecords)) : Promise.resolve(),
      profileChanged ? AsyncStorage.setItem(keys.PROFILE, JSON.stringify(updatedProfile)) : Promise.resolve(),
      chatChanged ? AsyncStorage.setItem(keys.CHAT, JSON.stringify(updatedChat)) : Promise.resolve(),
    ]);

    return completedWorkout;
  },

  addWorkout: async (workout) => {
    const keys = getStorageKeys(get().activeUserId);
    const updated = [workout, ...get().workouts];
    set({ workouts: updated });
    await AsyncStorage.setItem(keys.WORKOUTS, JSON.stringify(updated));
  },

  addChatMessage: async (msg) => {
    const keys = getStorageKeys(get().activeUserId);
    const updated = [...get().chatHistory, msg];
    set({ chatHistory: updated });
    await AsyncStorage.setItem(keys.CHAT, JSON.stringify(updated));
  },

  addStatEntry: async (entry) => {
    const keys = getStorageKeys(get().activeUserId);
    const updated = [entry, ...get().statEntries];
    set({ statEntries: updated });
    await AsyncStorage.setItem(keys.STAT_ENTRIES, JSON.stringify(updated));
  },

  deleteStatEntry: async (id) => {
    const keys = getStorageKeys(get().activeUserId);
    const updated = get().statEntries.filter((e) => e.id !== id);
    set({ statEntries: updated });
    await AsyncStorage.setItem(keys.STAT_ENTRIES, JSON.stringify(updated));
  },

  clearActiveWorkout: () => {
    const keys = getStorageKeys(get().activeUserId);
    set({ activeWorkout: null });
    AsyncStorage.removeItem(keys.ACTIVE_WORKOUT);
  },
}));
