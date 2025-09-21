// Layout.tsx - Intelligent responsive layout components for EchoTrail
// Adapts spacing, sizing, and arrangement based on user context and screen size

import React from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Dimensions,
  ViewStyle,
  ScrollViewProps,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAdaptiveUI } from "../../context/IntelligentThemeContext";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

// Screen size breakpoints
const BREAKPOINTS = {
  xs: 0,
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1200,
};

interface BaseLayoutProps {
  children: React.ReactNode;
  style?: ViewStyle;
  testID?: string;
}

// Container Component - Provides consistent padding and max-width
interface ContainerProps extends BaseLayoutProps {
  fluid?: boolean;
  center?: boolean;
  noPadding?: boolean;
}

export const Container: React.FC<ContainerProps> = ({
  children,
  style,
  fluid = false,
  center = false,
  noPadding = false,
  testID,
}) => {
  const { theme, adaptiveProps } = useAdaptiveUI();
  const insets = useSafeAreaInsets();

  const containerStyle: ViewStyle = {
    flex: 1,
    width: "100%",
    maxWidth: fluid ? undefined : 1200,
    paddingHorizontal: noPadding
      ? 0
      : adaptiveProps.adaptiveSpacing === "loose"
        ? theme.spacing?.lg || 20
        : adaptiveProps.adaptiveSpacing === "compact"
          ? theme.spacing?.sm || 12
          : theme.spacing?.md || 16,
    paddingTop: insets.top,
    paddingBottom: insets.bottom,
    ...(center && {
      alignSelf: "center",
    }),
  };

  return (
    <View style={[containerStyle, style]} testID={testID}>
      {children}
    </View>
  );
};

// Stack Component - Vertical layout with consistent spacing
interface StackProps extends BaseLayoutProps {
  spacing?: "xs" | "sm" | "md" | "lg" | "xl" | number;
  align?: "flex-start" | "center" | "flex-end" | "stretch";
  justify?:
    | "flex-start"
    | "center"
    | "flex-end"
    | "space-between"
    | "space-around"
    | "space-evenly";
}

export const Stack: React.FC<StackProps> = ({
  children,
  style,
  spacing = "md",
  align = "stretch",
  justify = "flex-start",
  testID,
}) => {
  const { theme, adaptiveProps } = useAdaptiveUI();

  const getSpacing = (): number => {
    if (typeof spacing === "number") return spacing;

    const spacingMap = {
      xs: theme.spacing?.xs || 4,
      sm: theme.spacing?.sm || 8,
      md: theme.spacing?.md || 16,
      lg: theme.spacing?.lg || 24,
      xl: theme.spacing?.xl || 32,
    };

    let baseSpacing = spacingMap[spacing];

    // Apply adaptive spacing
    if (adaptiveProps.adaptiveSpacing === "loose") {
      baseSpacing = Math.round(baseSpacing * 1.25);
    } else if (adaptiveProps.adaptiveSpacing === "compact") {
      baseSpacing = Math.round(baseSpacing * 0.75);
    }

    return baseSpacing;
  };

  const stackSpacing = getSpacing();

  const stackStyle: ViewStyle = {
    flexDirection: "column",
    alignItems: align,
    justifyContent: justify,
  };

  // Add spacing between children
  const childrenWithSpacing = React.Children.map(children, (child, index) => {
    if (!React.isValidElement(child)) return child;

    const childStyle = index > 0 ? { marginTop: stackSpacing } : {};

    return React.cloneElement(child, {
      style: [(child.props as any)?.style || {}, childStyle],
    } as any);
  });

  return (
    <View style={[stackStyle, style]} testID={testID}>
      {childrenWithSpacing}
    </View>
  );
};

// Row Component - Horizontal layout with consistent spacing
interface RowProps extends BaseLayoutProps {
  spacing?: "xs" | "sm" | "md" | "lg" | "xl" | number;
  align?: "flex-start" | "center" | "flex-end" | "stretch" | "baseline";
  justify?:
    | "flex-start"
    | "center"
    | "flex-end"
    | "space-between"
    | "space-around"
    | "space-evenly";
  wrap?: boolean;
}

