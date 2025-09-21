// Input.tsx - Intelligent input components with adaptive behavior for EchoTrail
// Provides text inputs, search bars, and form controls that adapt to user context

import React, {
  useState,
  forwardRef,
  useRef,
  useImperativeHandle,
} from "react";
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TextInputProps,
  Animated,
  Pressable,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import {
  useAdaptiveUI,
  useIntelligentAnimation,
  useIntelligentHaptic,
} from "../../context/IntelligentThemeContext";

// Base input interface
interface BaseInputProps extends Omit<TextInputProps, "style"> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: keyof typeof MaterialIcons.glyphMap;
  rightIcon?: keyof typeof MaterialIcons.glyphMap;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  testID?: string;
  disabled?: boolean;
}

// Text Input Component
export const TextInputField = forwardRef<TextInput, BaseInputProps>(
  (
    {
      label,
      error,
      hint,
      leftIcon,
      rightIcon,
      onRightIconPress,
      containerStyle,
      inputStyle,
      testID,
      disabled = false,
      ...textInputProps
    },
    ref
  ) => {
    const { theme, adaptiveProps, getAdaptiveSize } = useAdaptiveUI();
    const animationConfig = useIntelligentAnimation();
    const { hapticType } = useIntelligentHaptic();

    const [isFocused, setIsFocused] = useState(false);
    const [internalValue, setInternalValue] = useState(
      textInputProps.value || ""
    );
    const internalRef = useRef<TextInput>(null);

    useImperativeHandle(ref, () => internalRef.current!);

    const scaleAnim = useRef(new Animated.Value(1)).current;
    const borderColorAnim = useRef(new Animated.Value(0)).current;

    const handleFocus = (e: any) => {
      setIsFocused(true);

      if (!animationConfig.isReducedMotion) {
        Animated.parallel([
          Animated.spring(scaleAnim, {
            toValue: 1.02,
            useNativeDriver: true,
            tension: 300,
            friction: 35,
          }),
          Animated.timing(borderColorAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: false,
          }),
        ]).start();
      }

      textInputProps.onFocus?.(e);
    };

    const handleBlur = (e: any) => {
      setIsFocused(false);

      if (!animationConfig.isReducedMotion) {
        Animated.parallel([
          Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            tension: 300,
            friction: 35,
          }),
          Animated.timing(borderColorAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: false,
          }),
        ]).start();
      }

      textInputProps.onBlur?.(e);
    };

    const handleChangeText = (text: string) => {
      setInternalValue(text);
      textInputProps.onChangeText?.(text);
    };

    const handleRightIconPress = async () => {
      if (!onRightIconPress || disabled) return;

      // Intelligent haptic feedback
      if (!animationConfig.isReducedMotion) {
        const hapticMap = {
          light: Haptics.ImpactFeedbackStyle.Light,
          medium: Haptics.ImpactFeedbackStyle.Medium,
          heavy: Haptics.ImpactFeedbackStyle.Heavy,
        } as const;

        if (hapticType in hapticMap) {
          await Haptics.impactAsync(
            hapticMap[hapticType as keyof typeof hapticMap]
          );
        }
      }

      onRightIconPress();
    };

    const borderColor = borderColorAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [
        error ? theme.colors.error : theme.colors.border,
        theme.colors.primary,
      ],
    });

    const styles = createInputStyles(theme, adaptiveProps, isFocused, !!error);

    return (
      <Animated.View
        style={[
          styles.container,
          containerStyle,
          !animationConfig.isReducedMotion && {
            transform: [{ scale: scaleAnim }],
          },
        ]}
        testID={testID}
      >
        {label && (
          <Text
            style={[
              styles.label,
              adaptiveProps.highContrastMode && styles.highContrastLabel,
            ]}
          >
            {label}
          </Text>
        )}

        <Animated.View
          style={[
            styles.inputContainer,
            !animationConfig.isReducedMotion && { borderColor },
            disabled && styles.disabledContainer,
          ]}
        >
          {leftIcon && (
            <MaterialIcons
              name={leftIcon}
              size={getAdaptiveSize(20)}
              color={theme.colors.textSecondary}
              style={styles.leftIcon}
            />
          )}

          <TextInput
            ref={internalRef}
            style={[
              styles.input,
              inputStyle,
              leftIcon && styles.inputWithLeftIcon,
              rightIcon && styles.inputWithRightIcon,
            ]}
            placeholderTextColor={theme.colors.textSecondary}
            selectionColor={theme.colors.primary}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onChangeText={handleChangeText}
            value={textInputProps.value ?? internalValue}
            editable={!disabled}
            autoCapitalize={textInputProps.autoCapitalize || "sentences"}
            autoCorrect={textInputProps.autoCorrect ?? true}
            {...textInputProps}
          />

          {rightIcon && (
            <TouchableOpacity
              onPress={handleRightIconPress}
              disabled={disabled || !onRightIconPress}
              style={styles.rightIconContainer}
              accessibilityRole="button"
              accessibilityLabel="Input action"
            >
              <MaterialIcons
                name={rightIcon}
                size={getAdaptiveSize(20)}
                color={
                  disabled ? theme.colors.textSecondary : theme.colors.text
                }
              />
            </TouchableOpacity>
          )}
        </Animated.View>

        {(error || hint) && (
          <Text
            style={[
              error ? styles.errorText : styles.hintText,
              adaptiveProps.highContrastMode &&
                error &&
                styles.highContrastError,
            ]}
          >
            {error || hint}
          </Text>
        )}
      </Animated.View>
    );
  }
);

