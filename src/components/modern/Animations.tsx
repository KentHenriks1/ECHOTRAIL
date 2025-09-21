// Animations.tsx - Intelligent animation system for EchoTrail
// Context-aware micro-interactions and transitions that adapt to user movement and preferences

import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Animated,
  Easing,
  ViewStyle,
  Dimensions,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
} from "react-native";
import {
  useAdaptiveUI,
  useIntelligentAnimation,
} from "../../context/IntelligentThemeContext";
import { MovementMode } from "../../services/intelligence/SpeedDetector";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

// Enhanced fade in/out animation with intelligent timing
interface FadeProps {
  children: React.ReactNode;
  visible: boolean;
  duration?: number;
  delay?: number;
  style?: ViewStyle;
  onAnimationComplete?: () => void;
}

export const FadeAnimation: React.FC<FadeProps> = ({
  children,
  visible,
  duration,
  delay = 0,
  style,
  onAnimationComplete,
}) => {
  const { currentMovementMode } = useAdaptiveUI();
  const animationConfig = useIntelligentAnimation();
  const fadeAnim = useRef(new Animated.Value(visible ? 1 : 0)).current;

  const getAdaptiveDuration = () => {
    if (duration) return duration;

    const baseDuration = animationConfig.duration || 200;

    // Faster animations for driving mode, smoother for stationary
    switch (currentMovementMode) {
      case "DRIVING":
        return Math.max(baseDuration * 0.7, 150);
      case "CYCLING":
        return baseDuration * 0.8;
      case "WALKING":
        return baseDuration;
      case "STATIONARY":
        return baseDuration * 1.2;
      default:
        return baseDuration;
    }
  };

  useEffect(() => {
    if (animationConfig.isReducedMotion) {
      fadeAnim.setValue(visible ? 1 : 0);
      onAnimationComplete?.();
      return;
    }

    const animation = Animated.timing(fadeAnim, {
      toValue: visible ? 1 : 0,
      duration: getAdaptiveDuration(),
      delay,
      easing: Easing.bezier(0.4, 0.0, 0.2, 1),
      useNativeDriver: true,
    });

    animation.start(({ finished }) => {
      if (finished) {
        onAnimationComplete?.();
      }
    });

    return () => animation.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  return (
    <Animated.View style={[{ opacity: fadeAnim }, style]}>
      {children}
    </Animated.View>
  );
};

// Intelligent slide animation with contextual direction and speed
interface SlideProps {
  children: React.ReactNode;
  visible: boolean;
  direction: "up" | "down" | "left" | "right";
  distance?: number;
  duration?: number;
  style?: ViewStyle;
  onAnimationComplete?: () => void;
}

export const SlideAnimation: React.FC<SlideProps> = ({
  children,
  visible,
  direction,
  distance,
  duration,
  style,
  onAnimationComplete,
}) => {
  const { currentMovementMode } = useAdaptiveUI();
  const animationConfig = useIntelligentAnimation();
  const slideAnim = useRef(new Animated.Value(0)).current;

  const getAnimationDistance = () => {
    if (distance) return distance;

    const baseDistance =
      direction === "left" || direction === "right"
        ? screenWidth * 0.3
        : screenHeight * 0.3;

    // Shorter slides for driving mode (less distraction)
    switch (currentMovementMode) {
      case "DRIVING":
        return baseDistance * 0.5;
      case "CYCLING":
        return baseDistance * 0.7;
      default:
        return baseDistance;
    }
  };

  const getAdaptiveDuration = () => {
    if (duration) return duration;
    return animationConfig.duration || 250;
  };

  useEffect(() => {
    const animationDistance = getAnimationDistance();

    if (animationConfig.isReducedMotion) {
      slideAnim.setValue(visible ? 0 : animationDistance);
      onAnimationComplete?.();
      return;
    }

    const toValue = visible ? 0 : animationDistance;

    const animation = Animated.spring(slideAnim, {
      toValue,
      tension: animationConfig.tension || 300,
      friction: animationConfig.friction || 35,
      useNativeDriver: true,
    });

    animation.start(({ finished }) => {
      if (finished) {
        onAnimationComplete?.();
      }
    });

    return () => animation.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const getTransform = () => {
    switch (direction) {
      case "left":
        return [{ translateX: slideAnim }];
      case "right":
        return [
          {
            translateX: slideAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, -1],
            }),
          },
        ];
      case "up":
        return [{ translateY: slideAnim }];
      case "down":
        return [
          {
            translateY: slideAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, -1],
            }),
          },
        ];
      default:
        return [];
    }
  };

  return (
    <Animated.View style={[{ transform: getTransform() }, style]}>
      {children}
    </Animated.View>
  );
};