export const Row: React.FC<RowProps> = ({
  children,
  style,
  spacing = "md",
  align = "center",
  justify = "flex-start",
  wrap = false,
  testID,
}) => {
  const { theme, adaptiveProps } = useAdaptiveUI();

  const getSpacing = (): number => {
    if (typeof spacing === "number") return spacing;

    const spacingMap = {
      xs: theme.spacing?.xs || 4,
      sm: theme.spacing?.sm || 8,
      md: theme.spacing?.md || 16,
      lg: theme.spacing?.lg || 24,
      xl: theme.spacing?.xl || 32,
    };

    let baseSpacing = spacingMap[spacing];

    // Apply adaptive spacing
    if (adaptiveProps.adaptiveSpacing === "loose") {
      baseSpacing = Math.round(baseSpacing * 1.25);
    } else if (adaptiveProps.adaptiveSpacing === "compact") {
      baseSpacing = Math.round(baseSpacing * 0.75);
    }

    return baseSpacing;
  };

  const rowSpacing = getSpacing();

  const rowStyle: ViewStyle = {
    flexDirection: "row",
    alignItems: align,
    justifyContent: justify,
    ...(wrap && { flexWrap: "wrap" }),
  };

  // Add spacing between children
  const childrenWithSpacing = React.Children.map(children, (child, index) => {
    if (!React.isValidElement(child)) return child;

    const childStyle = index > 0 ? { marginLeft: rowSpacing } : {};

    return React.cloneElement(child, {
      style: [(child.props as any)?.style || {}, childStyle],
    } as any);
  });

  return (
    <View style={[rowStyle, style]} testID={testID}>
      {childrenWithSpacing}
    </View>
  );
};

// Grid Component - Responsive grid layout
interface GridProps extends BaseLayoutProps {
  columns?:
    | number
    | { xs?: number; sm?: number; md?: number; lg?: number; xl?: number };
  spacing?: "xs" | "sm" | "md" | "lg" | "xl" | number;
  aspectRatio?: number;
}

export const Grid: React.FC<GridProps> = ({
  children,
  style,
  columns = 2,
  spacing = "md",
  aspectRatio,
  testID,
}) => {
  const { theme, adaptiveProps } = useAdaptiveUI();

  const getColumns = (): number => {
    if (typeof columns === "number") return columns;

    // Responsive column logic based on screen width
    if (screenWidth >= BREAKPOINTS.xl && columns.xl) return columns.xl;
    if (screenWidth >= BREAKPOINTS.lg && columns.lg) return columns.lg;
    if (screenWidth >= BREAKPOINTS.md && columns.md) return columns.md;
    if (screenWidth >= BREAKPOINTS.sm && columns.sm) return columns.sm;
    return columns.xs || 1;
  };

  const getSpacing = (): number => {
    if (typeof spacing === "number") return spacing;

    const spacingMap = {
      xs: theme.spacing?.xs || 4,
      sm: theme.spacing?.sm || 8,
      md: theme.spacing?.md || 16,
      lg: theme.spacing?.lg || 24,
      xl: theme.spacing?.xl || 32,
    };

    let baseSpacing = spacingMap[spacing];

    // Apply adaptive spacing
    if (adaptiveProps.adaptiveSpacing === "loose") {
      baseSpacing = Math.round(baseSpacing * 1.25);
    } else if (adaptiveProps.adaptiveSpacing === "compact") {
      baseSpacing = Math.round(baseSpacing * 0.75);
    }

    return baseSpacing;
  };

  const numColumns = getColumns();
  const gridSpacing = getSpacing();
  const itemWidth = (screenWidth - gridSpacing * (numColumns + 1)) / numColumns;

  const gridStyle: ViewStyle = {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: gridSpacing / 2,
  };

  const renderGridItems = () => {
    return React.Children.map(children, (child, index) => {
      if (!React.isValidElement(child)) return child;

      const itemStyle: ViewStyle = {
        width: itemWidth,
        marginBottom: gridSpacing,
        ...(aspectRatio && { height: itemWidth / aspectRatio }),
      };

      return (
        <View key={index} style={itemStyle}>
          {child}
        </View>
      );
    });
  };

  return (
    <View style={[gridStyle, style]} testID={testID}>
      {renderGridItems()}
    </View>
  );
};

// Screen Component - Main screen wrapper with intelligent padding
interface ScreenProps
  extends BaseLayoutProps,
    Omit<ScrollViewProps, "style" | "children"> {
  scrollable?: boolean;
  preset?: "scroll" | "fixed" | "auto";
  safeAreaEdges?: Array<"top" | "bottom" | "left" | "right">;
  backgroundColor?: string;
  statusBarStyle?: "light-content" | "dark-content" | "auto";
}

