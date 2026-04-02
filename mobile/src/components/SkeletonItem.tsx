import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

export default function SkeletonItem() {
  const shimmer = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 750, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0.5, duration: 750, useNativeDriver: true }),
      ])
    ).start();
  }, [shimmer]);

  return (
    <Animated.View style={[styles.container, { opacity: shimmer }]}>
      <View style={styles.icon} />
      <View style={styles.middle}>
        <View style={[styles.line, { width: '42%' }]} />
        <View style={[styles.line, { width: '68%', marginTop: 7 }]} />
        <View style={[styles.line, { width: '28%', marginTop: 5 }]} />
      </View>
      <View style={styles.right}>
        <View style={[styles.line, { width: 56, height: 14 }]} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 16,
    marginVertical: 5,
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#EFEFEF',
    marginRight: 12,
  },
  middle: { flex: 1 },
  line: {
    height: 11,
    borderRadius: 6,
    backgroundColor: '#EFEFEF',
  },
  right: { alignItems: 'flex-end' },
});
