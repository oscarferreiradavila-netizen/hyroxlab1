import { Workout, UserProfile, ChatMessage, StatEntry, PersonalRecord } from '../types/training';
import { generatePrescribedWorkout, generateInitialAssessmentWorkout } from './workoutGenerator';

export async function askGeminiCoach(
  userMessage: string,
  profile: UserProfile,
  recentWorkouts: Workout[],
  chatHistory: ChatMessage[],
  statEntries: StatEntry[] = [],
  records: PersonalRecord[] = []
): Promise<{ text: string; workout?: Workout }> {
  // Si no hay API key guardada, usamos el motor algorítmico inteligente con memoria local
  if (!profile.geminiApiKey || profile.geminiApiKey.trim() === '') {
    return generateLocalFallbackResponse(userMessage, profile, recentWorkouts, statEntries);
  }

  const apiKey = profile.geminiApiKey.trim();
  const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash'];

  // Memoria de entrenamientos recientes (qué ha hecho y cómo se ha sentido)
  const historySummary = recentWorkouts
    .filter((w) => w.status === 'completed')
    .slice(0, 8)
    .map((w) => ({
      title: w.title,
      modality: w.modality,
      date: w.scheduledDate,
      rpe: w.postRpe,
      durationMin: w.durationMin,
      notes: w.athleteNotes,
    }));

  // Memoria de marcas personales y progresos por disciplina
  const recentStats = statEntries.slice(0, 12).map((s) => ({
    cat: s.category,
    name: s.name,
    kg: s.weightKg,
    reps: s.reps,
    distM: s.distanceM,
    sec: s.durationSec,
    watts: s.watts,
    date: s.date,
  }));

  const systemInstruction = `
Eres el Entrenador Personal de Élite de "HyroxLab" con MEMORIA COMPLETA del atleta. Tu misión es guiar al atleta, analizar lo que lleva haciendo, enseñarle cómo mejorar su técnica/ritmo/cargas y prescribir entrenamientos VARIADOS y PROGRESIVOS (nunca repitas el mismo entreno seguido).

[PERFIL Y MEMORIA DEL ATLETA]
- Nombre: ${profile.name}
- Nivel: ${profile.fitnessLevel ? profile.fitnessLevel.toUpperCase() : 'PENDIENTE DE TEST INICIAL'}
- Test Inicial Completado: ${profile.assessmentCompleted ? 'SÍ' : 'NO (Si es su primera vez o pide empezar, indícale hacer primero el Test Inicial de Nivel)'}
- Semana de Progresión: Semana ${profile.progressionWeek || 1} (Ciclo 4 semanas: 1=Base, 2=+4%, 3=+8%, 4=Descarga)
- Peso: ${profile.weightKg} kg | FC Reposo: ${profile.restingHr} bpm | FC Máx: ${profile.maxHr} bpm
- FTP Bici: ${profile.bikeFtpWatts} W | FTP Remo: ${profile.rowFtpWatts} W
- Últimos entrenamientos completados: ${JSON.stringify(historySummary)}
- Marcas recientes (Pesas, CrossFit, Remo, Bici, Natación): ${JSON.stringify(recentStats)}
- Récords personales: ${JSON.stringify(records.slice(0, 8))}

REGLAS VITALES E INQUEBRANTABLES:
1. RESTRICCIÓN DE CERO IMPACTO: El atleta NO puede hacer impacto articular.
   - Sustituye SIEMPRE cualquier carrera por REMO (Concept2), BICICLETA (BikeErg/Estática) o SKIERG.
   - PROHIBIDO prescribir saltos, comba, box jumps, o burpees con salto.
   - Sustitutos obligatorios: Weighted Step-Ups en cajón, Step-Down Burpee Broad Step (sin saltar).
2. VATIOS ABSOLUTOS Y RITMOS: Para bici/remo prescribe vatios exactos (W), NUNCA porcentajes.
   - Z2 Bici: ${Math.round(profile.bikeFtpWatts * 0.65)} W | Z4 Bici: ${Math.round(profile.bikeFtpWatts * 0.95)} W.
   - Z2 Remo: ${Math.round(profile.rowFtpWatts * 0.68)} W | Z4 Remo: ${Math.round(profile.rowFtpWatts * 0.96)} W.
3. MEMORIA Y ENSEÑANZA: Menciona explícitamente sus sesiones recientes o marcas cuando sea relevante (ej. "Vi que en tu último entreno tuviste RPE 8...", "Para superar tus 110kg en sentadilla..."), dale consejos concretos para mejorar y varía los formatos (EMOM, AMRAP, pirámides, intervalos, fuerza).
4. TONO: Cercano, motivador, técnico, en español.
5. FORMATO JSON SI PRESCRIBES SESIÓN:
   Si el atleta pide o necesita un entrenamiento hoy, incluye al final un bloque JSON exacto:
   \`\`\`json
   {
     "title": "Nombre variado de la sesión",
     "modality": "hyrox_adapted" | "crossfit_no_impact" | "strength" | "bike_erg" | "rowing" | "swimming",
     "durationMin": 45,
     "blocks": [
       {
         "id": "b1",
         "blockType": "warmup" | "main" | "intervals" | "emom" | "amrap" | "cooldown",
         "title": "Título del bloque",
         "instructions": "Detalles y consejos técnicos",
         "rounds": 1,
         "sets": [
           {
             "id": "s1",
             "exerciseName": "Remo Ergómetro (RowErg)",
             "targetWatts": 210,
             "targetDistanceM": 1000,
             "targetRestSec": 60,
             "completed": false
           }
         ]
       }
     ]
   }
   \`\`\`
`;

  // Construir historial conversacional para que la IA recuerde mensajes anteriores
  const recentChatTurns = chatHistory
    .filter((m) => m.sender === 'user' || m.sender === 'coach')
    .slice(-10)
    .map((m) => ({
      role: m.sender === 'user' ? 'user' : 'model',
      parts: [{ text: m.text }],
    }));

  const conversationPayload = [
    ...recentChatTurns,
    {
      role: 'user',
      parts: [{ text: userMessage }],
    },
  ];

  try {
    let res: Response | null = null;
    let lastErr = '';

    for (const modelName of modelsToTry) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemInstruction }] },
          contents: conversationPayload,
          generationConfig: {
            temperature: 0.5,
            maxOutputTokens: 1600,
          },
        }),
      });

      if (res.ok) break;
      const errBody = await res.text();
      lastErr = `${res.status}: ${errBody.slice(0, 120)}`;
      if (res.status !== 404) break;
    }

    if (!res || !res.ok) {
      console.warn('Gemini API Error:', lastErr);
      return generateLocalFallbackResponse(
        userMessage,
        profile,
        recentWorkouts,
        statEntries,
        `(Nota: error de conexión con Gemini ${lastErr}, usando entrenador local)`
      );
    }

    const data = await res.json();
    const rawContent: string = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    const jsonMatch = rawContent.match(/```json\s*([\s\S]*?)\s*```/);
    let parsedWorkout: Workout | undefined = undefined;

    if (jsonMatch && jsonMatch[1]) {
      try {
        const rawJson = JSON.parse(jsonMatch[1]);
        parsedWorkout = {
          ...rawJson,
          id: 'gemini_' + Date.now(),
          status: 'planned',
          scheduledDate: new Date().toISOString().split('T')[0],
          generatedByAi: true,
        };
      } catch (err) {
        console.warn('Could not parse workout JSON from Gemini:', err);
      }
    }

    const cleanText = rawContent.replace(/```json[\s\S]*?```/, '').trim();
    return {
      text: cleanText || 'Aquí tienes tu sesión optimizada sin impacto para hoy.',
      workout: parsedWorkout,
    };
  } catch (error) {
    console.warn('Network error calling Gemini:', error);
    return generateLocalFallbackResponse(
      userMessage,
      profile,
      recentWorkouts,
      statEntries,
      '(Sin red para Gemini: usando entrenador inteligente local)'
    );
  }
}