// Intelligent scale animation with haptic feedback consideration
interface ScaleProps {
  children: React.ReactNode;
  isPressed?: boolean;
  scale?: number;
  duration?: number;
  style?: ViewStyle;
}

export const ScaleAnimation: React.FC<ScaleProps> = ({
  children,
  isPressed = false,
  scale = 0.95,
  duration,
  style,
}) => {
  const { currentMovementMode } = useAdaptiveUI();
  const animationConfig = useIntelligentAnimation();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const getAdaptiveScale = () => {
    // Less pronounced scaling for driving mode
    switch (currentMovementMode) {
      case "DRIVING":
        return Math.max(scale, 0.98); // Minimal scaling for safety
      case "CYCLING":
        return Math.max(scale, 0.96);
      default:
        return scale;
    }
  };

  const getAdaptiveDuration = () => {
    if (duration) return duration;
    return currentMovementMode === "DRIVING"
      ? 100
      : animationConfig.duration || 150;
  };

  useEffect(() => {
    if (animationConfig.isReducedMotion) {
      scaleAnim.setValue(isPressed ? getAdaptiveScale() : 1);
      return;
    }

    const animation = Animated.spring(scaleAnim, {
      toValue: isPressed ? getAdaptiveScale() : 1,
      tension: animationConfig.tension || 300,
      friction: animationConfig.friction || 35,
      useNativeDriver: true,
    });

    animation.start();
    return () => animation.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPressed]);

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
      {children}
    </Animated.View>
  );
};

// Progressive loading animation with smart timing
interface ProgressiveLoadProps {
  children: React.ReactNode;
  loading: boolean;
  placeholder?: React.ReactNode;
  style?: ViewStyle;
}

export const ProgressiveLoadAnimation: React.FC<ProgressiveLoadProps> = ({
  children,
  loading,
  placeholder,
  style,
}) => {
  const { currentMovementMode } = useAdaptiveUI();
  const animationConfig = useIntelligentAnimation();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(loading ? 0 : 1)).current;

  useEffect(() => {
    if (loading && !animationConfig.isReducedMotion) {
      // Subtle pulse animation for loading state
      const createPulse = () =>
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.7,
            duration: currentMovementMode === "DRIVING" ? 800 : 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: currentMovementMode === "DRIVING" ? 800 : 1000,
            useNativeDriver: true,
          }),
        ]);

      Animated.loop(createPulse()).start();
    }

    const fadeAnimation = Animated.timing(fadeAnim, {
      toValue: loading ? 0 : 1,
      duration: animationConfig.isReducedMotion ? 0 : 200,
      useNativeDriver: true,
    });

    fadeAnimation.start();
    return () => fadeAnimation.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  if (loading) {
    return (
      <Animated.View style={[{ opacity: pulseAnim }, style]}>
        {placeholder || (
          <View
            style={{
              backgroundColor: "#f0f0f0",
              borderRadius: 8,
              minHeight: 100,
            }}
          />
        )}
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[{ opacity: fadeAnim }, style]}>
      {children}
    </Animated.View>
  );
};

// Intelligent swipe gesture handler with contextual sensitivity
interface SwipeGestureProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  swipeThreshold?: number;
  style?: ViewStyle;
}

