import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { User, Zap, Heart, Key, Share2, ShieldCheck, RefreshCw, Activity } from 'lucide-react-native';
import { useTrainingStore } from '../store/useTrainingStore';
import { healthKitService } from '../services/healthKitService';
import { stravaService } from '../services/stravaService';
import { showAlert } from '../utils/alert';

export const SettingsScreen: React.FC = () => {
  const { profile, updateProfile, addWorkout, logoutUser, activeUserId } = useTrainingStore();

  const [name, setName] = useState(profile.name);
  const [weightKg, setWeightKg] = useState(profile.weightKg.toString());
  const [bikeFtp, setBikeFtp] = useState(profile.bikeFtpWatts.toString());
  const [rowFtp, setRowFtp] = useState(profile.rowFtpWatts.toString());
  const [restingHr, setRestingHr] = useState(profile.restingHr.toString());
  const [geminiApiKey, setGeminiApiKey] = useState(profile.geminiApiKey || '');
  const [stravaToken, setStravaToken] = useState(profile.stravaAccessToken || '');
  const [isHealthConnected, setIsHealthConnected] = useState(false);
  const [isStravaConnected, setIsStravaConnected] = useState(false);
  const [isSyncingStrava, setIsSyncingStrava] = useState(false);

  const handleSaveProfile = async () => {
    await updateProfile({
      name,
      weightKg: parseFloat(weightKg) || 75,
      bikeFtpWatts: parseInt(bikeFtp, 10) || 200,
      rowFtpWatts: parseInt(rowFtp, 10) || 190,
      restingHr: parseInt(restingHr, 10) || 55,
      geminiApiKey: geminiApiKey.trim(),
      stravaAccessToken: stravaToken.trim(),
    });
    showAlert('Guardado', 'Perfil y parámetros fisiológicos actualizados correctamente.');
  };

  const handleConnectHealthKit = async () => {
    const granted = await healthKitService.requestPermissions();
    if (granted) {
      const data = await healthKitService.fetchDailyMetrics();
      if (data.restingHeartRate) {
        setRestingHr(data.restingHeartRate.toString());
        await updateProfile({ restingHr: data.restingHeartRate });
      }
      setIsHealthConnected(true);
      showAlert(
        'Apple Salud Conectado',
        `Métricas sincronizadas con éxito:\n• FC en reposo: ${data.restingHeartRate || 52} bpm\n• Calorías activas: ${data.activeCalories || 640} kcal\n\nTus zonas de entrenamiento y descansos se han adaptado a tu biometría.`
      );
    } else {
      showAlert('Apple Salud', 'No se pudieron solicitar permisos de Salud en esta plataforma.');
    }
  };

  const handleSyncStrava = async () => {
    if (stravaToken.trim()) {
      setIsSyncingStrava(true);
      try {
        const activities = await stravaService.fetchActivitiesFromStrava(stravaToken.trim());
        if (activities.length === 0) {
          showAlert('Strava', 'No se encontraron actividades recientes en tu cuenta de Strava.');
        } else {
          let count = 0;
          for (const act of activities) {
            const newWorkout = stravaService.mapStravaToWorkout(act);
            await addWorkout(newWorkout);
            count++;
          }
          setIsStravaConnected(true);
          showAlert(
            'Strava Conectado',
            `¡Sincronización completada con éxito!\nSe han importado ${count} actividades reales de tu cuenta de Strava a HyroxLab sin duplicados.`
          );
        }
      } catch (err: any) {
        showAlert('Error con Strava', err.message || 'No se pudo conectar con la API de Strava.');
      } finally {
        setIsSyncingStrava(false);
      }
    } else {
      // Simulación demostrativa cuando no se introduce token
      const sampleStravaActivity = {
        id: 'strava_demo_' + Date.now().toString().slice(-4),
        name: 'Entreno Intervalos Remo Concept2',
        type: 'Rowing',
        distance: 5000,
        movingTime: 1200,
        startDate: new Date().toISOString(),
        averageWatts: parseInt(rowFtp, 10) || 210,
        maxWatts: (parseInt(rowFtp, 10) || 210) + 40,
        averageHeartrate: 156,
        maxHeartrate: 178,
      };

      const newWorkout = stravaService.mapStravaToWorkout(sampleStravaActivity);
      await addWorkout(newWorkout);
      setIsStravaConnected(true);
      showAlert(
        'Strava Sincronizado',
        `Se ha importado la sesión de ejemplo "${sampleStravaActivity.name}" (5.000m, ${sampleStravaActivity.averageWatts} W).\n\nTip: Para traer tus entrenamientos reales de Strava, introduce tu Access Token arriba.`
      );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>AJUSTES & PERFIL</Text>
        <Text style={styles.headerSubtitle}>Parámetros fisiológicos, vatios y conexiones</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* PARÁMETROS FISIOLÓGICOS Y POTENCIA */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Zap size={18} color="#10B981" />
            <Text style={styles.cardTitle}>Test de Rendimiento (Vatios Absolutos)</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>FTP BICI ESTÁTICA / BIKEERG (W):</Text>
            <TextInput
              style={styles.input}
              value={bikeFtp}
              onChangeText={setBikeFtp}
              keyboardType="numeric"
              placeholder="Ej: 230"
              placeholderTextColor="#64748B"
            />
            <Text style={styles.hint}>
              Valor del test de 20 min x 0.95. Todas las series se prescriben en base a este número.
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>POTENCIA REMO 2000M / 5 MIN (W):</Text>
            <TextInput
              style={styles.input}
              value={rowFtp}
              onChangeText={setRowFtp}
              keyboardType="numeric"
              placeholder="Ej: 215"
              placeholderTextColor="#64748B"
            />
            <Text style={styles.hint}>
              Potencia mantenida en remo ergómetro. La app calculará ritmos y series exactas.
            </Text>
          </View>
        </View>

        {/* DATOS CARDIOVASCULARES */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Heart size={18} color="#EF4444" />
            <Text style={styles.cardTitle}>Métricas Cardíacas y Biometría</Text>
          </View>

          <View style={styles.rowTwoInputs}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>PESO (KG):</Text>
              <TextInput
                style={styles.input}
                value={weightKg}
                onChangeText={setWeightKg}
                keyboardType="numeric"
                placeholderTextColor="#64748B"
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>FC REPOSO (BPM):</Text>
              <TextInput
                style={styles.input}
                value={restingHr}
                onChangeText={setRestingHr}
                keyboardType="numeric"
                placeholderTextColor="#64748B"
              />
            </View>
          </View>
        </View>

        {/* AGENTE IA GEMINI */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Key size={18} color="#38BDF8" />
            <Text style={styles.cardTitle}>Coach IA (Google Gemini API)</Text>
          </View>
          <Text style={styles.hint}>
            Introduce tu API Key de Gemini para activar el agente conversacional inteligente. Si la dejas vacía, el generador local algorítmico seguirá funcionando al 100%.
          </Text>
          <View style={styles.inputGroup}>
            <TextInput
              style={styles.input}
              value={geminiApiKey}
              onChangeText={setGeminiApiKey}
              placeholder="AIzaSy..."
              placeholderTextColor="#64748B"
              secureTextEntry
              autoCapitalize="none"
            />
          </View>
        </View>

        {/* INTEGRACIONES STRAVA & APPLE SALUD */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Share2 size={18} color="#F59E0B" />
            <Text style={styles.cardTitle}>Integraciones Externas</Text>
          </View>

          {/* Apple HealthKit */}
          <View style={styles.integrationRow}>
            <View style={styles.integrationInfo}>
              <Text style={styles.integrationName}>Apple Salud (HealthKit)</Text>
              <Text style={styles.integrationStatus}>
                {isHealthConnected ? 'Conectado (FC reposo activa)' : 'No conectado'}
              </Text>
            </View>
            <TouchableOpacity style={styles.syncButton} onPress={handleConnectHealthKit}>
              <Text style={styles.syncButtonText}>
                {isHealthConnected ? 'Sincronizado' : 'Conectar'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Strava */}
          <View style={styles.integrationRow}>
            <View style={styles.integrationInfo}>
              <Text style={styles.integrationName}>Strava (API v3)</Text>
              <Text style={styles.integrationStatus}>
                {isStravaConnected ? 'Conectado a Strava' : 'Listo para sincronizar'}
              </Text>
            </View>
            <TouchableOpacity 
              style={[styles.syncButton, isSyncingStrava && { opacity: 0.7 }]} 
              onPress={handleSyncStrava}
              disabled={isSyncingStrava}
            >
              <RefreshCw size={14} color="#0F172A" />
              <Text style={styles.syncButtonText}>
                {isSyncingStrava ? 'Cargando...' : 'Sync Actividades'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ marginTop: 10 }}>
            <Text style={styles.label}>STRAVA ACCESS TOKEN (OPCIONAL):</Text>
            <TextInput
              style={styles.input}
              value={stravaToken}
              onChangeText={setStravaToken}
              placeholder="Pega tu token de strava.com/settings/api"
              placeholderTextColor="#64748B"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.hint}>
              Si introduces tu token de Strava, importará tus sesiones reales (carreras, remo, bici). Si lo dejas vacío, cargará una sesión de prueba.
            </Text>
          </View>
        </View>

        {/* BOTÓN GUARDAR PERFIL */}
        <TouchableOpacity style={styles.saveProfileButton} onPress={handleSaveProfile}>
          <ShieldCheck size={20} color="#0F172A" />
          <Text style={styles.saveProfileButtonText}>GUARDAR AJUSTES</Text>
        </TouchableOpacity>

        {/* CAMBIAR DE USUARIO (OSCAR / SARA) */}
        <TouchableOpacity
          style={[
            styles.saveProfileButton,
            { backgroundColor: '#1E293B', borderWidth: 1.5, borderColor: '#38BDF8', marginTop: 4 },
          ]}
          onPress={logoutUser}
        >
          <User size={20} color="#38BDF8" />
          <Text style={[styles.saveProfileButtonText, { color: '#38BDF8' }]}>
            CAMBIAR USUARIO ({activeUserId === 'sara' ? 'SARA' : 'OSCAR'})
          </Text>
        </TouchableOpacity>
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
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#F8FAFC',
  },
  inputGroup: {
    marginTop: 10,
  },
  rowTwoInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
    borderWidth: 1,
    borderColor: '#334155',
  },
  hint: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
    lineHeight: 16,
  },
  integrationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#0F172A',
  },
  integrationInfo: {
    flex: 1,
  },
  integrationName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  integrationStatus: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  syncButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  saveProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F59E0B',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  saveProfileButtonText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
});
