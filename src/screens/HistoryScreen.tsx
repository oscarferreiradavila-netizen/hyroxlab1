import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Calendar, Clock, Flame, Heart, Zap, Award } from 'lucide-react-native';
import { useTrainingStore } from '../store/useTrainingStore';

export const HistoryScreen: React.FC = () => {
  const { workouts } = useTrainingStore();
  const completedList = workouts.filter((w) => w.status === 'completed');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>HISTORIAL DE SESIONES</Text>
        <Text style={styles.headerSubtitle}>
          {completedList.length} entrenamientos registrados sin impacto
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollList}>
        {completedList.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>Aún no has completado entrenamientos.</Text>
          </View>
        ) : (
          completedList.map((workout) => {
            const dateStr = workout.completedAt
              ? new Date(workout.completedAt).toLocaleDateString('es-ES', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
              : workout.scheduledDate;

            // Extraer métricas resumen de los sets
            let totalWatts = 0;
            let countWatts = 0;
            for (const b of workout.blocks) {
              for (const s of b.sets) {
                if (s.actualWattsAvg) {
                  totalWatts += s.actualWattsAvg;
                  countWatts++;
                }
              }
            }
            const avgWatts = countWatts > 0 ? Math.round(totalWatts / countWatts) : null;

            return (
              <View key={workout.id} style={styles.workoutCard}>
                <View style={styles.cardTopRow}>
                  <Text style={styles.cardTitle}>{workout.title}</Text>
                  {workout.postRpe && (
                    <View style={styles.rpeBadge}>
                      <Text style={styles.rpeBadgeText}>RPE {workout.postRpe}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <Calendar size={13} color="#94A3B8" />
                    <Text style={styles.metaText}>{dateStr}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Clock size={13} color="#94A3B8" />
                    <Text style={styles.metaText}>{workout.durationMin} min</Text>
                  </View>
                  {avgWatts && (
                    <View style={styles.metaItem}>
                      <Zap size={13} color="#10B981" />
                      <Text style={styles.metaTextWatts}>{avgWatts} W avg</Text>
                    </View>
                  )}
                  {workout.heartRate?.avgHr && (
                    <View style={styles.metaItem}>
                      <Heart size={13} color="#EF4444" />
                      <Text style={styles.metaTextHr}>{workout.heartRate.avgHr} bpm</Text>
                    </View>
                  )}
                </View>

                {workout.athleteNotes && (
                  <Text style={styles.notesText}>"{workout.athleteNotes}"</Text>
                )}

                {workout.coachFeedback && (
                  <View
                    style={{
                      backgroundColor: '#0F172A',
                      borderLeftWidth: 3,
                      borderLeftColor: '#10B981',
                      padding: 10,
                      borderRadius: 8,
                      marginBottom: 8,
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#10B981', marginBottom: 2 }}>
                      💬 FEEDBACK DEL COACH:
                    </Text>
                    <Text style={{ fontSize: 12, color: '#CBD5E1', lineHeight: 17 }}>
                      {workout.coachFeedback}
                    </Text>
                  </View>
                )}

                {/* Zonas de FC si existen */}
                {workout.heartRate?.timeInZ1Sec !== undefined && (
                  <View style={styles.zonesBarContainer}>
                    <Text style={styles.zonesLabel}>Distribución Zonas FC (Z1 - Z5):</Text>
                    <View style={styles.zonesBar}>
                      <View style={[styles.zoneSegment, { flex: 2, backgroundColor: '#38BDF8' }]} />
                      <View style={[styles.zoneSegment, { flex: 4, backgroundColor: '#10B981' }]} />
                      <View style={[styles.zoneSegment, { flex: 4, backgroundColor: '#F59E0B' }]} />
                      <View style={[styles.zoneSegment, { flex: 2, backgroundColor: '#EF4444' }]} />
                      <View style={[styles.zoneSegment, { flex: 1, backgroundColor: '#A855F7' }]} />
                    </View>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    padding: 16,
    paddingTop: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#F8FAFC',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
  },
  scrollList: {
    padding: 16,
    gap: 12,
  },
  emptyBox: {
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748B',
    fontSize: 14,
  },
  workoutCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F8FAFC',
    flex: 1,
  },
  rpeBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  rpeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#F59E0B',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  metaTextWatts: {
    fontSize: 12,
    fontWeight: '800',
    color: '#10B981',
  },
  metaTextHr: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
  },
  notesText: {
    fontSize: 12,
    color: '#CBD5E1',
    fontStyle: 'italic',
    backgroundColor: '#0F172A',
    padding: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  zonesBarContainer: {
    marginTop: 10,
  },
  zonesLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '700',
    marginBottom: 4,
  },
  zonesBar: {
    flexDirection: 'row',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
  },
  zoneSegment: {
    height: '100%',
  },
});