export const SwipeGestureHandler: React.FC<SwipeGestureProps> = ({
  children,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  swipeThreshold,
  style,
}) => {
  const { currentMovementMode } = useAdaptiveUI();
  const animationConfig = useIntelligentAnimation();
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  const getAdaptiveThreshold = () => {
    if (swipeThreshold) return swipeThreshold;

    // Higher threshold for driving mode (prevent accidental swipes)
    switch (currentMovementMode) {
      case "DRIVING":
        return 80;
      case "CYCLING":
        return 60;
      default:
        return 50;
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        const { dx, dy } = gestureState;
        const threshold = getAdaptiveThreshold();
        return Math.abs(dx) > 20 || Math.abs(dy) > 20;
      },

      onPanResponderMove: (evt, gestureState) => {
        if (animationConfig.isReducedMotion) return;

        // Dampen movement for driving mode
        const dampening = currentMovementMode === "DRIVING" ? 0.5 : 1;
        translateX.setValue(gestureState.dx * dampening);
        translateY.setValue(gestureState.dy * dampening);
      },

      onPanResponderRelease: (evt, gestureState) => {
        const { dx, dy, vx, vy } = gestureState;
        const threshold = getAdaptiveThreshold();

        // Reset position
        Animated.parallel([
          Animated.spring(translateX, {
            toValue: 0,
            tension: 300,
            friction: 35,
            useNativeDriver: true,
          }),
          Animated.spring(translateY, {
            toValue: 0,
            tension: 300,
            friction: 35,
            useNativeDriver: true,
          }),
        ]).start();

        // Determine swipe direction
        if (Math.abs(dx) > Math.abs(dy)) {
          // Horizontal swipe
          if (Math.abs(dx) > threshold) {
            if (dx > 0 && onSwipeRight) {
              onSwipeRight();
            } else if (dx < 0 && onSwipeLeft) {
              onSwipeLeft();
            }
          }
        } else {
          // Vertical swipe
          if (Math.abs(dy) > threshold) {
            if (dy > 0 && onSwipeDown) {
              onSwipeDown();
            } else if (dy < 0 && onSwipeUp) {
              onSwipeUp();
            }
          }
        }
      },
    })
  ).current;

  return (
    <Animated.View
      style={[
        {
          transform: [
            { translateX: animationConfig.isReducedMotion ? 0 : translateX },
            { translateY: animationConfig.isReducedMotion ? 0 : translateY },
          ],
        },
        style,
      ]}
      {...panResponder.panHandlers}
    >
      {children}
    </Animated.View>
  );
};

// Staggered animation for lists with intelligent timing
interface StaggeredListProps {
  children: React.ReactNode[];
  visible: boolean;
  staggerDelay?: number;
  style?: ViewStyle;
}

