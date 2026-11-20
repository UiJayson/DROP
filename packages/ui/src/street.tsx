import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, Line, RadialGradient, Rect, Stop } from 'react-native-svg';

/** Thin dim roads on near-black. No filled blocks. */
export function StreetMap() {
  const [box, setBox] = useState({ width: 0, height: 0 });
  return (
    <View
      style={styles.fill}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        if (width !== box.width || height !== box.height) {
          setBox({ width, height });
        }
      }}
    >
      {box.width > 0 ? (
        <Svg width={box.width} height={box.height}>
          <Defs>
            <RadialGradient id="street-glow" cx="78%" cy="42%" rx="42%" ry="36%">
              <Stop offset="0%" stopColor="rgba(255,198,41,0.16)" />
              <Stop offset="55%" stopColor="rgba(255,198,41,0.04)" />
              <Stop offset="100%" stopColor="rgba(255,198,41,0)" />
            </RadialGradient>
          </Defs>
          <Rect width={box.width} height={box.height} fill="#040405" />
          <Rect width={box.width} height={box.height} fill="url(#street-glow)" />
          <Line
            x1={box.width * 0.05}
            y1={box.height * 0.72}
            x2={box.width * 0.96}
            y2={box.height * 0.58}
            stroke="rgba(255,255,255,0.09)"
            strokeWidth={1.2}
          />
          <Line
            x1={box.width * 0.12}
            y1={box.height * 0.18}
            x2={box.width * 0.88}
            y2={box.height * 0.34}
            stroke="rgba(255,255,255,0.07)"
            strokeWidth={1}
          />
          <Line
            x1={box.width * 0.28}
            y1={0}
            x2={box.width * 0.46}
            y2={box.height}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={1}
          />
          <Line
            x1={box.width * 0.62}
            y1={box.height * 0.08}
            x2={box.width * 0.78}
            y2={box.height * 0.92}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={1}
          />
          <Line
            x1={0}
            y1={box.height * 0.46}
            x2={box.width}
            y2={box.height * 0.4}
            stroke="rgba(255,255,255,0.05)"
            strokeWidth={1}
          />
        </Svg>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#040405',
  },
});