// Search Input Component with enhanced functionality
interface SearchInputProps
  extends Omit<BaseInputProps, "leftIcon" | "rightIcon"> {
  onSearch?: (query: string) => void;
  onClear?: () => void;
  showClearButton?: boolean;
  searchDelay?: number;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  onSearch,
  onClear,
  showClearButton = true,
  searchDelay = 300,
  ...props
}) => {
  const [searchQuery, setSearchQuery] = useState(props.value || "");
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSearch = (query: string) => {
    setSearchQuery(query);

    // Debounce search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      onSearch?.(query);
    }, searchDelay) as any;
  };

  const handleClear = () => {
    setSearchQuery("");
    onSearch?.("");
    onClear?.();
  };

  return (
    <TextInputField
      {...props}
      value={searchQuery}
      onChangeText={handleSearch}
      leftIcon="search"
      rightIcon={showClearButton && searchQuery ? "clear" : undefined}
      onRightIconPress={
        showClearButton && searchQuery ? handleClear : undefined
      }
      placeholder={props.placeholder || "Søk..."}
      returnKeyType="search"
      clearButtonMode="never" // We handle our own clear button
    />
  );
};

// Password Input Component
interface PasswordInputProps
  extends Omit<
    BaseInputProps,
    "rightIcon" | "onRightIconPress" | "secureTextEntry"
  > {
  showToggle?: boolean;
}

export const PasswordInput: React.FC<PasswordInputProps> = ({
  showToggle = true,
  ...props
}) => {
  const [isSecure, setIsSecure] = useState(true);

  const toggleSecure = () => {
    setIsSecure(!isSecure);
  };

  return (
    <TextInputField
      {...props}
      secureTextEntry={isSecure}
      rightIcon={
        showToggle ? (isSecure ? "visibility" : "visibility-off") : undefined
      }
      onRightIconPress={showToggle ? toggleSecure : undefined}
      autoCapitalize="none"
      autoCorrect={false}
      textContentType="password"
    />
  );
};

// Number Input Component
interface NumberInputProps extends Omit<BaseInputProps, "keyboardType"> {
  min?: number;
  max?: number;
  step?: number;
  showSteppers?: boolean;
  onStepUp?: () => void;
  onStepDown?: () => void;
}

