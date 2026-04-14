// Composant BACChart — courbe d'alcoolémie avec Recharts
// AreaChart responsive, ligne de référence au seuil légal (0.5 g/L)

import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';

interface BACChartProps {
  curve: { time: string; bac: number }[];
}

// Formate un timestamp ISO en heure locale (ex : "21h30")
const formatHeure = (iso: string): string => {
  const date = new Date(iso);
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}h${m}`;
};

// Tooltip personnalisé
const TooltipBAC = ({ active, payload, label }: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#1a1a2e',
      border: '1px solid #444',
      borderRadius: 6,
      padding: '6px 10px',
      fontSize: '0.85rem',
      color: '#fff',
    }}>
      <p style={{ margin: 0 }}>{label}</p>
      <p style={{ margin: 0, color: '#ff6b6b', fontWeight: 'bold' }}>
        {payload[0].value.toFixed(2)} g/L
      </p>
    </div>
  );
};

const BACChart: React.FC<BACChartProps> = ({ curve }) => {
  if (!curve || curve.length === 0) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: 180,
        color: '#888',
        fontSize: '0.9rem',
        fontStyle: 'italic',
      }}>
        Pas encore de données à afficher
      </div>
    );
  }

  // Prépare les données : formate l'axe X en heure locale
  const chartData = curve.map((point) => ({
    heure: formatHeure(point.time),
    bac: point.bac,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="gradientBAC" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ff6b6b" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#ff6b6b" stopOpacity={0.05} />
          </linearGradient>
        </defs>

        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" />

        <XAxis
          dataKey="heure"
          tick={{ fill: '#aaa', fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: '#444' }}
          interval="preserveStartEnd"
        />

        <YAxis
          domain={[0, 'auto']}
          tick={{ fill: '#aaa', fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: '#444' }}
          tickFormatter={(v: number) => v.toFixed(1)}
        />

        <Tooltip content={<TooltipBAC />} />

        {/* Ligne de référence : seuil légal français 0.5 g/L */}
        <ReferenceLine
          y={0.5}
          stroke="#f5a623"
          strokeDasharray="6 3"
          label={{
            value: 'Seuil légal (0.5 g/L)',
            position: 'insideTopRight',
            fill: '#f5a623',
            fontSize: 11,
          }}
        />

        <Area
          type="monotone"
          dataKey="bac"
          stroke="#ff6b6b"
          strokeWidth={2}
          fill="url(#gradientBAC)"
          dot={false}
          activeDot={{ r: 4, fill: '#ff6b6b' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default BACChart;
