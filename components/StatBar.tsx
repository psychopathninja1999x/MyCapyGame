import { StyleSheet, Text, View } from 'react-native';

type StatBarProps = {
  label: string;
  value: number;
  max?: number;
  color: string;
  emoji?: string;
};

export function StatBar({ label, value, max = 100, color, emoji }: StatBarProps) {
  const pct = Math.max(0, Math.min(1, value / max));

  return (
    <View style={styles.row}>
      <Text style={styles.label}>
        {emoji ? `${emoji} ` : ''}
        {label}
      </Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.value}>{Math.round(value)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  label: {
    width: 86,
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  track: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 5,
  },
  value: {
    width: 28,
    textAlign: 'right',
    color: '#fff',
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
});
