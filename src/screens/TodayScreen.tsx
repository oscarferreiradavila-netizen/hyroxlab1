import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Sparkles, Send, Play, Dumbbell, Zap, CheckCircle2, Clock, ShieldAlert } from 'lucide-react-native';
import { useTrainingStore } from '../store/useTrainingStore';
import { askGeminiCoach } from '../services/geminiCoach';
import { generateCombinedWorkout, generateInitialAssessmentWorkout } from '../services/workoutGenerator';
import { Workout, TrainingModality } from '../types/training';
import { WorkoutWhiteboard } from '../components/WorkoutWhiteboard';

const MODALITY_OPTIONS: { key: TrainingModality; label: string; emoji: string }[] = [
  { key: 'bike_erg', label: 'Bici', emoji: '🚴' },
  { key: 'rowing', label: 'Remo', emoji: '🚣' },
  { key: 'crossfit_no_impact', label: 'CrossFit', emoji: '🏋️' },
  { key: 'hyrox_adapted', label: 'Hyrox', emoji: '⚡' },
  { key: 'swimming', label: 'Nadar', emoji: '🏊' },
  { key: 'strength', label: 'Pesas', emoji: '💪' },
];

interface TodayScreenProps {
  onStartWorkout: (workout: Workout) => void;
}

export const TodayScreen: React.FC<TodayScreenProps> = ({ onStartWorkout }) => {
  const { profile, workouts, statEntries, records, chatHistory, addChatMessage, setActiveWorkout, updateProfile } = useTrainingStore();
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState<number>(45);
  const [customDurationText, setCustomDurationText] = useState<string>('45');
  const [selectedModalities, setSelectedModalities] = useState<TrainingModality[]>(['hyrox_adapted']);
  const [proposedWorkout, setProposedWorkout] = useState<Workout | null>(null);
  const [coachNote, setCoachNote] = useState<string>('');
  const [variantCounter, setVariantCounter] = useState<number>(0);

  useEffect(() => {
    if (!proposedWorkout) {
      if (!profile.assessmentCompleted) {
        setProposedWorkout(generateInitialAssessmentWorkout(profile));
        setCoachNote(
          `¡Hola ${profile.name}! Antes de empezar las semanas progresivas, completa este Test Inicial para que calcule tu nivel real y tus vatios/pesos base.`
        );
      } else {
        setProposedWorkout(
          generateCombinedWorkout(selectedModalities, selectedDuration, 'normal', profile, workouts, statEntries)
        );
        setCoachNote(
          `Semana ${profile.progressionWeek || 1} (${(profile.fitnessLevel || 'intermedio').toUpperCase()}). Sesión sin impacto adaptada a tus marcas.`
        );
      }
    }
  }, [profile.name]);

  const durationQuickOptions = [20, 30, 45, 60, 90];

  const handleToggleModality = (mod: TrainingModality) => {
    const exists = selectedModalities.includes(mod);
    let next: TrainingModality[];
    if (exists) {
      if (selectedModalities.length === 1) return; // Mantener al menos 1 seleccionada
      next = selectedModalities.filter((m) => m !== mod);
    } else {
      next = [...selectedModalities, mod];
    }
    setSelectedModalities(next);
    const workout = generateCombinedWorkout(next, selectedDuration, 'normal', profile, workouts, statEntries);
    setProposedWorkout(workout);
    setCoachNote(`Entreno personalizado para ${next.length > 1 ? 'combinar disciplinas' : 'tu sesión'} en Semana ${profile.progressionWeek || 1}.`);
  };

  const handleQuickDuration = (min: number) => {
    setSelectedDuration(min);
    setCustomDurationText(min.toString());
    const quickWorkout = generateCombinedWorkout(selectedModalities, min, 'normal', profile, workouts, statEntries);
    setProposedWorkout(quickWorkout);
  };

  const handleRegenerateWhiteboard = () => {
    const nextSeed = variantCounter + 1;
    setVariantCounter(nextSeed);
    const fakeHistoryShift = Array.from({ length: nextSeed }, (_, i) => ({
      ...workouts[0],
      id: 'shift_' + i,
      modality: selectedModalities[0],
    }));
    const varied = generateCombinedWorkout(
      selectedModalities,
      selectedDuration,
      'normal',
      profile,
      [...fakeHistoryShift, ...workouts],
      statEntries
    );
    setProposedWorkout(varied);
    setCoachNote(`Nueva variación generada (Opción ${(nextSeed % 3) + 1}). Mantén la técnica limpia y cero impacto.`);
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const userText = inputText.trim();
    setInputText('');

    // Agregar mensaje del usuario
    await addChatMessage({
      id: 'msg_' + Date.now(),
      sender: 'user',
      text: userText,
      timestamp: new Date().toISOString(),
    });

    setIsLoading(true);

    try {
      const response = await askGeminiCoach(userText, profile, workouts, chatHistory, statEntries, records);

      await addChatMessage({
        id: 'msg_' + Date.now(),
        sender: 'coach',
        text: response.text,
        timestamp: new Date().toISOString(),
        suggestedWorkout: response.workout,
      });

      if (response.workout) {
        setProposedWorkout(response.workout);
        setCoachNote(response.text);
      }
    } catch (e: any) {
      console.warn('Error in coach communication:', e);
      await addChatMessage({
        id: 'msg_err_' + Date.now(),
        sender: 'coach',
        text: `Hubo un problema al conectar con la IA (${e?.message || 'error de red'}). Inténtalo de nuevo.`,
        timestamp: new Date().toISOString(),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptWorkout = (workout: Workout) => {
    setActiveWorkout(workout);
    onStartWorkout(workout);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Cabecera */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>HOLA, {profile.name.toUpperCase()}</Text>
            <Text style={styles.subGreeting}>
              {profile.assessmentCompleted
                ? `Nivel: ${(profile.fitnessLevel || 'intermedio').toUpperCase()} • Semana ${profile.progressionWeek || 1} de Progresión`
                : 'Tu Entrenador Personal (Evaluación Inicial)'}
            </Text>
          </View>
          <View style={styles.badgeZeroImpact}>
            <ShieldAlert size={14} color="#F59E0B" />
            <Text style={styles.badgeZeroImpactText}>NO IMPACTO ACTIVO</Text>
          </View>
        </View>

        {/* TEST DE NIVEL INICIAL DEL ENTRENADOR PERSONAL */}
        {!profile.assessmentCompleted && (
          <View
            style={{
              backgroundColor: '#1E293B',
              borderRadius: 16,
              padding: 16,
              marginBottom: 20,
              borderWidth: 1.5,
              borderColor: '#38BDF8',
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '900', color: '#38BDF8', marginBottom: 6 }}>
              🎯 PASO 1: TEST INICIAL DE NIVEL (ENTRENADOR PERSONAL)
            </Text>
            <Text style={{ fontSize: 13, color: '#CBD5E1', lineHeight: 19, marginBottom: 12 }}>
              Antes de diseñarte entrenamientos progresivos, necesito medir tu nivel real en Bici, Remo y Fuerza sin impacto. Al completarlo, ajustaré tus vatios, pesos y semanas automáticamente.
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={{
                  flex: 2,
                  backgroundColor: '#38BDF8',
                  paddingVertical: 12,
                  borderRadius: 10,
                  alignItems: 'center',
                }}
                onPress={() => {
                  const testWorkout = generateInitialAssessmentWorkout(profile);
                  handleAcceptWorkout(testWorkout);
                }}
              >
                <Text style={{ color: '#0F172A', fontWeight: '900', fontSize: 13 }}>
                  INICIAR TEST DE NIVEL
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: '#0F172A',
                  paddingVertical: 12,
                  borderRadius: 10,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: '#334155',
                }}
                onPress={() => updateProfile({ assessmentCompleted: true, fitnessLevel: 'intermedio', progressionWeek: 1 })}
              >
                <Text style={{ color: '#94A3B8', fontWeight: '700', fontSize: 12 }}>
                  Saltar Test
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Selector de Partes / Modalidades del Entrenamiento */}
        <View style={styles.quickDurationContainer}>
          <Text style={styles.sectionLabel}>¿QUÉ PARTES QUIERES HACER HOY? (ELIGE UNA O VARIAS)</Text>
          <View style={styles.modalitiesGrid}>
            {MODALITY_OPTIONS.map((opt) => {
              const isSelected = selectedModalities.includes(opt.key);
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.modalityChip, isSelected && styles.modalityChipActive]}
                  onPress={() => handleToggleModality(opt.key)}
                >
                  <Text style={styles.modalityEmoji}>{opt.emoji}</Text>
                  <Text style={[styles.modalityText, isSelected && styles.modalityTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Selector Rápido de Tiempo */}
        <View style={styles.quickDurationContainer}>
          <Text style={styles.sectionLabel}>¿CUÁNTO TIEMPO TIENES HOY?</Text>
          <View style={styles.durationButtonsRow}>
            {durationQuickOptions.map((min) => {
              const isSelected = selectedDuration === min;
              return (
                <TouchableOpacity
                  key={min}
                  style={[styles.durationButton, isSelected && styles.durationButtonActive]}
                  onPress={() => handleQuickDuration(min)}
                >
                  <Clock size={16} color={isSelected ? '#0F172A' : '#94A3B8'} />
                  <Text style={[styles.durationButtonText, isSelected && styles.durationButtonTextActive]}>
                    {min} min
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.customDurationRow}>
            <Text style={styles.customDurationLabel}>Tiempo exacto (min):</Text>
            <TextInput
              style={styles.customDurationInput}
              value={customDurationText}
              onChangeText={setCustomDurationText}
              keyboardType="numeric"
              placeholder="Ej: 50"
              placeholderTextColor="#64748B"
              maxLength={3}
            />
            <TouchableOpacity
              style={styles.customDurationApplyBtn}
              onPress={() => {
                const mins = parseInt(customDurationText, 10);
                if (mins > 0) {
                  handleQuickDuration(mins);
                }
              }}
            >
              <Text style={styles.customDurationApplyText}>Generar</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* PIZARRA DEL ENTRENADOR PERSONAL */}
        {proposedWorkout && (
          <WorkoutWhiteboard
            workout={proposedWorkout}
            athleteName={profile.name}
            coachNote={coachNote}
            onStartWorkout={handleAcceptWorkout}
            onRegenerate={handleRegenerateWhiteboard}
          />
        )}

        {/* Chat con el Entrenador IA */}
        <View style={styles.chatSection}>
          <View style={styles.chatHeader}>
            <Sparkles size={18} color="#10B981" />
            <Text style={styles.chatHeaderTitle}>
              Coach IA {profile.geminiApiKey ? '(Conectado)' : '(Modo Local)'}
            </Text>
          </View>

          <View style={styles.messagesList}>
            {chatHistory.slice(-4).map((msg) => {
              const isCoach = msg.sender === 'coach';
              return (
                <View
                  key={msg.id}
                  style={[styles.messageBubble, isCoach ? styles.coachBubble : styles.userBubble]}
                >
                  <Text style={[styles.messageSender, isCoach && styles.coachSender]}>
                    {isCoach ? 'ENTRENADOR' : 'TÚ'}
                  </Text>
                  <Text style={styles.messageText}>{msg.text}</Text>
                </View>
              );
            })}
            {isLoading && (
              <View style={[styles.messageBubble, styles.coachBubble, styles.loadingBubble]}>
                <ActivityIndicator size="small" color="#10B981" />
                <Text style={styles.loadingText}>Ajustando vatios y descansos...</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Input de Chat */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          placeholder="Ej: hoy solo 30 min, o cámbialo por remo..."
          placeholderTextColor="#64748B"
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={handleSendMessage}
        />
        <TouchableOpacity
          style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
          onPress={handleSendMessage}
          disabled={!inputText.trim() || isLoading}
        >
          <Send size={18} color="#0F172A" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    marginTop: 8,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '900',
    color: '#F8FAFC',
    letterSpacing: 0.5,
  },
  subGreeting: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
  },
  badgeZeroImpact: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F59E0B',
    gap: 4,
  },
  badgeZeroImpactText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#F59E0B',
  },
  quickDurationContainer: {
    marginBottom: 20,
  },
  modalitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modalityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#334155',
    gap: 6,
    minWidth: '30%',
    flexGrow: 1,
    justifyContent: 'center',
  },
  modalityChipActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.18)',
    borderColor: '#F59E0B',
  },
  modalityEmoji: {
    fontSize: 16,
  },
  modalityText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94A3B8',
  },
  modalityTextActive: {
    color: '#F59E0B',
    fontWeight: '900',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  durationButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  durationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    gap: 6,
    flex: 1,
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: '#334155',
  },
  durationButtonActive: {
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B',
  },
  durationButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
  },
  durationButtonTextActive: {
    color: '#0F172A',
  },
  customDurationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: '#1E293B',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 10,
  },
  customDurationLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
    flex: 1,
  },
  customDurationInput: {
    backgroundColor: '#0F172A',
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '800',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#475569',
    width: 72,
    textAlign: 'center',
  },
  customDurationApplyBtn: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
  },
  customDurationApplyText: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '900',
  },
  workoutProposalCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1.5,
    borderColor: '#F59E0B',
  },
  proposalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    paddingBottom: 10,
  },
  proposalHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  proposalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F8FAFC',
    flexShrink: 1,
  },
  proposalDuration: {
    fontSize: 13,
    fontWeight: '900',
    color: '#F59E0B',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  proposalBlocksContainer: {
    gap: 12,
    marginBottom: 16,
  },
  blockRow: {
    backgroundColor: '#0F172A',
    padding: 12,
    borderRadius: 10,
  },
  blockTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#38BDF8',
    marginBottom: 4,
  },
  blockInstructions: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  setPreviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  setPreviewExercise: {
    fontSize: 13,
    color: '#E2E8F0',
    flex: 1,
  },
  setPreviewTargetBadge: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  wattsHighlight: {
    fontSize: 12,
    fontWeight: '800',
    color: '#10B981',
  },
  weightHighlight: {
    fontSize: 12,
    fontWeight: '800',
    color: '#F59E0B',
  },
  distHighlight: {
    fontSize: 12,
    fontWeight: '700',
    color: '#38BDF8',
  },
  repsHighlight: {
    fontSize: 12,
    fontWeight: '700',
    color: '#CBD5E1',
  },
  moreSetsText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
  },
  startWorkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  startWorkoutButtonText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  chatSection: {
    marginBottom: 10,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  chatHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#10B981',
  },
  messagesList: {
    gap: 10,
  },
  messageBubble: {
    padding: 12,
    borderRadius: 12,
  },
  coachBubble: {
    backgroundColor: '#1E293B',
    borderLeftWidth: 3,
    borderLeftColor: '#10B981',
  },
  userBubble: {
    backgroundColor: '#334155',
    alignSelf: 'flex-end',
    maxWidth: '85%',
  },
  coachSender: {
    color: '#10B981',
  },
  messageSender: {
    fontSize: 10,
    fontWeight: '900',
    color: '#94A3B8',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  messageText: {
    fontSize: 13,
    color: '#F1F5F9',
    lineHeight: 18,
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#1E293B',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    alignItems: 'center',
    gap: 10,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#0F172A',
    color: '#F8FAFC',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    fontSize: 14,
  },
  sendButton: {
    backgroundColor: '#10B981',
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#475569',
  },
});
