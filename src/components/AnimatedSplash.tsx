import React, {useEffect, useRef} from 'react';
import {
  View,
  Image,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';

const {width, height} = Dimensions.get('window');

interface AnimatedSplashProps {
  isVisible: boolean;
  onAnimationEnd: () => void;
}

const AnimatedSplash: React.FC<AnimatedSplashProps> = ({isVisible, onAnimationEnd}) => {
  // Animation values
  const iconScale = useRef(new Animated.Value(0.3)).current;
  const iconOpacity = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(20)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleTranslateY = useRef(new Animated.Value(15)).current;
  const glowScale = useRef(new Animated.Value(0.5)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const bottomLineWidth = useRef(new Animated.Value(0)).current;
  const bottomTextOpacity = useRef(new Animated.Value(0)).current;
  const overallOpacity = useRef(new Animated.Value(1)).current;
  const shimmerPosition = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    if (isVisible) {
      // 入场动画序列
      Animated.sequence([
        // Phase 1: 光晕 + 图标出现
        Animated.parallel([
          Animated.timing(glowOpacity, {
            toValue: 0.4,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.spring(glowScale, {
            toValue: 1,
            friction: 8,
            tension: 40,
            useNativeDriver: true,
          }),
          Animated.spring(iconScale, {
            toValue: 1,
            friction: 6,
            tension: 50,
            useNativeDriver: true,
          }),
          Animated.timing(iconOpacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
        // Phase 2: 标题滑入
        Animated.parallel([
          Animated.timing(titleOpacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.spring(titleTranslateY, {
            toValue: 0,
            friction: 8,
            tension: 50,
            useNativeDriver: true,
          }),
        ]),
        // Phase 3: 副标题 + 底部元素
        Animated.parallel([
          Animated.timing(subtitleOpacity, {
            toValue: 1,
            duration: 350,
            useNativeDriver: true,
          }),
          Animated.spring(subtitleTranslateY, {
            toValue: 0,
            friction: 8,
            tension: 50,
            useNativeDriver: true,
          }),
          Animated.timing(bottomLineWidth, {
            toValue: 40,
            duration: 500,
            useNativeDriver: false,
          }),
          Animated.timing(bottomTextOpacity, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
        // Phase 4: 微光扫过效果
        Animated.timing(shimmerPosition, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        // Phase 5: 短暂停留
        Animated.delay(300),
        // Phase 6: 淡出
        Animated.timing(overallOpacity, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onAnimationEnd();
      });
    }
  }, [
    bottomLineWidth,
    bottomTextOpacity,
    glowOpacity,
    glowScale,
    iconOpacity,
    iconScale,
    isVisible,
    onAnimationEnd,
    overallOpacity,
    shimmerPosition,
    subtitleOpacity,
    subtitleTranslateY,
    titleOpacity,
    titleTranslateY,
  ]);

  if (!isVisible) {
    return null;
  }

  const shimmerTranslateX = shimmerPosition.interpolate({
    inputRange: [-1, 1],
    outputRange: [-width, width],
  });

  return (
    <Animated.View style={[styles.container, {opacity: overallOpacity}]}>
      <StatusBar
        backgroundColor="transparent"
        translucent
        barStyle="light-content"
      />

      {/* 背景渐变 - 使用多层叠加模拟 */}
      <View style={styles.gradientBg}>
        <View style={styles.gradientLayer1} />
        <View style={styles.gradientLayer2} />
      </View>

      {/* 光晕效果 */}
      <Animated.View
        style={[
          styles.glowCircle,
          {
            transform: [{ scale: glowScale }],
            opacity: glowOpacity,
          },
        ]}
      />

      {/* 装饰粒子 */}
      <View style={[styles.particle, styles.particle1]} />
      <View style={[styles.particle, styles.particle2]} />
      <View style={[styles.particle, styles.particle3]} />
      <View style={[styles.particle, styles.particle4]} />
      <View style={[styles.particle, styles.particle5]} />

      {/* 中心内容 */}
      <View style={styles.centerContent}>
        {/* 图标 */}
        <Animated.View
          style={[
            styles.iconContainer,
            {
              transform: [{ scale: iconScale }],
              opacity: iconOpacity,
            },
          ]}>
          <View style={styles.iconOuterRing} />
          <View style={styles.iconInnerCircle}>
            <Image
              source={require('../../android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png')}
              style={styles.iconImage}
            />
          </View>
        </Animated.View>

        {/* 应用名称 */}
        <Animated.Text
          style={[
            styles.title,
            {
              opacity: titleOpacity,
              transform: [{ translateY: titleTranslateY }],
            },
          ]}>
          LifeHub
        </Animated.Text>

        {/* 副标题 */}
        <Animated.Text
          style={[
            styles.subtitle,
            {
              opacity: subtitleOpacity,
              transform: [{ translateY: subtitleTranslateY }],
            },
          ]}>
          智能记账 · 轻松生活
        </Animated.Text>
      </View>

      {/* 微光扫过效果 */}
      <Animated.View
        style={[
          styles.shimmer,
          {
            transform: [{ translateX: shimmerTranslateX }, { rotate: '15deg' }],
          },
        ]}
      />

      {/* 底部装饰线 */}
      <View style={styles.bottomSection}>
        <Animated.View style={[styles.bottomLine, { width: bottomLineWidth }]} />
        <Animated.Text
          style={[styles.bottomText, { opacity: bottomTextOpacity }]}>
          Powered by LifeHub
        </Animated.Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    elevation: 999,
  },
  gradientBg: {
    ...StyleSheet.absoluteFillObject,
  },
  gradientLayer1: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1A237E',
  },
  gradientLayer2: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#3B7DD8',
    opacity: 0.6,
  },
  glowCircle: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(90, 159, 232, 0.15)',
    alignSelf: 'center',
    top: height / 2 - 150,
  },
  particle: {
    position: 'absolute',
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  particle1: {
    width: 6,
    height: 6,
    top: height * 0.15,
    left: width * 0.2,
  },
  particle2: {
    width: 4,
    height: 4,
    top: height * 0.25,
    right: width * 0.15,
  },
  particle3: {
    width: 8,
    height: 8,
    top: height * 0.65,
    left: width * 0.1,
  },
  particle4: {
    width: 5,
    height: 5,
    top: height * 0.7,
    right: width * 0.25,
  },
  particle5: {
    width: 3,
    height: 3,
    top: height * 0.4,
    right: width * 0.08,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 140,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconOuterRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  iconInnerCircle: {
    width: 100,
    height: 100,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  iconImage: {
    width: 88,
    height: 88,
    borderRadius: 22,
  },
  title: {
    fontSize: 36,
    color: '#FFFFFF',
    fontWeight: '200',
    letterSpacing: 4,
    marginTop: 28,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: 3,
    marginTop: 12,
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    width: 60,
    height: height * 2,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  bottomSection: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  bottomLine: {
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 1,
    marginBottom: 16,
  },
  bottomText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.3)',
    letterSpacing: 1,
  },
});

export default AnimatedSplash;
