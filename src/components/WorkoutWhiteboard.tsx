import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Play, RefreshCw, ClipboardList, ShieldAlert } from 'lucide-react-native';
import { Workout } from '../types/training';
import { wattsToBikeKmh, wattsToRow500mSec, formatPace500m } from '../utils/ergMath';

interface WorkoutWhiteboardProps {
  workout: Workout;
  athleteName: string;
  coachNote?: string;
  onStartWorkout: (workout: Workout) => void;
  onRegenerate?: () => void;
}

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

export const WorkoutWhiteboard: React.FC<WorkoutWhiteboardProps> = ({
  workout,
  athleteName,
  coachNote,
  onStartWorkout,
  onRegenerate,
}) => {
  return (
    <View style={styles.board}>
      {/* MARCO SUPERIOR ESTILO PIZARRA DE BOX */}
      <View style={styles.boardTopBar}>
        <View style={styles.boardTitleRow}>
          <ClipboardList size={20} color="#F59E0B" />
          <Text style={styles.boardTag}>PIZARRA DEL ENTRENADOR</Text>
        </View>
        <View style={styles.durationPill}>
          <Text style={styles.durationText}>{workout.durationMin} MIN</Text>
        </View>
      </View>

      <Text style={styles.workoutTitle}>{workout.title}</Text>
      <Text style={styles.boardMeta}>
        Atleta: {athleteName} • Fecha: {workout.scheduledDate} • Cero Impacto
      </Text>

      {/* NOTA TÁCTICA DEL COACH */}
      {coachNote && (
        <View style={styles.coachNoteBox}>
          <Text style={styles.coachNoteLabel}>💬 INDICACIONES DEL COACH:</Text>
          <Text style={styles.coachNoteText}>{coachNote}</Text>
        </View>
      )}

      {/* BLOQUES EN LA PIZARRA (A, B, C...) */}
      <View style={styles.blocksList}>
        {workout.blocks.map((block, bIdx) => {
          const letter = LETTERS[bIdx] || `${bIdx + 1}`;
          return (
            <View key={block.id || bIdx} style={styles.blockSection}>
              <View style={styles.blockHeaderRow}>
                <View style={styles.letterBadge}>
                  <Text style={styles.letterText}>{letter}</Text>
                </View>
                <Text style={styles.blockTitle}>{block.title}</Text>
                {block.rounds && block.rounds > 1 && (
                  <View style={styles.roundsBadge}>
                    <Text style={styles.roundsText}>{block.rounds} RONDAS</Text>
                  </View>
                )}
              </View>

              {block.instructions && (
                <Text style={styles.blockInstructions}>{block.instructions}</Text>
              )}

              <View style={styles.setsContainer}>
                {block.sets.map((s, sIdx) => {
                  const isBike =
                    s.exerciseName.toLowerCase().includes('bici') ||
                    s.exerciseName.toLowerCase().includes('bike');
                  const isRowOrSki =
                    s.exerciseName.toLowerCase().includes('remo') ||
                    s.exerciseName.toLowerCase().includes('row') ||
                    s.exerciseName.toLowerCase().includes('ski');

                  const extraPace =
                    s.targetWatts && isBike
                      ? ` (~${wattsToBikeKmh(s.targetWatts)} km/h)`
                      : s.targetWatts && isRowOrSki
                      ? ` (${formatPace500m(wattsToRow500mSec(s.targetWatts))})`
                      : '';

                  return (
                    <View key={s.id || sIdx} style={styles.setLine}>
                      <View style={styles.setLeft}>
                        <Text style={styles.setBullet}>•</Text>
                        <Text style={styles.setName}>{s.exerciseName}</Text>
                        {s.isNoImpactAlternative && (
                          <ShieldAlert size={12} color="#F59E0B" style={{ marginLeft: 4 }} />
                        )}
                      </View>

                      <View style={styles.setTargets}>
                        {s.targetDistanceM !== undefined && (
                          <Text style={styles.targetChip}>{s.targetDistanceM} m</Text>
                        )}
                        {s.targetDurationSec !== undefined && (
                          <Text style={styles.targetChip}>
                            {Math.floor(s.targetDurationSec / 60)}:
                            {(s.targetDurationSec % 60).toString().padStart(2, '0')}
                          </Text>
                        )}
                        {s.targetReps !== undefined && (
                          <Text style={styles.targetChip}>{s.targetReps} reps</Text>
                        )}
                        {s.targetWeightKg !== undefined && (
                          <Text style={[styles.targetChip, styles.targetWeight]}>
                            {s.targetWeightKg} kg
                          </Text>
                        )}
                        {s.targetWatts !== undefined && (
                          <Text style={[styles.targetChip, styles.targetWatts]}>
                            {s.targetWatts} W{extraPace}
                          </Text>
                        )}
                        {s.targetPacePer100m && (
                          <Text style={[styles.targetChip, styles.targetWatts]}>
                            {s.targetPacePer100m}
                          </Text>
                        )}
                        {s.targetRestSec !== undefined && (
                          <Text style={styles.restText}>Desc: {s.targetRestSec}s</Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })}
      </View>

      {/* BOTONES DE ACCIÓN DE LA PIZARRA */}
      <View style={styles.actionsRow}>
        {onRegenerate && (
          <TouchableOpacity style={styles.regenButton} onPress={onRegenerate}>
            <RefreshCw size={16} color="#CBD5E1" />
            <Text style={styles.regenText}>OTRA VARIACIÓN</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.startButton} onPress={() => onStartWorkout(workout)}>
          <Play size={18} color="#0F172A" fill="#0F172A" />
          <Text style={styles.startText}>EMPEZAR EN MODO GYM</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  board: {
    backgroundColor: '#111827',
    borderRadius: 18,
    padding: 16,
    marginBottom: 22,
    borderWidth: 2,
    borderColor: '#F59E0B',
  },
  boardTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  boardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  boardTag: {
    fontSize: 12,
    fontWeight: '900',
    color: '#F59E0B',
    letterSpacing: 1,
  },
  durationPill: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  durationText: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '900',
  },
  workoutTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  boardMeta: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
    marginBottom: 12,
  },
  coachNoteBox: {
    backgroundColor: '#1E293B',
    borderLeftWidth: 3,
    borderLeftColor: '#38BDF8',
    padding: 10,
    borderRadius: 8,
    marginBottom: 14,
  },
  coachNoteLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: '#38BDF8',
    marginBottom: 3,
  },
  coachNoteText: {
    fontSize: 12,
    color: '#E2E8F0',
    lineHeight: 18,
  },
  blocksList: {
    gap: 14,
    marginBottom: 16,
  },
  blockSection: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  blockHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  letterBadge: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterText: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '900',
  },
  blockTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  roundsBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  roundsText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#10B981',
  },
  blockInstructions: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
    marginBottom: 8,
    lineHeight: 17,
  },
  setsContainer: {
    gap: 8,
  },
  setLine: {
    borderTopWidth: 1,
    borderTopColor: '#293548',
    paddingTop: 7,
  },
  setLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  setBullet: {
    color: '#F59E0B',
    fontSize: 16,
    fontWeight: '900',
    marginRight: 6,
  },
  setName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F1F5F9',
    flexShrink: 1,
  },
  setTargets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingLeft: 14,
    alignItems: 'center',
  },
  targetChip: {
    backgroundColor: '#0F172A',
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  targetWeight: {
    color: '#F59E0B',
  },
  targetWatts: {
    color: '#38BDF8',
  },
  restText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  regenButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#475569',
    gap: 6,
  },
  regenText: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '800',
  },
  startButton: {
    flex: 1.6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F59E0B',
    paddingVertical: 13,
    borderRadius: 12,
    gap: 8,
  },
  startText: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '900',
  },
});
