import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Award, Zap, Heart, Activity, Flame, Plus, Trash2, Clock, TrendingUp } from 'lucide-react-native';
import { useTrainingStore } from '../store/useTrainingStore';
import { StatCategory, StatEntry } from '../types/training';
import { showAlert } from '../utils/alert';
import { ProgressChart, ChartDataPoint } from '../components/ProgressChart';
import { wattsToRow500mSec, formatPace500m, wattsToBikeKmh } from '../utils/ergMath';

type StatsTab = 'overview' | StatCategory;

const TABS: { key: StatsTab; label: string; emoji: string }[] = [
  { key: 'overview', label: 'Resumen', emoji: '📊' },
  { key: 'strength', label: 'Pesas', emoji: '💪' },
  { key: 'crossfit', label: 'CrossFit & Heroes', emoji: '🏋️' },
  { key: 'rowing', label: 'Remo', emoji: '🚣' },
  { key: 'bike', label: 'Bici', emoji: '🚴' },
  { key: 'swimming', label: 'Nadar', emoji: '🏊' },
  { key: 'hyrox', label: 'Hyrox', emoji: '⚡' },
];

const PRESETS: Record<StatCategory, string[]> = {
  strength: [
    'Sentadilla (Back Squat)',
    'Peso Muerto (Deadlift)',
    'Press Banca',
    'Press Militar',
    'Hip Thrust',
    'Remo con Barra',
    'Dominadas Lastradas',
  ],
  crossfit: [
    'Murph',
    'Fran',
    'Cindy',
    'Grace',
    'Helen',
    'DT',
    'Isabel',
    'Karen',
    'Clean & Jerk',
    'Snatch',
    'Thruster',
  ],
  rowing: ['500m Remo', '1.000m Remo', '2.000m Remo', '5.000m Remo', '10.000m Remo'],
  bike: ['1 km BikeErg', '4 km BikeErg', '10 km BikeErg', '20 km BikeErg', 'Test 20 min FTP'],
  swimming: ['100m Crol', '200m Crol', '400m Crol', '750m Crol', '1.000m Crol', '1.500m Crol'],
  hyrox: [
    'SkiErg 1.000m',
    'Sled Push 50m',
    'Sled Pull 50m',
    'Burpee Broad Jump 80m',
    'Remo 1.000m',
    'Farmers Carry 200m',
    'Sandbag Lunges 100m',
    'Wall Balls 100',
  ],
};

