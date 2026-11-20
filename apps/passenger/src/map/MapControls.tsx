import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

export function MapControls({
  inset,
  onZoomIn,
  onZoomOut,
  onLocate,
}: {
  inset: { bottom: number; right: number };
  onZoomIn: () => void;
  onZoomOut: () => void;
  onLocate: () => void;
}) {
  return (
    <View
      pointerEvents="box-none"
      style={[styles.column, { bottom: inset.bottom, right: inset.right }]}
    >
      <Control label="Zoom in" icon="plus" onPress={onZoomIn} testID="map-zoom-in" />
      <Control label="Zoom out" icon="minus" onPress={onZoomOut} testID="map-zoom-out" />
      <Control label="Locate me" icon="crosshair" onPress={onLocate} testID="map-locate" />
    </View>
  );
}

function Control({
  label,
  icon,
  onPress,
  testID,
}: {
  label: string;
  icon: 'plus' | 'minus' | 'crosshair';
  onPress: () => void;
  testID: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      testID={testID}
      style={styles.button}
    >
      <Feather name={icon} size={18} color="#1F1F1F" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  column: {
    position: 'absolute',
    gap: 8,
    zIndex: 2,
  },
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1F1F1F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 3,
  },
});