export const StaggeredListAnimation: React.FC<StaggeredListProps> = ({
  children,
  visible,
  staggerDelay,
  style,
}) => {
  const { currentMovementMode } = useAdaptiveUI();
  const animationConfig = useIntelligentAnimation();
  const animations = useRef<Animated.Value[]>([]).current;

  // Initialize animations for each child
  useEffect(() => {
    animations.length = children.length;
    for (let i = 0; i < children.length; i++) {
      if (!animations[i]) {
        animations[i] = new Animated.Value(visible ? 1 : 0);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [children.length]);

  const getAdaptiveStaggerDelay = () => {
    if (staggerDelay) return staggerDelay;

    // Faster stagger for driving mode
    switch (currentMovementMode) {
      case "DRIVING":
        return 50;
      case "CYCLING":
        return 80;
      case "WALKING":
        return 100;
      case "STATIONARY":
        return 120;
      default:
        return 100;
    }
  };

  useEffect(() => {
    if (animationConfig.isReducedMotion) {
      animations.forEach((anim) => anim.setValue(visible ? 1 : 0));
      return;
    }

    const stagger = getAdaptiveStaggerDelay();

    const staggeredAnimations = animations.map((anim, index) =>
      Animated.timing(anim, {
        toValue: visible ? 1 : 0,
        duration: animationConfig.duration || 200,
        delay: index * stagger,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      })
    );

    Animated.parallel(staggeredAnimations).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  return (
    <View style={style}>
      {children.map((child, index) => (
        <Animated.View
          key={index}
          style={{
            opacity: animations[index] || 0,
            transform: [
              {
                translateY: (
                  animations[index] || new Animated.Value(0)
                ).interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
          }}
        >
          {child}
        </Animated.View>
      ))}
    </View>
  );
};

// Floating Action Button with intelligent behavior
interface FloatingActionProps {
  children: React.ReactNode;
  onPress: () => void;
  position?: "bottomRight" | "bottomLeft" | "topRight" | "topLeft";
  hideOnScroll?: boolean;
  style?: ViewStyle;
}

export const FloatingActionButton: React.FC<FloatingActionProps> = ({
  children,
  onPress,
  position = "bottomRight",
  hideOnScroll = false,
  style,
}) => {
  const { theme, adaptiveProps, currentMovementMode } = useAdaptiveUI();
  const animationConfig = useIntelligentAnimation();
  const [visible, setVisible] = useState(true);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const translateAnim = useRef(new Animated.Value(0)).current;

  const getPositionStyle = (): ViewStyle => {
    const baseSize = Math.max(adaptiveProps.minTouchTarget || 56, 56);
    const offset = theme.spacing?.md || 16;

    const baseStyle: ViewStyle = {
      position: "absolute",
      width: baseSize,
      height: baseSize,
      borderRadius: baseSize / 2,
      backgroundColor: theme.colors.primary,
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
      ...(theme.shadows?.lg || {}),
    };

    switch (position) {
      case "bottomRight":
        return { ...baseStyle, bottom: offset, right: offset };
      case "bottomLeft":
        return { ...baseStyle, bottom: offset, left: offset };
      case "topRight":
        return { ...baseStyle, top: offset, right: offset };
      case "topLeft":
        return { ...baseStyle, top: offset, left: offset };
      default:
        return { ...baseStyle, bottom: offset, right: offset };
    }
  };

  const handlePress = () => {
    if (animationConfig.isReducedMotion) {
      onPress();
      return;
    }

    // Quick scale animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    onPress();
  };

  useEffect(() => {
    if (animationConfig.isReducedMotion) {
      translateAnim.setValue(visible ? 0 : 100);
      return;
    }

    Animated.spring(translateAnim, {
      toValue: visible ? 0 : 100,
      tension: 300,
      friction: 35,
      useNativeDriver: true,
    }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  return (
    <Animated.View
      style={[
        getPositionStyle(),
        {
          transform: [{ scale: scaleAnim }, { translateY: translateAnim }],
        },
        style,
      ]}
    >
      <Animated.View
        onTouchStart={handlePress}
        style={{
          width: "100%",
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {children}
      </Animated.View>
    </Animated.View>
  );
};

// Utility hook for creating custom intelligent animations
export const useIntelligentAnimatedValue = (initialValue: number = 0) => {
  const animationConfig = useIntelligentAnimation();
  const animatedValue = useRef(new Animated.Value(initialValue)).current;

  const animateTo = (
    toValue: number,
    options?: {
      duration?: number;
      easing?: (value: number) => number;
      delay?: number;
      onComplete?: () => void;
    }
  ) => {
    if (animationConfig.isReducedMotion) {
      animatedValue.setValue(toValue);
      options?.onComplete?.();
      return;
    }

    Animated.timing(animatedValue, {
      toValue,
      duration: options?.duration || animationConfig.duration || 200,
      easing: options?.easing || Easing.bezier(0.4, 0.0, 0.2, 1),
      delay: options?.delay || 0,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        options?.onComplete?.();
      }
    });
  };

  const springTo = (
    toValue: number,
    options?: {
      tension?: number;
      friction?: number;
      onComplete?: () => void;
    }
  ) => {
    if (animationConfig.isReducedMotion) {
      animatedValue.setValue(toValue);
      options?.onComplete?.();
      return;
    }

    Animated.spring(animatedValue, {
      toValue,
      tension: options?.tension || animationConfig.tension || 300,
      friction: options?.friction || animationConfig.friction || 35,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        options?.onComplete?.();
      }
    });
  };

  return {
    value: animatedValue,
    animateTo,
    springTo,
  };
};

export default {
  FadeAnimation,
  SlideAnimation,
  ScaleAnimation,
  ProgressiveLoadAnimation,
  SwipeGestureHandler,
  StaggeredListAnimation,
  FloatingActionButton,
  useIntelligentAnimatedValue,
};