function formatTime(sec?: number): string {
  if (!sec || sec <= 0) return '-';
  const hrs = Math.floor(sec / 3600);
  const mins = Math.floor((sec % 3600) / 60);
  const secs = sec % 60;
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatShortDate(isoDate: string): string {
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const mIdx = parseInt(parts[1], 10) - 1;
  return `${parseInt(parts[2], 10)} ${months[mIdx] || parts[1]}`;
}

export const StatsScreen: React.FC = () => {
  const { profile, records, workouts, statEntries, addStatEntry, deleteStatEntry } = useTrainingStore();
  const [activeTab, setActiveTab] = useState<StatsTab>('overview');
  const [selectedChartName, setSelectedChartName] = useState<string>('');

  // Formulario de nueva marca
  const [nameInput, setNameInput] = useState('');
  const [weightInput, setWeightInput] = useState('');
  const [repsInput, setRepsInput] = useState('');
  const [distanceInput, setDistanceInput] = useState('');
  const [timeMinInput, setTimeMinInput] = useState('');
  const [timeSecInput, setTimeSecInput] = useState('');
  const [wattsInput, setWattsInput] = useState('');
  const [notesInput, setNotesInput] = useState('');

  const completedList = workouts.filter((w) => w.status === 'completed');
  const totalMinutes = completedList.reduce((acc, w) => acc + (w.durationMin || 0), 0);

  const rowSplitSecPer500 =
    profile.rowFtpWatts > 0 ? Math.round(500 * Math.pow(2.8 / profile.rowFtpWatts, 1 / 3)) : 125;
  const estimatedErgTotalSec = 8 * (rowSplitSecPer500 * 2);
  const estimatedStationsTotalSec = 28 * 60;
  const estimatedHyroxTotalMin = Math.round((estimatedErgTotalSec + estimatedStationsTotalSec) / 60);

  const resetForm = () => {
    setNameInput('');
    setWeightInput('');
    setRepsInput('');
    setDistanceInput('');
    setTimeMinInput('');
    setTimeSecInput('');
    setWattsInput('');
    setNotesInput('');
  };

  const handleSelectTab = (tab: StatsTab) => {
    setActiveTab(tab);
    setSelectedChartName('');
    resetForm();
  };

  const handleSelectPreset = (preset: string) => {
    setNameInput(preset);
    // Autocompletar distancia numérica si el preset incluye metros o km
    const kmMatch = preset.match(/(\d+(?:\.\d+)?)\s*km/i);
    const mMatch = preset.match(/(\d+(?:\.\d+)?)\s*m/i);
    if (kmMatch) {
      setDistanceInput((parseFloat(kmMatch[1]) * 1000).toString());
    } else if (mMatch) {
      setDistanceInput(mMatch[1].replace('.', ''));
    } else if (preset.includes('1.000m')) {
      setDistanceInput('1000');
    } else if (preset.includes('2.000m')) {
      setDistanceInput('2000');
    } else if (preset.includes('5.000m')) {
      setDistanceInput('5000');
    } else if (preset.includes('10.000m')) {
      setDistanceInput('10000');
    } else if (preset.includes('1.500m')) {
      setDistanceInput('1500');
    }
  };

  const handleSaveEntry = async () => {
    if (activeTab === 'overview') return;
    if (!nameInput.trim()) {
      showAlert('Falta el nombre', 'Escribe o selecciona un movimiento, Hero WOD o distancia.');
      return;
    }

    const mins = parseInt(timeMinInput, 10) || 0;
    const secs = parseInt(timeSecInput, 10) || 0;
    const totalSec = mins * 60 + secs;

    const newEntry: StatEntry = {
      id: 'st_' + Date.now(),
      category: activeTab,
      name: nameInput.trim(),
      weightKg: weightInput ? parseFloat(weightInput.replace(',', '.')) : undefined,
      reps: repsInput ? parseInt(repsInput, 10) : undefined,
      distanceM: distanceInput ? parseInt(distanceInput, 10) : undefined,
      durationSec: totalSec > 0 ? totalSec : undefined,
      watts: wattsInput ? parseInt(wattsInput, 10) : undefined,
      notes: notesInput.trim() || undefined,
      date: new Date().toISOString().split('T')[0],
    };

    await addStatEntry(newEntry);
    resetForm();
    showAlert('¡Marca Registrada!', `Se ha guardado "${newEntry.name}" en tus estadísticas.`);
  };

  const renderCategoryContent = (cat: StatCategory) => {
    const entries = statEntries.filter((e) => e.category === cat);
    const presets = PRESETS[cat] || [];

    // Nombres únicos registrados para poder filtrar el gráfico
    const uniqueNames = Array.from(new Set(entries.map((e) => e.name)));
    const activeChartName =
      selectedChartName && uniqueNames.includes(selectedChartName)
        ? selectedChartName
        : uniqueNames[0] || '';

    // Datos ordenados cronológicamente (del más antiguo al más reciente) para el gráfico
    const chartEntries = entries
      .filter((e) => e.name === activeChartName)
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date));

    const weightChartData: ChartDataPoint[] = chartEntries
      .filter((e) => e.weightKg !== undefined)
      .map((e) => ({
        label: formatShortDate(e.date),
        value: e.weightKg!,
        displayValue: `${e.weightKg}kg`,
      }));

    const timeChartData: ChartDataPoint[] = chartEntries
      .filter((e) => e.durationSec !== undefined)
      .map((e) => ({
        label: formatShortDate(e.date),
        value: e.durationSec!,
        displayValue: formatTime(e.durationSec),
      }));

    const wattsChartData: ChartDataPoint[] = chartEntries
      .filter((e) => e.watts !== undefined)
      .map((e) => ({
        label: formatShortDate(e.date),
        value: e.watts!,
        displayValue: `${e.watts}W`,
      }));

    // Ritmo /500m para Remo
    const rowPaceChartData: ChartDataPoint[] =
      cat === 'rowing'
        ? chartEntries
            .filter((e) => e.distanceM && e.durationSec)
            .map((e) => {
              const split500 = Math.round((e.durationSec! / e.distanceM!) * 500);
              return {
                label: formatShortDate(e.date),
                value: split500,
                displayValue: formatTime(split500),
              };
            })
        : [];

    // Velocidad km/h para Bici
    const bikeSpeedChartData: ChartDataPoint[] =
      cat === 'bike'
        ? chartEntries
            .filter((e) => e.distanceM && e.durationSec)
            .map((e) => {
              const kmh = Math.round(((e.distanceM! / 1000) / (e.durationSec! / 3600)) * 10) / 10;
              return {
                label: formatShortDate(e.date),
                value: kmh,
                displayValue: `${kmh}`,
              };
            })
        : [];

    return (
      <View style={styles.categoryContainer}>
        {/* GRÁFICOS DE MEJORA DE LA DISCIPLINA */}
        {uniqueNames.length > 0 && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionTitleRow}>
              <TrendingUp size={18} color="#10B981" />
              <Text style={styles.sectionTitle}>GRÁFICO DE MEJORA</Text>
            </View>

            {uniqueNames.length > 1 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 12 }}
              >
                {uniqueNames.map((n) => (
                  <TouchableOpacity
                    key={n}
                    style={[
                      styles.presetChip,
                      activeChartName === n && styles.presetChipActive,
                    ]}
                    onPress={() => setSelectedChartName(n)}
                  >
                    <Text
                      style={[
                        styles.presetChipText,
                        activeChartName === n && styles.presetChipTextActive,
                      ]}
                    >
                      {n}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {weightChartData.length > 0 && (
              <ProgressChart
                title={`Progresión de Peso: ${activeChartName}`}
                subtitle="Carga máxima registrada (kg)"
                data={weightChartData}
                higherIsBetter={true}
                accentColor="#F59E0B"
              />
            )}

            {timeChartData.length > 0 && (
              <ProgressChart
                title={`Evolución de Tiempo: ${activeChartName}`}
                subtitle="Menor tiempo = mayor rendimiento"
                data={timeChartData}
                higherIsBetter={false}
                accentColor="#38BDF8"
              />
            )}

            {wattsChartData.length > 0 && (
              <ProgressChart
                title={`Evolución de Potencia: ${activeChartName}`}
                subtitle="Vatios medios (W)"
                data={wattsChartData}
                higherIsBetter={true}
                accentColor="#10B981"
              />
            )}

            {rowPaceChartData.length > 0 && (
              <ProgressChart
                title={`Ritmo cada 500m: ${activeChartName}`}
                subtitle="Tiempo medio cada 500 metros (min:seg /500m)"
                data={rowPaceChartData}
                higherIsBetter={false}
                accentColor="#F59E0B"
              />
            )}

            {bikeSpeedChartData.length > 0 && (
              <ProgressChart
                title={`Velocidad Media (km/h): ${activeChartName}`}
                subtitle="Kilómetros por hora promedio"
                data={bikeSpeedChartData}
                higherIsBetter={true}
                accentColor="#F59E0B"
              />
            )}
          </View>
        )}

        {/* FORMULARIO PARA AÑADIR MARCA */}
        <View style={styles.sectionCard}>
          <Text style={styles.formTitle}>
            {cat === 'strength' && 'REGISTRAR PESO Y REPS (FUERZA)'}
            {cat === 'crossfit' && 'REGISTRAR WOD / HERO / MOVIMIENTO'}
            {cat === 'rowing' && 'REGISTRAR TIEMPO Y DISTANCIA EN REMO'}
            {cat === 'bike' && 'REGISTRAR TIEMPO Y DISTANCIA EN BICI'}
            {cat === 'swimming' && 'REGISTRAR TIEMPO Y DISTANCIA EN PISCINA'}
            {cat === 'hyrox' && 'REGISTRAR ESTACIÓN HYROX'}
          </Text>

          <Text style={styles.presetsLabel}>Selección rápida (toca para rellenar):</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetsScroll}>
            {presets.map((p) => (
              <TouchableOpacity
                key={p}
                style={[styles.presetChip, nameInput === p && styles.presetChipActive]}
                onPress={() => handleSelectPreset(p)}
              >
                <Text style={[styles.presetChipText, nameInput === p && styles.presetChipTextActive]}>
                  {p}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.inputRowFull}>
            <Text style={styles.inputLabel}>
              {cat === 'strength'
                ? 'MOVIMIENTO:'
                : cat === 'crossfit'
                ? 'HERO WOD / MOVIMIENTO:'
                : cat === 'hyrox'
                ? 'ESTACIÓN:'
                : 'PRUEBA / DISTANCIA:'}
            </Text>
            <TextInput
              style={styles.textInput}
              value={nameInput}
              onChangeText={setNameInput}
              placeholder={
                cat === 'strength'
                  ? 'Ej: Sentadilla, Press Banca...'
                  : cat === 'crossfit'
                  ? 'Ej: Murph, Fran, Snatch...'
                  : 'Ej: 2.000m, 400m Crol, 10 km...'
              }
              placeholderTextColor="#64748B"
            />
          </View>

          {/* CAMPOS NUMÉRICOS SEGÚN TIPO */}
          <View style={styles.numericFieldsGrid}>
            {(cat === 'strength' || cat === 'crossfit' || cat === 'hyrox') && (
              <View style={styles.fieldBox}>
                <Text style={styles.inputLabel}>PESO (KG)</Text>
                <TextInput
                  style={styles.numInput}
                  value={weightInput}
                  onChangeText={setWeightInput}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#64748B"
                />
              </View>
            )}

            {(cat === 'strength' || cat === 'crossfit') && (
              <View style={styles.fieldBox}>
                <Text style={styles.inputLabel}>REPS</Text>
                <TextInput
                  style={styles.numInput}
                  value={repsInput}
                  onChangeText={setRepsInput}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#64748B"
                />
              </View>
            )}

            {(cat === 'rowing' || cat === 'bike' || cat === 'swimming' || cat === 'hyrox') && (
              <View style={styles.fieldBox}>
                <Text style={styles.inputLabel}>DISTANCIA (M)</Text>
                <TextInput
                  style={styles.numInput}
                  value={distanceInput}
                  onChangeText={setDistanceInput}
                  keyboardType="numeric"
                  placeholder="Ej: 2000"
                  placeholderTextColor="#64748B"
                />
              </View>
            )}

            {cat !== 'strength' && (
              <View style={styles.fieldBoxWide}>
                <Text style={styles.inputLabel}>TIEMPO (MIN : SEG)</Text>
                <View style={styles.timeInputsRow}>
                  <TextInput
                    style={styles.timeNumInput}
                    value={timeMinInput}
                    onChangeText={setTimeMinInput}
                    keyboardType="numeric"
                    placeholder="min"
                    placeholderTextColor="#64748B"
                    maxLength={3}
                  />
                  <Text style={styles.timeColon}>:</Text>
                  <TextInput
                    style={styles.timeNumInput}
                    value={timeSecInput}
                    onChangeText={setTimeSecInput}
                    keyboardType="numeric"
                    placeholder="seg"
                    placeholderTextColor="#64748B"
                    maxLength={2}
                  />
                </View>
              </View>
            )}

            {(cat === 'rowing' || cat === 'bike') && (
              <View style={styles.fieldBox}>
                <Text style={styles.inputLabel}>VATIOS (W)</Text>
                <TextInput
                  style={styles.numInput}
                  value={wattsInput}
                  onChangeText={setWattsInput}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#64748B"
                />
              </View>
            )}
          </View>

          <View style={styles.inputRowFull}>
            <Text style={styles.inputLabel}>NOTAS (OPCIONAL):</Text>
            <TextInput
              style={styles.textInput}
              value={notesInput}
              onChangeText={setNotesInput}
              placeholder="Ej: Con chaleco 9kg, Rx, piscina 25m..."
              placeholderTextColor="#64748B"
            />
          </View>

          <TouchableOpacity style={styles.addStatButton} onPress={handleSaveEntry}>
            <Plus size={18} color="#0F172A" />
            <Text style={styles.addStatButtonText}>GUARDAR MARCA</Text>
          </TouchableOpacity>
        </View>

        {/* LISTADO DE MARCAS REGISTRADAS */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionTitleRow}>
            <Award size={18} color="#F59E0B" />
            <Text style={styles.sectionTitle}>TUS MARCAS Y PROGRESIÓN ({entries.length})</Text>
          </View>

          {entries.length === 0 ? (
            <Text style={styles.emptyCatText}>
              Todavía no hay registros en esta categoría. ¡Añade tu primera marca arriba!
            </Text>
          ) : (
            <View style={styles.recordsList}>
              {entries.map((entry) => {
                // Calcular 1RM estimado (Fórmula Brzycki / Epley) para pesas
                const est1RM =
                  entry.category === 'strength' && entry.weightKg && entry.reps && entry.reps > 1
                    ? Math.round(entry.weightKg * (1 + entry.reps / 30))
                    : entry.weightKg;

                // Calcular ritmo por 500m en remo o por 100m en piscina
                let paceText = '';
                if (entry.category === 'rowing' && entry.distanceM && entry.durationSec) {
                  const split500 = Math.round((entry.durationSec / entry.distanceM) * 500);
                  paceText = `Ritmo: ${formatTime(split500)} /500m`;
                } else if (entry.category === 'swimming' && entry.distanceM && entry.durationSec) {
                  const split100 = Math.round((entry.durationSec / entry.distanceM) * 100);
                  paceText = `Ritmo: ${formatTime(split100)} /100m`;
                } else if (entry.category === 'bike' && entry.distanceM && entry.durationSec) {
                  const kmh = ((entry.distanceM / 1000) / (entry.durationSec / 3600)).toFixed(1);
                  paceText = `Vel: ${kmh} km/h`;
                }

                return (
                  <View key={entry.id} style={styles.entryCard}>
                    <View style={styles.entryMainRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.entryTitle}>{entry.name}</Text>
                        <Text style={styles.entryDate}>{entry.date}</Text>
                        {entry.notes && <Text style={styles.entryNotes}>{entry.notes}</Text>}
                      </View>

                      <View style={styles.entryMetricsCol}>
                        {entry.weightKg !== undefined && (
                          <Text style={styles.entryHighlight}>
                            {entry.weightKg} kg {entry.reps ? `× ${entry.reps} reps` : ''}
                          </Text>
                        )}
                        {entry.weightKg === undefined && entry.reps !== undefined && (
                          <Text style={styles.entryHighlight}>{entry.reps} reps</Text>
                        )}
                        {entry.durationSec !== undefined && (
                          <View style={styles.timeBadge}>
                            <Clock size={12} color="#38BDF8" />
                            <Text style={styles.entryTime}>{formatTime(entry.durationSec)}</Text>
                          </View>
                        )}
                        {entry.watts !== undefined && (
                          <Text style={styles.entrySubMetric}>{entry.watts} W medios</Text>
                        )}
                        {paceText !== '' && <Text style={styles.entryPace}>{paceText}</Text>}
                        {est1RM && entry.reps && entry.reps > 1 && (
                          <Text style={styles.entry1RM}>1RM est: {est1RM} kg</Text>
                        )}
                      </View>

                      <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => deleteStatEntry(entry.id)}
                      >
                        <Trash2 size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ESTADÍSTICAS Y MARCAS</Text>
        <Text style={styles.headerSubtitle}>Pesas, CrossFit Heroes, Remo, Bici, Piscina y Hyrox</Text>
      </View>

      {/* SUB-PESTAÑAS POR DISCIPLINA */}
      <View style={styles.tabsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {TABS.map((t) => {
            const isActive = activeTab === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                style={[styles.tabPill, isActive && styles.tabPillActive]}
                onPress={() => handleSelectTab(t.key)}
              >
                <Text style={styles.tabEmoji}>{t.emoji}</Text>
                <Text style={[styles.tabPillText, isActive && styles.tabPillTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {activeTab === 'overview' ? (
          <>
            {/* ESTIMADOR HYROX ADAPTADO */}
            <View style={styles.hyroxCard}>
              <View style={styles.hyroxTopRow}>
                <View>
                  <Text style={styles.hyroxCardBadge}>TIEMPO HYROX ADAPTADO ESTIMADO</Text>
                  <Text style={styles.hyroxTimeText}>{estimatedHyroxTotalMin} min</Text>
                </View>
                <View style={styles.hyroxPaceBox}>
                  <Text style={styles.hyroxPaceLabel}>RITMO BASE REMO/BIKE</Text>
                  <Text style={styles.hyroxPaceValue}>
                    {Math.floor(rowSplitSecPer500 / 60)}:
                    {(rowSplitSecPer500 % 60).toString().padStart(2, '0')} /500m
                  </Text>
                </View>
              </View>
              <Text style={styles.hyroxFootnote}>
                *Calculado para 8x1000m Ergómetros en sustitución de las carreras + 8 estaciones sin impacto.
              </Text>
            </View>

            {/* RESUMEN SEMANAL */}
            <View style={styles.kpiRow}>
              <View style={styles.kpiCard}>
                <Activity size={18} color="#38BDF8" />
                <Text style={styles.kpiValue}>{completedList.length}</Text>
                <Text style={styles.kpiLabel}>SESIONES TOTALES</Text>
              </View>
              <View style={styles.kpiCard}>
                <Flame size={18} color="#F59E0B" />
                <Text style={styles.kpiValue}>{totalMinutes} m</Text>
                <Text style={styles.kpiLabel}>VOLUMEN ACUMULADO</Text>
              </View>
              <View style={styles.kpiCard}>
                <Heart size={18} color="#EF4444" />
                <Text style={styles.kpiValue}>{profile.restingHr} bpm</Text>
                <Text style={styles.kpiLabel}>FC REPOSO BASE</Text>
              </View>
            </View>

            {/* GRÁFICO GLOBAL DE VOLUMEN DE SESIONES */}
            {completedList.length > 0 && (
              <View style={styles.sectionCard}>
                <View style={styles.sectionTitleRow}>
                  <TrendingUp size={18} color="#38BDF8" />
                  <Text style={styles.sectionTitle}>PROGRESIÓN DE VOLUMEN (SESIONES)</Text>
                </View>
                <ProgressChart
                  title="Duración por Entrenamiento"
                  subtitle="Minutos completados en tus últimas sesiones"
                  data={completedList
                    .slice()
                    .reverse()
                    .slice(-6)
                    .map((w) => ({
                      label: formatShortDate(w.scheduledDate),
                      value: w.durationMin || 0,
                      displayValue: `${w.durationMin || 0}m`,
                    }))}
                  higherIsBetter={true}
                  accentColor="#38BDF8"
                />
              </View>
            )}

            {/* EVOLUCIÓN DE POTENCIA ABSOLUTA (W) */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionTitleRow}>
                <Zap size={18} color="#10B981" />
                <Text style={styles.sectionTitle}>POTENCIA ABSOLUTA (TESTS FTP)</Text>
              </View>
              <View style={styles.powerGrid}>
                <View style={styles.powerItem}>
                  <Text style={styles.powerLabel}>FTP BICI (20 min)</Text>
                  <Text style={styles.powerWatts}>{profile.bikeFtpWatts} W</Text>
                  <Text style={[styles.powerZ2, { color: '#38BDF8', fontWeight: '800', marginBottom: 2 }]}>
                    ~{wattsToBikeKmh(profile.bikeFtpWatts)} km/h
                  </Text>
                  <Text style={styles.powerZ2}>
                    Z2: {Math.round(profile.bikeFtpWatts * 0.65)} W ({wattsToBikeKmh(Math.round(profile.bikeFtpWatts * 0.65))} km/h)
                  </Text>
                </View>
                <View style={styles.powerItem}>
                  <Text style={styles.powerLabel}>POTENCIA REMO (5 min / 2k)</Text>
                  <Text style={styles.powerWatts}>{profile.rowFtpWatts} W</Text>
                  <Text style={[styles.powerZ2, { color: '#F59E0B', fontWeight: '800', marginBottom: 2 }]}>
                    {formatPace500m(wattsToRow500mSec(profile.rowFtpWatts))}
                  </Text>
                  <Text style={styles.powerZ2}>
                    Z2: {Math.round(profile.rowFtpWatts * 0.68)} W ({formatPace500m(wattsToRow500mSec(Math.round(profile.rowFtpWatts * 0.68)))})
                  </Text>
                </View>
              </View>
            </View>

            {/* RÉCORDS PERSONALES (PR) AUTOMÁTICOS */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionTitleRow}>
                <Award size={18} color="#F59E0B" />
                <Text style={styles.sectionTitle}>RÉCORDS PERSONALES (PRs)</Text>
              </View>

              <View style={styles.recordsList}>
                {records.map((r) => (
                  <View key={r.id} style={styles.recordRow}>
                    <View style={styles.recordLeft}>
                      <Text style={styles.recordExercise}>{r.exerciseName}</Text>
                      <Text style={styles.recordDate}>
                        {r.date} • {r.workoutTitle || 'Sesión grabada'}
                      </Text>
                    </View>
                    <View style={styles.recordRight}>
                      <Text style={styles.recordValue}>
                        {r.recordValue} {r.unit}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </>
        ) : (
          renderCategoryContent(activeTab)
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
  tabsWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    backgroundColor: '#0F172A',
  },
  tabsScroll: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 6,
  },
  tabPillActive: {
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B',
  },
  tabEmoji: {
    fontSize: 14,
  },
  tabPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
  },
  tabPillTextActive: {
    color: '#0F172A',
    fontWeight: '900',
  },
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  categoryContainer: {
    gap: 16,
  },
  formTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#F59E0B',
    marginBottom: 10,
    letterSpacing: 0.4,
  },
  presetsLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '700',
    marginBottom: 6,
  },
  presetsScroll: {
    marginBottom: 12,
  },
  presetChip: {
    backgroundColor: '#0F172A',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    marginRight: 8,
  },
  presetChipActive: {
    borderColor: '#F59E0B',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  presetChipText: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '700',
  },
  presetChipTextActive: {
    color: '#F59E0B',
  },
  inputRowFull: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    marginBottom: 5,
  },
  textInput: {
    backgroundColor: '#0F172A',
    color: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    fontSize: 14,
    fontWeight: '600',
  },
  numericFieldsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  fieldBox: {
    flex: 1,
    minWidth: 90,
  },
  fieldBoxWide: {
    flex: 1.4,
    minWidth: 135,
  },
  numInput: {
    backgroundColor: '#0F172A',
    color: '#F59E0B',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
  },
  timeInputsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeNumInput: {
    flex: 1,
    backgroundColor: '#0F172A',
    color: '#38BDF8',
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
  },
  timeColon: {
    color: '#94A3B8',
    fontSize: 16,
    fontWeight: '900',
  },
  addStatButton: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 12,
    gap: 8,
    marginTop: 4,
  },
  addStatButtonText: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '900',
  },
  emptyCatText: {
    color: '#64748B',
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 20,
  },
  entryCard: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  entryMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  entryTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  entryDate: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  entryNotes: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
    fontStyle: 'italic',
  },
  entryMetricsCol: {
    alignItems: 'flex-end',
    gap: 3,
  },
  entryHighlight: {
    fontSize: 15,
    fontWeight: '900',
    color: '#F59E0B',
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  entryTime: {
    fontSize: 14,
    fontWeight: '900',
    color: '#38BDF8',
  },
  entrySubMetric: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10B981',
  },
  entryPace: {
    fontSize: 11,
    fontWeight: '700',
    color: '#CBD5E1',
  },
  entry1RM: {
    fontSize: 11,
    fontWeight: '800',
    color: '#10B981',
  },
  deleteBtn: {
    padding: 8,
  },
  hyroxCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#F59E0B',
  },
  hyroxTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  hyroxCardBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: '#F59E0B',
    letterSpacing: 0.5,
  },
  hyroxTimeText: {
    fontSize: 34,
    fontWeight: '900',
    color: '#F8FAFC',
    marginTop: 2,
  },
  hyroxPaceBox: {
    backgroundColor: '#0F172A',
    padding: 10,
    borderRadius: 10,
    alignItems: 'flex-end',
  },
  hyroxPaceLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  hyroxPaceValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#38BDF8',
    marginTop: 2,
  },
  hyroxFootnote: {
    fontSize: 11,
    color: '#64748B',
    fontStyle: 'italic',
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 10,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#F8FAFC',
    marginTop: 6,
  },
  kpiLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    marginTop: 2,
    textAlign: 'center',
  },
  sectionCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#F8FAFC',
    letterSpacing: 0.5,
  },
  powerGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  powerItem: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 12,
  },
  powerLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  powerWatts: {
    fontSize: 24,
    fontWeight: '900',
    color: '#10B981',
    marginVertical: 4,
  },
  powerZ2: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  recordsList: {
    gap: 10,
  },
  recordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    padding: 12,
    borderRadius: 10,
  },
  recordLeft: {
    flex: 1,
  },
  recordExercise: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  recordDate: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  recordRight: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  recordValue: {
    fontSize: 14,
    fontWeight: '900',
    color: '#F59E0B',
  },
});
