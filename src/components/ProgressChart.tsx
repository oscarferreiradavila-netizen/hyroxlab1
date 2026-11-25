import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Line, Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';
import { TrendingUp, TrendingDown } from 'lucide-react-native';

export interface ChartDataPoint {
  label: string;      // Fecha o etiqueta eje X (ej: "12 Nov")
  value: number;      // Valor numérico (kg o segundos)
  displayValue: string; // Texto formateado (ej: "110 kg" o "4:35")
}

interface ProgressChartProps {
  title: string;
  subtitle?: string;
  data: ChartDataPoint[];
  /** true cuando valores más altos son mejores (ej. kg, vatios); false cuando valores más bajos son mejores (ej. tiempos) */
  higherIsBetter?: boolean;
  accentColor?: string;
}

export const ProgressChart: React.FC<ProgressChartProps> = ({
  title,
  subtitle,
  data,
  higherIsBetter = true,
  accentColor = '#F59E0B',
}) => {
  if (!data || data.length === 0) {
    return null;
  }

  const width = 320;
  const height = 160;
  const padLeft = 18;
  const padRight = 18;
  const padTop = 28;
  const padBottom = 28;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const values = data.map((d) => d.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;

  // Calcular coordenadas de cada punto
  const points = data.map((d, i) => {
    const x =
      data.length === 1
        ? padLeft + plotW / 2
        : padLeft + (i / (data.length - 1)) * plotW;
    const normalized = (d.value - minVal) / range;
    const y = padTop + plotH - normalized * plotH;
    return { x, y, ...d };
  });

  // Construir path de línea y área
  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');

  const areaPath =
    points.length > 1
      ? `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${(padTop + plotH).toFixed(1)} L ${points[0].x.toFixed(1)} ${(padTop + plotH).toFixed(1)} Z`
      : '';

  // Calcular mejora entre el primer y el último punto
  const first = data[0].value;
  const last = data[data.length - 1].value;
  const diff = last - first;
  const pct = first !== 0 ? ((diff / first) * 100).toFixed(1) : '0.0';

  const isImprovement = higherIsBetter ? diff > 0 : diff < 0;
  const isNeutral = diff === 0 || data.length < 2;

  const formatDelta = () => {
    if (isNeutral) return 'Sin cambios';
    const sign = diff > 0 ? '+' : '';
    if (higherIsBetter) {
      return `${sign}${Math.round(diff * 10) / 10} (${sign}${pct}%)`;
    }
    const absSec = Math.abs(Math.round(diff));
    const m = Math.floor(absSec / 60);
    const s = absSec % 60;
    const timeStr = m > 0 ? `${m}m ${s}s` : `${s}s`;
    return `${diff < 0 ? '-' : '+'}${timeStr} (${pct}%)`;
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>

        {data.length >= 2 && (
          <View
            style={[
              styles.deltaBadge,
              isNeutral
                ? styles.deltaNeutral
                : isImprovement
                ? styles.deltaPositive
                : styles.deltaNegative,
            ]}
          >
            {isImprovement ? (
              <TrendingUp size={13} color="#10B981" />
            ) : !isNeutral ? (
              <TrendingDown size={13} color="#EF4444" />
            ) : null}
            <Text
              style={[
                styles.deltaText,
                isNeutral
                  ? { color: '#94A3B8' }
                  : isImprovement
                  ? { color: '#10B981' }
                  : { color: '#EF4444' },
              ]}
            >
              {formatDelta()}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.svgContainer}>
        <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
          <Defs>
            <LinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={accentColor} stopOpacity="0.35" />
              <Stop offset="100%" stopColor={accentColor} stopOpacity="0.02" />
            </LinearGradient>
          </Defs>

          {/* Líneas de guía horizontales */}
          {[0, 0.5, 1].map((t, idx) => {
            const gy = padTop + t * plotH;
            return (
              <Line
                key={idx}
                x1={padLeft}
                y1={gy}
                x2={width - padRight}
                y2={gy}
                stroke="#334155"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
            );
          })}

          {/* Área sombreada */}
          {areaPath !== '' && <Path d={areaPath} fill="url(#areaGrad)" />}

          {/* Línea principal */}
          {points.length > 1 && (
            <Path
              d={linePath}
              fill="none"
              stroke={accentColor}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Puntos y etiquetas */}
          {points.map((p, idx) => (
            <React.Fragment key={idx}>
              <Circle
                cx={p.x}
                cy={p.y}
                r={5}
                fill="#0F172A"
                stroke={accentColor}
                strokeWidth="2.5"
              />
              <SvgText
                x={p.x}
                y={p.y - 11}
                fill="#F8FAFC"
                fontSize="10"
                fontWeight="bold"
                textAnchor="middle"
              >
                {p.displayValue}
              </SvgText>
              <SvgText
                x={p.x}
                y={height - 6}
                fill="#64748B"
                fontSize="9"
                fontWeight="600"
                textAnchor="middle"
              >
                {p.label}
              </SvgText>
            </React.Fragment>
          ))}
        </Svg>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: '900',
    color: '#F8FAFC',
  },
  subtitle: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  deltaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  deltaPositive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  deltaNegative: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  deltaNeutral: {
    backgroundColor: 'rgba(148, 163, 184, 0.12)',
  },
  deltaText: {
    fontSize: 11,
    fontWeight: '800',
  },
  svgContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
