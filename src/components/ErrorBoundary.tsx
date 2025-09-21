import React, { Component } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ScrollView,
} from "react-native";
import { logger } from "../utils/logger";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import ErrorHandler from "../services/ErrorHandler";
import { Theme, createTheme } from "../ui";
import { useColorScheme } from "react-native";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  theme?: Theme;
}

interface State {
  _hasError: boolean;
  _error: Error | null;
  _errorInfo: React.ErrorInfo | null;
  _errorId: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      _hasError: false,
      _error: null,
      _errorInfo: null,
      _errorId: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      _hasError: true,
      _error: error,
      _errorId: Date.now().toString(),
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ _errorInfo: errorInfo });

    // Log error through our error handler
    ErrorHandler.handleError(error, "React Error Boundary", {
      silent: true,
      logToStorage: true,
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // Log to console in development
    if (__DEV__) {
      logger.error("🚨 React Error Boundary caught an _error:", error);
      logger.error("Error Info:", errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({
      _hasError: false,
      _error: null,
      _errorInfo: null,
      _errorId: null,
    });
  };

  handleReportError = async () => {
    if (this.state._error) {
      try {
        const errorReport = await ErrorHandler.getErrorReport();
        logger.debug("Error Report Generated:", errorReport);
        // Here you could send the report to a crash reporting service
      } catch (reportError) {
        logger.warn("Failed to generate error report:", reportError);
      }
    }
  };

  render() {
    if (this.state._hasError) {
      // Custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <ErrorFallback
          error={this.state._error}
          errorInfo={this.state._errorInfo}
          onRetry={this.handleRetry}
          onReport={this.handleReportError}
          theme={this.props.theme}
        />
      );
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  onRetry: () => void;
  onReport: () => void;
  theme?: Theme;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  errorInfo,
  onRetry,
  onReport,
  theme: providedTheme,
}) => {
  // Use provided theme or create default
  const colorScheme = useColorScheme();
  const theme = providedTheme || createTheme(colorScheme || "light");
  const styles = createStyles(theme);

  const getErrorSeverity = (
    error: Error | null
  ): "critical" | "warning" | "info" => {
    if (!error) return "info";

    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || "";

    // Critical errors that completely break functionality
    if (
      message.includes("chunk") ||
      message.includes("network") ||
      stack.includes("native") ||
      message.includes("permission")
    ) {
      return "critical";
    }

    // Warnings for recoverable issues
    if (
      message.includes("component") ||
      message.includes("prop") ||
      message.includes("render")
    ) {
      return "warning";
    }

    return "info";
  };

  const severity = getErrorSeverity(error);

  const getSeverityIcon = () => {
    switch (severity) {
      case "critical":
        return "error";
      case "warning":
        return "warning";
      default:
        return "info";
    }
  };

  const getSeverityColor = () => {
    switch (severity) {
      case "critical":
        return "#ef4444";
      case "warning":
        return "#f59e0b";
      default:
        return theme.colors.primary;
    }
  };

  const getSeverityTitle = () => {
    switch (severity) {
      case "critical":
        return "Kritisk feil";
      case "warning":
        return "Advarsel";
      default:
        return "Noe gikk galt";
    }
  };

  const getSeverityDescription = () => {
    switch (severity) {
      case "critical":
        return "En kritisk feil oppstod som forhindrer normal funksjon. Prøv å starte appen på nytt.";
      case "warning":
        return "En feil oppstod, men du kan fortsette å bruke appen. Noen funksjoner kan være begrenset.";
      default:
        return "En uventet feil oppstod. Prøv å laste siden på nytt.";
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Error Icon and Title */}
        <View style={styles.header}>
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: `${getSeverityColor()}20` },
            ]}
          >
            <MaterialIcons
              name={getSeverityIcon()}
              size={48}
              color={getSeverityColor()}
            />
          </View>

          <Text style={[styles.title, { color: theme.colors.text }]}>
            {getSeverityTitle()}
          </Text>

          <Text
            style={[styles.description, { color: theme.colors.textSecondary }]}
          >
            {getSeverityDescription()}
          </Text>
        </View>

        {/* Error Details (Development only) */}
        {__DEV__ && error && (
          <View
            style={[
              styles.errorDetails,
              {
                backgroundColor: theme.colors.background,
                borderColor: getSeverityColor(),
              },
            ]}
          >
            <Text
              style={[styles.errorDetailsTitle, { color: theme.colors.text }]}
            >
              Feildetaljer (kun development):
            </Text>

            <Text style={[styles.errorMessage, { color: theme.colors.error }]}>
              {error.name}: {error.message}
            </Text>

            {error.stack && (
              <ScrollView style={styles.stackTrace} nestedScrollEnabled>
                <Text
                  style={[
                    styles.stackTraceText,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {error.stack}
                </Text>
              </ScrollView>
            )}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[
              styles.primaryButton,
              { backgroundColor: theme.colors.primary },
            ]}
            onPress={onRetry}
          >
            <MaterialIcons name="refresh" size={20} color="white" />
            <Text style={styles.primaryButtonText}>Prøv igjen</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.secondaryButton,
              { borderColor: theme.colors.primary },
            ]}
            onPress={onReport}
          >
            <MaterialIcons
              name="bug-report"
              size={20}
              color={theme.colors.primary}
            />
            <Text
              style={[
                styles.secondaryButtonText,
                { color: theme.colors.primary },
              ]}
            >
              Rapporter feil
            </Text>
          </TouchableOpacity>
        </View>

        {/* Help Text */}
        <View style={styles.helpSection}>
          <Text style={[styles.helpTitle, { color: theme.colors.text }]}>
            Trenger du hjelp?
          </Text>
          <Text
            style={[styles.helpText, { color: theme.colors.textSecondary }]}
          >
            • Sjekk internettforbindelsen din{"\n"}• Start appen på nytt{"\n"}•
            Kontroller at du har den nyeste versjonen{"\n"}• Prøv å slette og
            reinstallere appen
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// Hook for easier usage
export const useErrorBoundary = () => {
  const [error, setError] = React.useState<Error | null>(null);

  const showBoundary = React.useCallback((error: Error) => {
    setError(error);
  }, []);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  const resetBoundary = React.useCallback(() => {
    setError(null);
  }, []);

  return { showBoundary, resetBoundary };
};

// Higher-order component for wrapping components with error boundary
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryConfig?: {
    fallback?: React.ReactNode;
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  }
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary
      fallback={errorBoundaryConfig?.fallback}
      onError={errorBoundaryConfig?.onError}
    >
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    content: {
      flexGrow: 1,
      padding: 24,
      justifyContent: "center",
    },
    header: {
      alignItems: "center",
      marginBottom: 32,
    },
    iconContainer: {
      width: 96,
      height: 96,
      borderRadius: 48,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16,
    },
    title: {
      fontSize: 24,
      fontWeight: "700",
      textAlign: "center",
      marginBottom: 8,
    },
    description: {
      fontSize: 16,
      textAlign: "center",
      lineHeight: 24,
    },
    errorDetails: {
      borderWidth: 1,
      borderRadius: 8,
      padding: 16,
      marginBottom: 24,
      maxHeight: 200,
    },
    errorDetailsTitle: {
      fontSize: 14,
      fontWeight: "600",
      marginBottom: 8,
    },
    errorMessage: {
      fontSize: 14,
      fontWeight: "500",
      marginBottom: 12,
    },
    stackTrace: {
      flex: 1,
    },
    stackTraceText: {
      fontSize: 12,
      fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
      lineHeight: 16,
    },
    actions: {
      gap: 12,
      marginBottom: 24,
    },
    primaryButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 16,
      paddingHorizontal: 24,
      borderRadius: 12,
      gap: 8,
    },
    primaryButtonText: {
      color: "white",
      fontSize: 16,
      fontWeight: "600",
    },
    secondaryButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 16,
      paddingHorizontal: 24,
      borderRadius: 12,
      borderWidth: 2,
      gap: 8,
    },
    secondaryButtonText: {
      fontSize: 16,
      fontWeight: "600",
    },
    helpSection: {
      alignItems: "center",
    },
    helpTitle: {
      fontSize: 18,
      fontWeight: "600",
      marginBottom: 12,
    },
    helpText: {
      fontSize: 14,
      lineHeight: 20,
      textAlign: "center",
    },
  });