export const NumberInput: React.FC<NumberInputProps> = ({
  min,
  max,
  step = 1,
  showSteppers = false,
  onStepUp,
  onStepDown,
  ...props
}) => {
  const { theme } = useAdaptiveUI();

  const currentValue = parseFloat(props.value || "0") || 0;
  const canStepUp = max === undefined || currentValue < max;
  const canStepDown = min === undefined || currentValue > min;

  const handleStepUp = () => {
    if (!canStepUp) return;
    const newValue = Math.min(max ?? Infinity, currentValue + step);
    props.onChangeText?.(newValue.toString());
    onStepUp?.();
  };

  const handleStepDown = () => {
    if (!canStepDown) return;
    const newValue = Math.max(min ?? -Infinity, currentValue - step);
    props.onChangeText?.(newValue.toString());
    onStepDown?.();
  };

  if (showSteppers) {
    return (
      <View style={styles.numberInputContainer}>
        <TextInputField
          {...props}
          keyboardType="numeric"
          containerStyle={{ flex: 1 }}
        />
        <View style={styles.steppersContainer}>
          <TouchableOpacity
            onPress={handleStepUp}
            disabled={!canStepUp}
            style={[styles.stepperButton, !canStepUp && styles.disabledButton]}
          >
            <MaterialIcons
              name="keyboard-arrow-up"
              size={20}
              color={canStepUp ? theme.colors.text : theme.colors.textSecondary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleStepDown}
            disabled={!canStepDown}
            style={[
              styles.stepperButton,
              !canStepDown && styles.disabledButton,
            ]}
          >
            <MaterialIcons
              name="keyboard-arrow-down"
              size={20}
              color={
                canStepDown ? theme.colors.text : theme.colors.textSecondary
              }
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return <TextInputField {...props} keyboardType="numeric" />;
};

// Multi-line Text Input (TextArea)
interface TextAreaProps extends BaseInputProps {
  numberOfLines?: number;
  maxLength?: number;
  showCharacterCount?: boolean;
}

export const TextArea: React.FC<TextAreaProps> = ({
  numberOfLines = 4,
  maxLength,
  showCharacterCount = !!maxLength,
  ...props
}) => {
  const { theme } = useAdaptiveUI();
  const [charCount, setCharCount] = useState(props.value?.length || 0);

  const handleChangeText = (text: string) => {
    setCharCount(text.length);
    props.onChangeText?.(text);
  };

  return (
    <View>
      <TextInputField
        {...props}
        onChangeText={handleChangeText}
        multiline
        numberOfLines={numberOfLines}
        textAlignVertical="top"
        maxLength={maxLength}
        containerStyle={props.containerStyle}
        inputStyle={
          [
            { height: numberOfLines * 24, paddingTop: 12 },
            props.inputStyle,
          ] as any
        }
      />
      {showCharacterCount && (
        <Text
          style={[
            {
              fontSize: theme.typography.fontSize.xs,
              color: theme.colors.textSecondary,
              textAlign: "right" as const,
              marginTop: 4,
            },
            maxLength &&
              charCount > maxLength * 0.8 && { color: theme.colors.warning },
            maxLength &&
              charCount >= maxLength && { color: theme.colors.error },
          ]}
        >
          {charCount}
          {maxLength ? `/${maxLength}` : ""}
        </Text>
      )}
    </View>
  );
};

// Create styles function
const createInputStyles = (
  theme: any,
  adaptiveProps: any,
  isFocused: boolean,
  hasError: boolean
) =>
  StyleSheet.create({
    container: {
      marginVertical:
        adaptiveProps.adaptiveSpacing === "compact"
          ? 8
          : adaptiveProps.adaptiveSpacing === "loose"
            ? 16
            : 12,
    },
    label: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.medium,
      color: theme.colors.text,
      marginBottom: 8,
    },
    highContrastLabel: {
      fontWeight: "600",
    },
    inputContainer: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: adaptiveProps.highContrastMode ? 2 : 1,
      borderColor: hasError
        ? theme.colors.error
        : isFocused
          ? theme.colors.primary
          : theme.colors.border,
      borderRadius: theme.borderRadius?.md || 8,
      backgroundColor: theme.colors.surface,
      minHeight: Math.max(48, adaptiveProps.minTouchTarget || 48),
      paddingHorizontal: 12,
    },
    disabledContainer: {
      backgroundColor: theme.colors.muted,
      opacity: 0.7,
    },
    input: {
      flex: 1,
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text,
      fontFamily: theme.typography.fontFamily.regular,
      paddingVertical: 12,
    },
    inputWithLeftIcon: {
      marginLeft: 8,
    },
    inputWithRightIcon: {
      marginRight: 8,
    },
    leftIcon: {
      marginRight: 8,
    },
    rightIconContainer: {
      padding: 4,
      marginLeft: 8,
    },
    errorText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.error,
      marginTop: 4,
      fontFamily: theme.typography.fontFamily.regular,
    },
    hintText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      marginTop: 4,
      fontFamily: theme.typography.fontFamily.regular,
    },
    highContrastError: {
      fontWeight: "600",
    },
    characterCount: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textSecondary,
      textAlign: "right",
      marginTop: 4,
    },
  });

// Styles for specialized components
const styles = StyleSheet.create({
  numberInputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  steppersContainer: {
    marginLeft: 8,
  },
  stepperButton: {
    padding: 8,
    backgroundColor: "#f0f0f0",
    borderRadius: 4,
    marginVertical: 2,
  },
  disabledButton: {
    opacity: 0.5,
  },
});

export default {
  TextInputField,
  SearchInput,
  PasswordInput,
  NumberInput,
  TextArea,
};
