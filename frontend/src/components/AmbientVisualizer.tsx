import React, { useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, Animated, Dimensions, Platform } from 'react-native';
import { EmotionType } from '../core/types';
import { NarrativeArc } from '../core/narration/NarrativeContextManager';

interface AmbientVisualizerProps {
  emotion: EmotionType;
  arc: NarrativeArc | null;
  intensity: number;
  children?: React.ReactNode;
}

interface ParticleConfig {
  color: string;
  count: number;
  sizeRange: [number, number];
  speedRange: [number, number];
  opacityRange: [number, number];
}

const EMOTION_PARTICLES: Record<EmotionType, ParticleConfig> = {
  joy: {
    color: 'rgba(212, 168, 83, 0.08)',
    count: 3,
    sizeRange: [80, 120],
    speedRange: [8000, 12000],
    opacityRange: [0.03, 0.06],
  },
  sadness: {
    color: 'rgba(107, 125, 179, 0.06)',
    count: 4,
    sizeRange: [60, 100],
    speedRange: [12000, 18000],
    opacityRange: [0.02, 0.05],
  },
  anger: {
    color: 'rgba(196, 122, 90, 0.06)',
    count: 2,
    sizeRange: [100, 140],
    speedRange: [4000, 6000],
    opacityRange: [0.04, 0.07],
  },
  fear: {
    color: 'rgba(122, 143, 160, 0.05)',
    count: 5,
    sizeRange: [40, 70],
    speedRange: [15000, 25000],
    opacityRange: [0.02, 0.04],
  },
  surprise: {
    color: 'rgba(160, 140, 192, 0.07)',
    count: 3,
    sizeRange: [70, 100],
    speedRange: [3000, 5000],
    opacityRange: [0.04, 0.08],
  },
  neutral: {
    color: 'rgba(160, 160, 160, 0.03)',
    count: 2,
    sizeRange: [100, 150],
    speedRange: [20000, 30000],
    opacityRange: [0.01, 0.03],
  },
};

const ARC_OVERLAYS: Record<NarrativeArc['arcPosition'], {
  gradientColors: string[];
  intensity: number;
}> = {
  beginning: { gradientColors: ['transparent', 'transparent'], intensity: 0 },
  rising: { gradientColors: ['rgba(180, 60, 40, 0.02)', 'transparent'], intensity: 0.02 },
  peak: { gradientColors: ['rgba(200, 50, 30, 0.04)', 'rgba(200, 50, 30, 0.01)'], intensity: 0.04 },
  falling: { gradientColors: ['rgba(80, 100, 140, 0.02)', 'transparent'], intensity: 0.02 },
  resolution: { gradientColors: ['transparent', 'rgba(100, 120, 80, 0.02)'], intensity: 0.01 },
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const AmbientVisualizer: React.FC<AmbientVisualizerProps> = ({
  emotion,
  arc,
  intensity,
  children,
}) => {
  const config = EMOTION_PARTICLES[emotion] || EMOTION_PARTICLES.neutral;
  const arcOverlay = arc ? ARC_OVERLAYS[arc.arcPosition] : ARC_OVERLAYS.beginning;

  const particles = useMemo(() => {
    return Array.from({ length: config.count }, (_, i) => ({
      id: `${emotion}_${i}`,
      size: config.sizeRange[0] + Math.random() * (config.sizeRange[1] - config.sizeRange[0]),
      x: Math.random() * SCREEN_WIDTH,
      y: Math.random() * SCREEN_HEIGHT,
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0.8 + Math.random() * 0.4),
      duration: config.speedRange[0] + Math.random() * (config.speedRange[1] - config.speedRange[0]),
    }));
  }, [emotion, config]);

  useEffect(() => {
    const animations = particles.map((particle) => {
      const targetOpacity = config.opacityRange[0] + intensity * (config.opacityRange[1] - config.opacityRange[0]);

      return Animated.loop(
        Animated.sequence([
          Animated.timing(particle.opacity, {
            toValue: targetOpacity,
            duration: particle.duration * 0.6,
            useNativeDriver: true,
          }),
          Animated.timing(particle.opacity, {
            toValue: targetOpacity * 0.3,
            duration: particle.duration * 0.4,
            useNativeDriver: true,
          }),
        ])
      );
    });

    const combined = Animated.parallel(animations);
    combined.start();

    return () => combined.stop();
  }, [particles, config, intensity]);

  return (
    <View style={styles.container}>
      <View style={StyleSheet.absoluteFill}>
        {particles.map((particle) => (
          <Animated.View
            key={particle.id}
            style={[
              styles.particle,
              {
                width: particle.size,
                height: particle.size,
                borderRadius: particle.size / 2,
                left: particle.x - particle.size / 2,
                top: particle.y - particle.size / 2,
                backgroundColor: config.color,
                opacity: particle.opacity,
                transform: [{ scale: particle.scale }],
              },
            ]}
          />
        ))}
      </View>

      {arc && arcOverlay.intensity > 0 && (
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: arcOverlay.gradientColors[0],
              opacity: intensity * 2,
            },
          ]}
        />
      )}

      <View style={styles.contentLayer}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  particle: {
    position: 'absolute',
  },
  contentLayer: {
    flex: 1,
  },
});

export default AmbientVisualizer;
