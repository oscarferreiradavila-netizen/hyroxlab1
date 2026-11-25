import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { Play, Pause, RotateCcw, Check, Plus, Minus, Flag, ArrowLeft } from 'lucide-react-native';
import { useTrainingStore } from '../store/useTrainingStore';
import { showAlert } from '../utils/alert';
import { wattsToBikeKmh, wattsToRow500mSec, formatPace500m } from '../utils/ergMath';
import { analyzePostWorkoutImpressions } from '../services/geminiCoach';

const QUICK_FEELINGS = [
  '💪 Me sentí fuerte',
  '😮‍💨 Exigente pero bien',
  '🔋 Algo cansado',
  '⚠️ Con ligera molestia',
];

interface WorkoutScreenProps {
  onBackToToday: () => void;
}

export const WorkoutScreen: React.FC<WorkoutScreenProps> = ({ onBackToToday }) => {
  const {
    profile,
    activeWorkout,
    updateActiveSet,
    toggleSetCompleted,
    finishActiveWorkout,
    clearActiveWorkout,
  } = useTrainingStore();

  // Temporizador Gym
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);

  // Modal de finalización
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [rpe, setRpe] = useState<number>(7);
  const [notes, setNotes] = useState('');
  const [manualDurationMin, setManualDurationMin] = useState<string>('');
  const [isAnalyzingFinish, setIsAnalyzingFinish] = useState(false);

  useEffect(() => {
    let interval: any = null;
    if (isActive) {
      interval = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    } else if (!isActive && seconds !== 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isActive, seconds]);

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAdjustWatts = (bIdx: number, sIdx: number, currentWatts: number | undefined, delta: number) => {
    const base = currentWatts || 200;
    const nextWatts = Math.max(50, base + delta);
    updateActiveSet(bIdx, sIdx, { actualWattsAvg: nextWatts });
  };

  const handleAdjustWeight = (bIdx: number, sIdx: number, currentKg: number | undefined, delta: number) => {
    const base = currentKg || 20;
    const nextKg = Math.max(0, base + delta);
    updateActiveSet(bIdx, sIdx, { actualWeightKg: nextKg });
  };

  const handleAdjustReps = (bIdx: number, sIdx: number, currentReps: number | undefined, delta: number) => {
    const base = currentReps || 10;
    const nextReps = Math.max(1, base + delta);
    updateActiveSet(bIdx, sIdx, { actualReps: nextReps });
  };

  const handleOpenFinishModal = () => {
    const computedMins = seconds >= 60 ? Math.round(seconds / 60) : (activeWorkout?.durationMin || 45);
    setManualDurationMin(computedMins.toString());
    setShowFinishModal(true);
  };

  const handleConfirmFinish = async () => {
    if (!activeWorkout) return;
    setIsAnalyzingFinish(true);
    const parsedMin = parseInt(manualDurationMin, 10) || activeWorkout.durationMin || 45;
    const totalSec = seconds > 0 ? seconds : parsedMin * 60;

    const previewWorkout = {
      ...activeWorkout,
      durationMin: parsedMin,
      actualDurationSec: totalSec,
      postRpe: rpe,
      athleteNotes: notes.trim(),
    };

    const coachReply = await analyzePostWorkoutImpressions(previewWorkout, profile);

    await finishActiveWorkout({
      postRpe: rpe,
      notes: notes.trim(),
      durationMin: parsedMin,
      actualDurationSec: totalSec,
      coachFeedback: coachReply,
    });

    setIsAnalyzingFinish(false);
    setShowFinishModal(false);
    setIsActive(false);
    setSeconds(0);
    setNotes('');
    showAlert('💬 Respuesta de tu Coach', coachReply);
    onBackToToday();
  };

  if (!activeWorkout) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>NO HAY SESIÓN ACTIVA</Text>
        <Text style={styles.emptySubtitle}>
          Selecciona o genera un entrenamiento desde la pestaña "Hoy" para entrar en el Modo Gym.
        </Text>
        <TouchableOpacity style={styles.goBackButton} onPress={onBackToToday}>
          <ArrowLeft size={20} color="#0F172A" />
          <Text style={styles.goBackButtonText}>IR A LA PANTALLA HOY</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* HUD DE TIEMPO GYM (FUENTE GIGANTE) */}
      <View style={styles.timerHud}>
        <View style={styles.timerHudTop}>
          <Text style={styles.workoutHeaderTitle} numberOfLines={1}>
            {activeWorkout.title}
          </Text>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => {
              showAlert('Cancelar Sesión', '¿Deseas descartar el entrenamiento actual?', [
                { text: 'No', style: 'cancel' },
                {
                  text: 'Descartar',
                  style: 'destructive',
                  onPress: () => {
                    clearActiveWorkout();
                    onBackToToday();
                  },
                },
              ]);
            }}
          >
            <Text style={styles.cancelButtonText}>Descartar</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.giantTimer}>{formatTimer(seconds)}</Text>

        <View style={styles.timerControlsRow}>
          <TouchableOpacity
            style={[styles.timerButton, isActive ? styles.timerButtonPause : styles.timerButtonPlay]}
            onPress={() => setIsActive(!isActive)}
          >
            {isActive ? (
              <>
                <Pause size={20} color="#0F172A" />
                <Text style={styles.timerButtonText}>PAUSA</Text>
              </>
            ) : (
              <>
                <Play size={20} color="#0F172A" fill="#0F172A" />
                <Text style={styles.timerButtonText}>INICIAR</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.timerButtonReset}
            onPress={() => {
              setIsActive(false);
              setSeconds(0);
            }}
          >
            <RotateCcw size={18} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.timerButtonFinish}
            onPress={handleOpenFinishModal}
          >
            <Flag size={20} color="#0F172A" />
            <Text style={styles.timerButtonFinishText}>FINALIZAR</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* LISTA DE EJERCICIOS Y SERIES EN VIVO */}
      <ScrollView contentContainerStyle={styles.exerciseScroll}>
        {activeWorkout.blocks.map((block, bIdx) => (
          <View key={block.id || bIdx} style={styles.blockContainer}>
            <View style={styles.blockHeader}>
              <Text style={styles.blockTitleBadge}>{block.blockType.toUpperCase()}</Text>
              <Text style={styles.blockTitle}>{block.title}</Text>
            </View>

            {block.instructions && (
              <Text style={styles.blockInstructionsText}>{block.instructions}</Text>
            )}

            {block.sets.map((set, sIdx) => {
              const currentWatts = set.actualWattsAvg ?? set.targetWatts;
              const currentWeight = set.actualWeightKg ?? set.targetWeightKg;
              const currentReps = set.actualReps ?? set.targetReps;
              const currentDist = set.actualDistanceM ?? set.targetDistanceM;
              const currentDurationSec = set.actualDurationSec ?? set.targetDurationSec ?? 0;
              const durMin = Math.floor(currentDurationSec / 60);
              const durSec = currentDurationSec % 60;
              const isDone = set.completed;

              return (
                <View
                  key={set.id || sIdx}
                  style={[styles.setCard, isDone && styles.setCardCompleted]}
                >
                  <View style={styles.setCardTop}>
                    <View style={styles.setCardInfo}>
                      <Text style={styles.setExerciseName}>{set.exerciseName}</Text>
                      {set.isNoImpactAlternative && (
                        <Text style={styles.noImpactTag}>ZERO IMPACT ALT</Text>
                      )}
                    </View>

                    {/* Botón de Check Gigante */}
                    <TouchableOpacity
                      style={[styles.checkButtonLarge, isDone && styles.checkButtonLargeActive]}
                      onPress={() => toggleSetCompleted(bIdx, sIdx)}
                    >
                      <Check size={28} color={isDone ? '#0F172A' : '#475569'} strokeWidth={3} />
                    </TouchableOpacity>
                  </View>

                  {/* CASILLAS EDITABLES PARA PESO, TIEMPO, VATIOS Y REPS */}
                  <View style={styles.controlsGrid}>
                    {/* Casilla de Peso / Carga (kg) - Disponible en TODOS los movimientos */}
                    <View style={styles.metricAdjustBox}>
                      <Text style={styles.metricAdjustLabel}>CARGA (KG)</Text>
                      <View style={styles.adjustRow}>
                        <TouchableOpacity
                          style={styles.adjustButtonSmall}
                          onPress={() => handleAdjustWeight(bIdx, sIdx, currentWeight, -2.5)}
                        >
                          <Minus size={16} color="#F8FAFC" />
                        </TouchableOpacity>
                        <TextInput
                          style={styles.numericInputBox}
                          value={currentWeight !== undefined ? currentWeight.toString() : ''}
                          onChangeText={(txt) => {
                            const cleaned = txt.replace(',', '.');
                            const val = parseFloat(cleaned);
                            updateActiveSet(bIdx, sIdx, {
                              actualWeightKg: isNaN(val) ? undefined : val,
                            });
                          }}
                          keyboardType="numeric"
                          placeholder="0"
                          placeholderTextColor="#475569"
                        />
                        <TouchableOpacity
                          style={styles.adjustButtonSmall}
                          onPress={() => handleAdjustWeight(bIdx, sIdx, currentWeight, +2.5)}
                        >
                          <Plus size={16} color="#F8FAFC" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Casilla de Tiempo (min : seg) para Remos, Piscina, Bici, etc. */}
                    <View style={styles.metricAdjustBox}>
                      <Text style={styles.metricAdjustLabel}>TIEMPO (MIN : SEG)</Text>
                      <View style={styles.timeInputRow}>
                        <TextInput
                          style={styles.timeNumericInput}
                          value={durMin > 0 || currentDurationSec > 0 ? durMin.toString() : ''}
                          onChangeText={(txt) => {
                            const m = Math.max(0, parseInt(txt, 10) || 0);
                            updateActiveSet(bIdx, sIdx, {
                              actualDurationSec: m * 60 + durSec,
                            });
                          }}
                          keyboardType="numeric"
                          placeholder="00"
                          placeholderTextColor="#475569"
                          maxLength={3}
                        />
                        <Text style={styles.timeColon}>:</Text>
                        <TextInput
                          style={styles.timeNumericInput}
                          value={durSec > 0 || currentDurationSec > 0 ? durSec.toString().padStart(2, '0') : ''}
                          onChangeText={(txt) => {
                            const s = Math.min(59, Math.max(0, parseInt(txt, 10) || 0));
                            updateActiveSet(bIdx, sIdx, {
                              actualDurationSec: durMin * 60 + s,
                            });
                          }}
                          keyboardType="numeric"
                          placeholder="00"
                          placeholderTextColor="#475569"
                          maxLength={2}
                        />
                      </View>
                    </View>

                    {/* Control de Vatios (para Bici/Remo/SkiErg) */}
                    {set.targetWatts !== undefined && (
                      <View style={styles.metricAdjustBox}>
                        <Text style={styles.metricAdjustLabel}>POTENCIA (W)</Text>
                        <View style={styles.adjustRow}>
                          <TouchableOpacity
                            style={styles.adjustButtonSmall}
                            onPress={() => handleAdjustWatts(bIdx, sIdx, currentWatts, -5)}
                          >
                            <Minus size={16} color="#F8FAFC" />
                          </TouchableOpacity>
                          <TextInput
                            style={[styles.numericInputBox, { color: '#38BDF8' }]}
                            value={currentWatts !== undefined ? currentWatts.toString() : ''}
                            onChangeText={(txt) => {
                              const val = parseInt(txt, 10);
                              updateActiveSet(bIdx, sIdx, {
                                actualWattsAvg: isNaN(val) ? undefined : val,
                              });
                            }}
                            keyboardType="numeric"
                            placeholder="0"
                            placeholderTextColor="#475569"
                          />
                          <TouchableOpacity
                            style={styles.adjustButtonSmall}
                            onPress={() => handleAdjustWatts(bIdx, sIdx, currentWatts, +5)}
                          >
                            <Plus size={16} color="#F8FAFC" />
                          </TouchableOpacity>
                        </View>
                        {currentWatts !== undefined && currentWatts > 0 && (
                          <Text style={{ fontSize: 11, fontWeight: '800', color: '#94A3B8', marginTop: 4 }}>
                            {set.exerciseName.toLowerCase().includes('bici') || set.exerciseName.toLowerCase().includes('bike')
                              ? `~${wattsToBikeKmh(currentWatts)} km/h`
                              : formatPace500m(wattsToRow500mSec(currentWatts))}
                          </Text>
                        )}
                      </View>
                    )}

                    {/* Control de Reps */}
                    {set.targetReps !== undefined && (
                      <View style={styles.metricAdjustBox}>
                        <Text style={styles.metricAdjustLabel}>REPS</Text>
                        <View style={styles.adjustRow}>
                          <TouchableOpacity
                            style={styles.adjustButtonSmall}
                            onPress={() => handleAdjustReps(bIdx, sIdx, currentReps, -1)}
                          >
                            <Minus size={16} color="#F8FAFC" />
                          </TouchableOpacity>
                          <TextInput
                            style={[styles.numericInputBox, { color: '#10B981' }]}
                            value={currentReps !== undefined ? currentReps.toString() : ''}
                            onChangeText={(txt) => {
                              const val = parseInt(txt, 10);
                              updateActiveSet(bIdx, sIdx, {
                                actualReps: isNaN(val) ? undefined : val,
                              });
                            }}
                            keyboardType="numeric"
                            placeholder="0"
                            placeholderTextColor="#475569"
                          />
                          <TouchableOpacity
                            style={styles.adjustButtonSmall}
                            onPress={() => handleAdjustReps(bIdx, sIdx, currentReps, +1)}
                          >
                            <Plus size={16} color="#F8FAFC" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}

                    {/* Distancia editable */}
                    {set.targetDistanceM !== undefined && (
                      <View style={styles.metricAdjustBox}>
                        <Text style={styles.metricAdjustLabel}>DISTANCIA (M)</Text>
                        <TextInput
                          style={[styles.numericInputBox, { color: '#CBD5E1', width: 76 }]}
                          value={currentDist !== undefined ? currentDist.toString() : ''}
                          onChangeText={(txt) => {
                            const val = parseInt(txt, 10);
                            updateActiveSet(bIdx, sIdx, {
                              actualDistanceM: isNaN(val) ? undefined : val,
                            });
                          }}
                          keyboardType="numeric"
                          placeholder="0"
                          placeholderTextColor="#475569"
                        />
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        ))}
      </ScrollView>

      {/* MODAL DE FINALIZACIÓN Y RPE */}
      <Modal visible={showFinishModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>REGISTRO DE SESIÓN</Text>

            <View style={styles.durationModalRow}>
              <Text style={styles.notesLabel}>Tiempo total de entrenamiento (min):</Text>
              <TextInput
                style={styles.durationModalInput}
                value={manualDurationMin}
                onChangeText={setManualDurationMin}
                keyboardType="numeric"
                placeholder="45"
                placeholderTextColor="#64748B"
                maxLength={3}
              />
            </View>

            <Text style={styles.modalSubtitle}>¿Qué nivel de esfuerzo percibido (RPE) has sentido?</Text>

            <View style={styles.rpeSelector}>
              {[6, 7, 8, 9, 10].map((num) => (
                <TouchableOpacity
                  key={num}
                  style={[styles.rpeButton, rpe === num && styles.rpeButtonActive]}
                  onPress={() => setRpe(num)}
                >
                  <Text style={[styles.rpeButtonText, rpe === num && styles.rpeButtonTextActive]}>
                    {num}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.notesLabel}>¿Qué sentiste entrenando? (Impresiones para tu Coach):</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {QUICK_FEELINGS.map((feel) => (
                <TouchableOpacity
                  key={feel}
                  style={{
                    backgroundColor: '#0F172A',
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: '#334155',
                  }}
                  onPress={() => setNotes((prev) => (prev ? `${prev}. ${feel}` : feel))}
                >
                  <Text style={{ color: '#CBD5E1', fontSize: 11, fontWeight: '700' }}>{feel}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.notesInput}
              placeholder="Cuéntale al entrenador cómo te notaste, cargas, respiración o molestias..."
              placeholderTextColor="#64748B"
              value={notes}
              onChangeText={setNotes}
              multiline
            />

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowFinishModal(false)}
                disabled={isAnalyzingFinish}
              >
                <Text style={styles.modalCancelText}>Volver</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveButton, isAnalyzingFinish && { opacity: 0.7 }]}
                onPress={handleConfirmFinish}
                disabled={isAnalyzingFinish}
              >
                <Text style={styles.modalSaveText}>
                  {isAnalyzingFinish ? 'ANALIZANDO...' : 'ENVIAR Y GUARDAR'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#F8FAFC',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  goBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  goBackButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  timerHud: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#334155',
  },
  timerHudTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  workoutHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#94A3B8',
    flex: 1,
  },
  cancelButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  cancelButtonText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '700',
  },
  giantTimer: {
    fontSize: 48,
    fontWeight: '900',
    color: '#F8FAFC',
    textAlign: 'center',
    letterSpacing: 2,
    marginVertical: 4,
    fontVariant: ['tabular-nums'],
  },
  timerControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  timerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  timerButtonPlay: {
    backgroundColor: '#10B981',
  },
  timerButtonPause: {
    backgroundColor: '#F59E0B',
  },
  timerButtonText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
  },
  timerButtonReset: {
    backgroundColor: '#334155',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerButtonFinish: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#38BDF8',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    gap: 6,
  },
  timerButtonFinishText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
  },
  exerciseScroll: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  blockContainer: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  blockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  blockTitleBadge: {
    fontSize: 10,
    fontWeight: '900',
    color: '#F59E0B',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  blockTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  blockInstructionsText: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 10,
    fontStyle: 'italic',
  },
  setCard: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 14,
    marginTop: 10,
    borderWidth: 1.5,
    borderColor: '#334155',
  },
  setCardCompleted: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
  },
  setCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  setCardInfo: {
    flex: 1,
  },
  setExerciseName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  noImpactTag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#10B981',
    marginTop: 2,
  },
  checkButtonLarge: {
    backgroundColor: '#1E293B',
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#334155',
  },
  checkButtonLargeActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  controlsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricAdjustBox: {
    backgroundColor: '#1E293B',
    padding: 8,
    borderRadius: 10,
    minWidth: 110,
    flex: 1,
  },
  metricAdjustLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 4,
  },
  adjustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  adjustButtonSmall: {
    backgroundColor: '#334155',
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValueWatts: {
    fontSize: 15,
    fontWeight: '900',
    color: '#10B981',
  },
  metricValueKg: {
    fontSize: 15,
    fontWeight: '900',
    color: '#F59E0B',
  },
  metricValueReps: {
    fontSize: 15,
    fontWeight: '900',
    color: '#38BDF8',
  },
  metricValueDist: {
    fontSize: 15,
    fontWeight: '900',
    color: '#E2E8F0',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#F8FAFC',
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 16,
  },
  rpeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  rpeButton: {
    flex: 1,
    backgroundColor: '#0F172A',
    paddingVertical: 12,
    marginHorizontal: 3,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  rpeButtonActive: {
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B',
  },
  rpeButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#94A3B8',
  },
  rpeButtonTextActive: {
    color: '#0F172A',
  },
  notesLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 6,
    fontWeight: '700',
  },
  notesInput: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 12,
    color: '#F8FAFC',
    fontSize: 13,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#334155',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#F8FAFC',
    fontWeight: '700',
  },
  modalSaveButton: {
    flex: 2,
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalSaveText: {
    color: '#0F172A',
    fontWeight: '900',
  },
  numericInputBox: {
    backgroundColor: '#1E293B',
    color: '#F59E0B',
    fontSize: 16,
    fontWeight: '900',
    minWidth: 52,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    textAlign: 'center',
  },
  timeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeNumericInput: {
    backgroundColor: '#1E293B',
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '900',
    width: 44,
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    textAlign: 'center',
  },
  timeColon: {
    color: '#94A3B8',
    fontSize: 16,
    fontWeight: '900',
  },
  durationModalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 10,
  },
  durationModalInput: {
    backgroundColor: '#0F172A',
    color: '#F59E0B',
    fontSize: 16,
    fontWeight: '900',
    width: 72,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    textAlign: 'center',
  },
});