export const Screen: React.FC<ScreenProps> = ({
  children,
  style,
  scrollable = true,
  preset = "auto",
  safeAreaEdges = ["top", "bottom"],
  backgroundColor,
  testID,
  statusBarStyle = "auto",
  ...scrollViewProps
}) => {
  const { theme, adaptiveProps, currentMovementMode } = useAdaptiveUI();
  const insets = useSafeAreaInsets();

  const screenStyle: ViewStyle = {
    flex: 1,
    backgroundColor: backgroundColor || theme.colors.background,
    paddingTop: safeAreaEdges.includes("top") ? insets.top : 0,
    paddingBottom: safeAreaEdges.includes("bottom") ? insets.bottom : 0,
    paddingLeft: safeAreaEdges.includes("left") ? insets.left : 0,
    paddingRight: safeAreaEdges.includes("right") ? insets.right : 0,
  };

  // Adaptive content padding based on movement mode
  const contentPadding =
    currentMovementMode === "DRIVING"
      ? theme.spacing?.lg || 24
      : theme.spacing?.md || 16;

  const contentStyle: ViewStyle = {
    padding: contentPadding,
    flexGrow: 1,
  };

  const shouldScroll = preset === "scroll" || (preset === "auto" && scrollable);

  return (
    <View style={[screenStyle, style]} testID={testID}>
      {shouldScroll ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={contentStyle}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          {...scrollViewProps}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={contentStyle}>{children}</View>
      )}
    </View>
  );
};

// Spacer Component - Flexible or fixed spacing
interface SpacerProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl" | number;
  flex?: boolean;
  horizontal?: boolean;
  testID?: string;
}

export const Spacer: React.FC<SpacerProps> = ({
  size = "md",
  flex = false,
  horizontal = false,
  testID,
}) => {
  const { theme, adaptiveProps } = useAdaptiveUI();

  if (flex) {
    return <View style={{ flex: 1 }} testID={testID} />;
  }

  const getSize = (): number => {
    if (typeof size === "number") return size;

    const sizeMap = {
      xs: theme.spacing?.xs || 4,
      sm: theme.spacing?.sm || 8,
      md: theme.spacing?.md || 16,
      lg: theme.spacing?.lg || 24,
      xl: theme.spacing?.xl || 32,
    };

    let baseSize = sizeMap[size];

    // Apply adaptive spacing
    if (adaptiveProps.adaptiveSpacing === "loose") {
      baseSize = Math.round(baseSize * 1.25);
    } else if (adaptiveProps.adaptiveSpacing === "compact") {
      baseSize = Math.round(baseSize * 0.75);
    }

    return baseSize;
  };

  const spacerSize = getSize();
  const spacerStyle: ViewStyle = horizontal
    ? { width: spacerSize }
    : { height: spacerSize };

  return <View style={spacerStyle} testID={testID} />;
};

// Center Component - Centers content horizontally and/or vertically
interface CenterProps extends BaseLayoutProps {
  horizontal?: boolean;
  vertical?: boolean;
}

export const Center: React.FC<CenterProps> = ({
  children,
  style,
  horizontal = true,
  vertical = true,
  testID,
}) => {
  const centerStyle: ViewStyle = {
    ...(horizontal && { alignItems: "center" }),
    ...(vertical && { justifyContent: "center" }),
    ...(vertical && { flex: 1 }),
  };

  return (
    <View style={[centerStyle, style]} testID={testID}>
      {children}
    </View>
  );
};

// Divider Component - Visual separator with intelligent styling
interface DividerProps {
  orientation?: "horizontal" | "vertical";
  thickness?: number;
  color?: string;
  style?: ViewStyle;
  testID?: string;
}

export const Divider: React.FC<DividerProps> = ({
  orientation = "horizontal",
  thickness,
  color,
  style,
  testID,
}) => {
  const { theme, adaptiveProps } = useAdaptiveUI();

  const defaultThickness = adaptiveProps.highContrastMode ? 2 : 1;
  const dividerColor = color || theme.colors.border;

  const dividerStyle: ViewStyle =
    orientation === "horizontal"
      ? {
          height: thickness || defaultThickness,
          backgroundColor: dividerColor,
          width: "100%",
        }
      : {
          width: thickness || defaultThickness,
          backgroundColor: dividerColor,
          height: "100%",
        };

  return <View style={[dividerStyle, style]} testID={testID} />;
};

export default {
  Container,
  Stack,
  Row,
  Grid,
  Screen,
  Spacer,
  Center,
  Divider,
};