function generateLocalFallbackResponse(
  userMessage: string,
  profile: UserProfile,
  recentWorkouts: Workout[],
  statEntries: StatEntry[],
  prefixNote = ''
): { text: string; workout?: Workout } {
  const lower = userMessage.toLowerCase();

  // Si aún no ha hecho el Test de Nivel Inicial
  if (
    !profile.assessmentCompleted &&
    !lower.includes('saltar') &&
    (lower.includes('test') || lower.includes('nivel') || lower.includes('empezar') || lower.includes('entren') || lower.includes('hola'))
  ) {
    const assessment = generateInitialAssessmentWorkout(profile);
    return {
      text: `${prefixNote ? prefixNote + '\n\n' : ''}¡Hola ${profile.name}! Como tu entrenador personal, antes de programar tus cargas progresivas necesito evaluar tu punto de partida real.\n\nTe he preparado el **Test Inicial de Nivel** (Bici 10 min + Remo 1.000m + Fuerza 8RM sin impacto). Al completarlo calcularé automáticamente tu nivel y desbloquearé tu plan progresivo semanal.`,
      workout: assessment,
    };
  }

  let duration = 45;
  if (lower.includes('20')) duration = 20;
  else if (lower.includes('30')) duration = 30;
  else if (lower.includes('60') || lower.includes('1 hora')) duration = 60;
  else if (lower.includes('90')) duration = 90;

  let fatigue: 'fresh' | 'normal' | 'tired' = 'normal';
  if (lower.includes('cansado') || lower.includes('fatiga') || lower.includes('suave') || lower.includes('dolor')) {
    fatigue = 'tired';
  } else if (lower.includes('a tope') || lower.includes('fuerte') || lower.includes('energia')) {
    fatigue = 'fresh';
  }

  let modality: any = 'hyrox_adapted';
  if (lower.includes('remo') || lower.includes('row')) modality = 'rowing';
  else if (lower.includes('bici') || lower.includes('bike') || lower.includes('pedal')) modality = 'bike_erg';
  else if (lower.includes('fuerza') || lower.includes('pesas') || lower.includes('gym')) modality = 'strength';
  else if (lower.includes('crossfit') || lower.includes('wod')) modality = 'crossfit_no_impact';
  else if (lower.includes('nadar') || lower.includes('piscina') || lower.includes('natacion')) modality = 'swimming';

  const workout = generatePrescribedWorkout({
    modality,
    durationMin: duration,
    fatigueLevel: fatigue,
    userProfile: profile,
    recentWorkouts,
    statEntries,
  });

  const lastSession = recentWorkouts.find((w) => w.status === 'completed');
  const memoryHint = lastSession
    ? `He revisado tu última sesión ("${lastSession.title}"${lastSession.postRpe ? `, RPE ${lastSession.postRpe}/10` : ''}) para variar los estímulos y seguir progresando en tu Semana ${profile.progressionWeek || 1}. `
    : '';

  const tip =
    fatigue === 'tired'
      ? 'Hoy priorizamos técnica y zona aeróbica suave para recuperar sin castigar articulaciones.'
      : 'Concéntrate en mantener la potencia constante en cada serie y controlar la respiración en los descansos.';

  return {
    text: `${prefixNote ? prefixNote + '\n\n' : ''}${memoryHint}Te he preparado "${workout.title}" (${duration} min sin impacto). ${tip}\n\n💡 *Tip: Si añades tu API Key gratuita de Google Gemini en Ajustes, activaré el análisis conversacional completo con IA.*`,
    workout,
  };
}

