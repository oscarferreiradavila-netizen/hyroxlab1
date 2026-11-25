import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Sparkles, Dumbbell, History, BarChart2, Settings } from 'lucide-react-native';
import { useTrainingStore } from './src/store/useTrainingStore';
import { TodayScreen } from './src/screens/TodayScreen';
import { WorkoutScreen } from './src/screens/WorkoutScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { StatsScreen } from './src/screens/StatsScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { UserSelectionScreen } from './src/screens/UserSelectionScreen';
import { Workout } from './src/types/training';

type Tab = 'today' | 'workout' | 'history' | 'stats' | 'settings';

export default function App() {
  const [currentTab, setCurrentTab] = useState<Tab>('today');
  const { isLoaded, loadState, activeUserId } = useTrainingStore();

  useEffect(() => {
    loadState();
  }, []);

  const handleStartWorkout = (workout: Workout) => {
    setCurrentTab('workout');
  };

  if (!isLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F59E0B" />
        <Text style={styles.loadingText}>Cargando HyroxLab...</Text>
      </View>
    );
  }

  if (!activeUserId) {
    return <UserSelectionScreen />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" backgroundColor="#0F172A" />

      {/* CUERPO PRINCIPAL SEGÚN PESTAÑA */}
      <View style={styles.content}>
        {currentTab === 'today' && <TodayScreen onStartWorkout={handleStartWorkout} />}
        {currentTab === 'workout' && <WorkoutScreen onBackToToday={() => setCurrentTab('today')} />}
        {currentTab === 'history' && <HistoryScreen />}
        {currentTab === 'stats' && <StatsScreen />}
        {currentTab === 'settings' && <SettingsScreen />}
      </View>

      {/* BARRA DE NAVEGACIÓN INFERIOR (ESTILO GYM) */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, currentTab === 'today' && styles.tabItemActive]}
          onPress={() => setCurrentTab('today')}
        >
          <Sparkles size={20} color={currentTab === 'today' ? '#F59E0B' : '#64748B'} />
          <Text style={[styles.tabLabel, currentTab === 'today' && styles.tabLabelActive]}>
            Hoy
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, currentTab === 'workout' && styles.tabItemActive]}
          onPress={() => setCurrentTab('workout')}
        >
          <Dumbbell size={20} color={currentTab === 'workout' ? '#F59E0B' : '#64748B'} />
          <Text style={[styles.tabLabel, currentTab === 'workout' && styles.tabLabelActive]}>
            Entrenar
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, currentTab === 'history' && styles.tabItemActive]}
          onPress={() => setCurrentTab('history')}
        >
          <History size={20} color={currentTab === 'history' ? '#F59E0B' : '#64748B'} />
          <Text style={[styles.tabLabel, currentTab === 'history' && styles.tabLabelActive]}>
            Historial
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, currentTab === 'stats' && styles.tabItemActive]}
          onPress={() => setCurrentTab('stats')}
        >
          <BarChart2 size={20} color={currentTab === 'stats' ? '#F59E0B' : '#64748B'} />
          <Text style={[styles.tabLabel, currentTab === 'stats' && styles.tabLabelActive]}>
            Estadísticas
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, currentTab === 'settings' && styles.tabItemActive]}
          onPress={() => setCurrentTab('settings')}
        >
          <Settings size={20} color={currentTab === 'settings' ? '#F59E0B' : '#64748B'} />
          <Text style={[styles.tabLabel, currentTab === 'settings' && styles.tabLabelActive]}>
            Ajustes
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    paddingVertical: 8,
    paddingBottom: 10,
    justifyContent: 'space-around',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    flex: 1,
  },
  tabItemActive: {
    // Activo
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    marginTop: 4,
  },
  tabLabelActive: {
    color: '#F59E0B',
  },
});