/**
 * Analiza las impresiones y sensaciones del atleta al terminar un entrenamiento
 * para darle feedback inmediato de Entrenador Personal y recordarlo en futuras sesiones.
 */
export async function analyzePostWorkoutImpressions(
  workout: Workout,
  profile: UserProfile
): Promise<string> {
  const rpe = workout.postRpe ?? 7;
  const notes = (workout.athleteNotes || '').trim();

  // Fallback local inteligente si no hay API Key de Gemini
  if (!profile.geminiApiKey || profile.geminiApiKey.trim() === '') {
    const lower = notes.toLowerCase();
    if (lower.includes('dolor') || lower.includes('molestia') || lower.includes('rodilla') || lower.includes('hombro') || lower.includes('espalda')) {
      return `Tomo nota de esa molestia, ${profile.name}. Protegemos la zona: en tu próximo entreno reduciré la carga en ese patrón y mantendremos trabajo aeróbico sin impacto. Aplica frío/movilidad suave hoy.`;
    }
    if (rpe >= 9 || lower.includes('cansado') || lower.includes('agotado') || lower.includes('duro')) {
      return `Buen esfuerzo hoy (${workout.durationMin} min, RPE ${rpe}/10). Veo que ha sido exigente; lo tendré en cuenta para programar una sesión de recuperación activa o Zona 2 en tu próximo día y que asimiles la carga.`;
    }
    if (lower.includes('fuerte') || lower.includes('bien') || lower.includes('fácil') || rpe <= 6) {
      return `¡Excelentes sensaciones, ${profile.name}! Con ese RPE ${rpe}/10 y viendo lo bien que te has encontrado, en la siguiente sesión subiremos ligeramente la exigencia progresiva para seguir mejorando.`;
    }
    return `¡Sesión registrada, ${profile.name}! He guardado tus ${workout.durationMin} min (RPE ${rpe}/10)${notes ? ` y tus impresiones ("${notes}")` : ''}. Lo usaré para ajustar tu próxima Pizarra.`;
  }

  const apiKey = profile.geminiApiKey.trim();
  const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash'];

  const prompt = `Eres el Entrenador Personal de ${profile.name} (política estricta Cero Impacto, nivel ${profile.fitnessLevel || 'intermedio'}, Semana ${profile.progressionWeek || 1}).
El atleta acaba de terminar el entrenamiento "${workout.title}" (${workout.durationMin} min) con un RPE percibido de ${rpe}/10.
Sus impresiones/sensaciones escritas al terminar son: "${notes || 'Sin comentarios adicionales'}".

Responde en 2-3 frases directas, empáticas y técnicas en español:
1) Valora su esfuerzo y lo que sintió.
2) Dale un consejo práctico de recuperación o técnica.
3) Dile cómo vas a adaptar su próximo entrenamiento en base a estas sensaciones.`;

  try {
    for (const modelName of modelsToTry) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.5, maxOutputTokens: 300 },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (reply) return reply;
      }
      if (res.status !== 404) break;
    }
  } catch (e) {
    console.warn('Error analyzing post-workout impressions with Gemini:', e);
  }

  return `¡Buen trabajo hoy, ${profile.name}! He guardado tus sensaciones (RPE ${rpe}/10) en tu memoria de entrenamiento para adaptar la próxima sesión.`;
}

export async function testGeminiConnection(apiKey: string): Promise<{ ok: boolean; message: string }> {
  const cleanKey = apiKey.trim().replace(/^["']|["']$/g, '');
  if (!cleanKey) {
    return { ok: false, message: 'La casilla de la API Key está vacía.' };
  }
  if (!cleanKey.startsWith('AIza')) {
    return {
      ok: false,
      message: `La clave de Gemini siempre empieza por "AIza..." (la tuya empieza por "${cleanKey.slice(0, 6)}..."). Asegúrate de copiar la API Key desde aistudio.google.com/apikey y no el token de Strava ni un Client ID.`,
    };
  }
  for (const modelName of ['gemini-2.5-flash', 'gemini-2.0-flash']) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${cleanKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'Responde solo: OK' }] }],
          generationConfig: { maxOutputTokens: 10 },
        }),
      });
      if (res.ok) {
        return { ok: true, message: `¡Conectado con éxito usando ${modelName}!` };
      }
      const errText = await res.text();
      if (res.status !== 404) {
        return { ok: false, message: `Google rechazó la clave (HTTP ${res.status}): ${errText.slice(0, 140)}` };
      }
    } catch (e: any) {
      return { ok: false, message: `Error de red: ${e?.message || 'Sin conexión'}` };
    }
  }
  return { ok: false, message: 'No se encontró ningún modelo compatible de Gemini para esta clave.' };
}
