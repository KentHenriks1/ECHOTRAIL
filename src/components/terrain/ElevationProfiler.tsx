import React, { useMemo } from "react";
import { View, Text, StyleSheet, Dimensions, ScrollView } from "react-native";
import {
  Svg,
  Path,
  LinearGradient,
  Defs,
  Stop,
  Circle,
  Text as SvgText,
  Line,
} from "react-native-svg";
import { MaterialIcons } from "@expo/vector-icons";
import { Trail, TrailPoint, Coordinate } from "../../types/Trail";
import { Theme } from "../../ui";
import { ModernCard } from "../modern";

interface ElevationData {
  distance: number; // cumulative distance in meters
  elevation: number; // elevation in meters
  coordinate: Coordinate;
  slope: number; // slope percentage
  grade: "flat" | "gentle" | "moderate" | "steep" | "very-steep";
}

interface ElevationProfilerProps {
  trail: Trail;
  theme: Theme;
  height?: number;
  showDetails?: boolean;
  interactive?: boolean;
  currentPosition?: number; // current distance along trail
}

export const ElevationProfiler: React.FC<ElevationProfilerProps> = ({
  trail,
  theme,
  height = 200,
  showDetails = true,
  interactive = false,
  currentPosition,
}) => {
  const { width: screenWidth } = Dimensions.get("window");
  const chartWidth = screenWidth - 32; // Account for card padding
  const chartHeight = height;

  const styles = createStyles(theme);

  const elevationData = useMemo(() => {
    return calculateElevationData(trail.waypoints);
  }, [trail.waypoints]);

  const stats = useMemo(() => {
    return calculateElevationStats(elevationData);
  }, [elevationData]);

  const pathData = useMemo(() => {
    return generatePathData(
      elevationData,
      chartWidth,
      chartHeight,
      stats.minElevation,
      stats.maxElevation
    );
  }, [elevationData, chartWidth, chartHeight, stats]);

  const gradientZones = useMemo(() => {
    return identifyGradientZones(elevationData);
  }, [elevationData]);

  const getSlopeColor = (slope: number): string => {
    const absSlope = Math.abs(slope);
    if (absSlope < 5) return "#22c55e"; // Green - easy
    if (absSlope < 10) return "#f59e0b"; // Yellow - moderate
    if (absSlope < 15) return "#ef4444"; // Red - hard
    return "#8b5cf6"; // Purple - very hard
  };

  const getSlopeGrade = (slope: number): ElevationData["grade"] => {
    const absSlope = Math.abs(slope);
    if (absSlope < 3) return "flat";
    if (absSlope < 8) return "gentle";
    if (absSlope < 15) return "moderate";
    if (absSlope < 25) return "steep";
    return "very-steep";
  };

  const getGradeLabel = (grade: ElevationData["grade"]): string => {
    switch (grade) {
      case "flat":
        return "Flatt";
      case "gentle":
        return "Lett";
      case "moderate":
        return "Moderat";
      case "steep":
        return "Bratt";
      case "very-steep":
        return "Meget bratt";
    }
  };

  return (
    <ModernCard theme={theme} variant="elevated" style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <MaterialIcons
            name="terrain"
            size={24}
            color={theme.colors.primary}
          />
          <Text style={[styles.title, { color: theme.colors.text }]}>
            Høydeprofil
          </Text>
        </View>

        {showDetails && (
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: theme.colors.primary }]}>
                {stats.totalElevationGain}m
              </Text>
              <Text
                style={[
                  styles.statLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Stigning
              </Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: theme.colors.error }]}>
                {stats.totalElevationLoss}m
              </Text>
              <Text
                style={[
                  styles.statLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Nedstigning
              </Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: theme.colors.text }]}>
                {stats.averageSlope.toFixed(1)}%
              </Text>
              <Text
                style={[
                  styles.statLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Gjennomsnitt
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Elevation Chart */}
      <View style={styles.chartContainer}>
        <Svg width={chartWidth} height={chartHeight} style={styles.chart}>
          <Defs>
            <LinearGradient
              id="elevationGradient"
              x1="0%"
              y1="0%"
              x2="0%"
              y2="100%"
            >
              <Stop
                offset="0%"
                stopColor={theme.colors.primary}
                stopOpacity="0.8"
              />
              <Stop
                offset="100%"
                stopColor={theme.colors.primary}
                stopOpacity="0.1"
              />
            </LinearGradient>

            {/* Gradient for slope zones */}
            <LinearGradient
              id="slopeGradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              {gradientZones.map((zone, index) => (
                <Stop
                  key={index}
                  offset={`${(zone._startDistance / stats.totalDistance) * 100}%`}
                  stopColor={getSlopeColor(zone.averageSlope)}
                />
              ))}
            </LinearGradient>
          </Defs>

          {/* Grid lines */}
          {Array.from({ length: 5 }, (_, i) => {
            const y = (chartHeight / 4) * i;
            return (
              <Line
                key={i}
                x1={0}
                y1={y}
                x2={chartWidth}
                y2={y}
                stroke={theme.colors.border}
                strokeWidth={0.5}
                strokeDasharray="2,2"
              />
            );
          })}

          {/* Elevation area */}
          <Path d={pathData.areaPath} fill="url(#elevationGradient)" />

          {/* Elevation line */}
          <Path
            d={pathData.linePath}
            fill="none"
            stroke={theme.colors.primary}
            strokeWidth={2}
          />

          {/* Current position indicator */}
          {currentPosition !== undefined && (
            <Circle
              cx={(currentPosition / stats.totalDistance) * chartWidth}
              cy={getYPositionForDistance(
                currentPosition,
                elevationData,
                chartHeight,
                stats
              )}
              r={4}
              fill={theme.colors.secondary}
              stroke="white"
              strokeWidth={2}
            />
          )}

          {/* Elevation labels */}
          <SvgText x={5} y={15} fontSize={10} fill={theme.colors.textSecondary}>
            {Math.round(stats.maxElevation)}m
          </SvgText>

          <SvgText
            x={5}
            y={chartHeight - 5}
            fontSize={10}
            fill={theme.colors.textSecondary}
          >
            {Math.round(stats.minElevation)}m
          </SvgText>
        </Svg>

        {/* Distance markers */}
        <View style={styles.distanceMarkers}>
          {Array.from({ length: 5 }, (_, i) => {
            const distance = (stats.totalDistance / 4) * i;
            return (
              <Text
                key={i}
                style={[
                  styles.distanceMarker,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {(distance / 1000).toFixed(1)}km
              </Text>
            );
          })}
        </View>
      </View>

      {/* Slope Analysis */}
      {showDetails && (
        <View style={styles.slopeAnalysis}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Helningsanalyse
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.gradientZones}
          >
            {gradientZones.map((zone, index) => (
              <View key={index} style={styles.gradientZone}>
                <View
                  style={[
                    styles.gradientBar,
                    {
                      backgroundColor: getSlopeColor(zone.averageSlope),
                      height:
                        Math.min(Math.abs(zone.averageSlope) * 2, 40) + 10,
                    },
                  ]}
                />
                <Text
                  style={[styles.gradientLabel, { color: theme.colors.text }]}
                >
                  {`${zone.averageSlope > 0 ? "+" : ""}${zone.averageSlope.toFixed(1)}%`}
                </Text>
                <Text
                  style={[
                    styles.gradientDistance,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {((zone.endDistance - zone._startDistance) / 1000).toFixed(1)}
                  km
                </Text>
              </View>
            ))}
          </ScrollView>

          <View style={styles.gradientLegend}>
            <Text style={[styles.legendTitle, { color: theme.colors.text }]}>
              Vanskelighetsgrad:
            </Text>
            <View style={styles.legendItems}>
              {[
                { grade: "flat" as const, color: "#22c55e" },
                { grade: "gentle" as const, color: "#f59e0b" },
                { grade: "moderate" as const, color: "#ef4444" },
                { grade: "steep" as const, color: "#8b5cf6" },
              ].map(({ grade, color }) => (
                <View key={grade} style={styles.legendItem}>
                  <View
                    style={[styles.legendColor, { backgroundColor: color }]}
                  />
                  <Text
                    style={[
                      styles.legendText,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {getGradeLabel(grade)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      )}
    </ModernCard>
  );
};

// Helper functions
function calculateElevationData(coordinates: TrailPoint[]): ElevationData[] {
  const data: ElevationData[] = [];
  let totalDistance = 0;

  coordinates.forEach((coord, index) => {
    if (index > 0) {
      const prevCoord = coordinates[index - 1];
      const segmentDistance = calculateDistance(
        prevCoord.latitude,
        prevCoord.longitude,
        coord.latitude,
        coord.longitude
      );
      totalDistance += segmentDistance;
    }

    // Calculate slope (if not first or last point)
    let slope = 0;
    if (index > 0 && index < coordinates.length - 1) {
      const prevCoord = coordinates[index - 1];
      const nextCoord = coordinates[index + 1];

      const distanceToNext = calculateDistance(
        coord.latitude,
        coord.longitude,
        nextCoord.latitude,
        nextCoord.longitude
      );

      if (distanceToNext > 0) {
        const elevationChange =
          (nextCoord.elevation || 0) - (coord.elevation || 0);
        slope = (elevationChange / distanceToNext) * 100;
      }
    }

    data.push({
      distance: totalDistance,
      elevation: coord.elevation || 0,
      coordinate: coord,
      slope,
      grade: getSlopeGrade(slope),
    });
  });

  return data;
}

function calculateElevationStats(data: ElevationData[]) {
  let totalElevationGain = 0;
  let totalElevationLoss = 0;
  let totalSlope = 0;

  const elevations = data.map((d) => d.elevation);
  const minElevation = Math.min(...elevations);
  const maxElevation = Math.max(...elevations);
  const totalDistance = data[data.length - 1]?.distance || 0;

  for (let i = 1; i < data.length; i++) {
    const elevationChange = data[i].elevation - data[i - 1].elevation;
    if (elevationChange > 0) {
      totalElevationGain += elevationChange;
    } else {
      totalElevationLoss += Math.abs(elevationChange);
    }
    totalSlope += Math.abs(data[i].slope);
  }

  return {
    minElevation,
    maxElevation,
    totalElevationGain: Math.round(totalElevationGain),
    totalElevationLoss: Math.round(totalElevationLoss),
    totalDistance,
    averageSlope: data.length > 0 ? totalSlope / data.length : 0,
  };
}

function generatePathData(
  data: ElevationData[],
  width: number,
  height: number,
  minElevation: number,
  maxElevation: number
) {
  if (data.length === 0) {
    return { linePath: "", areaPath: "" };
  }

  const totalDistance = data[data.length - 1].distance;
  const elevationRange = maxElevation - minElevation || 1;

  const points = data.map((point) => {
    const x = (point.distance / totalDistance) * width;
    const y =
      height - ((point.elevation - minElevation) / elevationRange) * height;
    return { x, y };
  });

  // Create line path
  const linePath = points.reduce((path, point, index) => {
    const command = index === 0 ? "M" : "L";
    return `${path} ${command} ${point.x} ${point.y}`;
  }, "");

  // Create area path (for gradient fill)
  const areaPath = `${linePath} L ${width} ${height} L 0 ${height} Z`;

  return { linePath, areaPath };
}

function identifyGradientZones(data: ElevationData[]) {
  const zones: Array<{
    _startDistance: number;
    endDistance: number;
    averageSlope: number;
    grade: ElevationData["grade"];
  }> = [];

  let currentZoneStart = 0;
  let currentZoneSlopes: number[] = [];
  let currentGrade = data[0]?.grade || "flat";

  data.forEach((point, index) => {
    if (point.grade !== currentGrade || index === data.length - 1) {
      // End current zone
      if (currentZoneSlopes.length > 0) {
        const averageSlope =
          currentZoneSlopes.reduce((a, b) => a + b, 0) /
          currentZoneSlopes.length;
        zones.push({
          _startDistance: currentZoneStart,
          endDistance: point.distance,
          averageSlope: Math.round(averageSlope * 10) / 10,
          grade: currentGrade,
        });
      }

      // Start new zone
      currentZoneStart = point.distance;
      currentZoneSlopes = [point.slope];
      currentGrade = point.grade;
    } else {
      currentZoneSlopes.push(point.slope);
    }
  });

  return zones;
}

function getYPositionForDistance(
  distance: number,
  data: ElevationData[],
  height: number,
  stats: any
): number {
  // Find the closest data point
  const point = data.reduce((closest, current) => {
    return Math.abs(current.distance - distance) <
      Math.abs(closest.distance - distance)
      ? current
      : closest;
  });

  const elevationRange = stats.maxElevation - stats.minElevation || 1;
  return (
    height - ((point.elevation - stats.minElevation) / elevationRange) * height
  );
}

function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function getSlopeGrade(slope: number): ElevationData["grade"] {
  const absSlope = Math.abs(slope);
  if (absSlope < 3) return "flat";
  if (absSlope < 8) return "gentle";
  if (absSlope < 15) return "moderate";
  if (absSlope < 25) return "steep";
  return "very-steep";
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      margin: 16,
    },
    header: {
      padding: 16,
      paddingBottom: 0,
    },
    titleContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 12,
    },
    title: {
      fontSize: 18,
      fontWeight: "600",
      marginLeft: 8,
    },
    stats: {
      flexDirection: "row",
      justifyContent: "space-around",
    },
    stat: {
      alignItems: "center",
    },
    statValue: {
      fontSize: 18,
      fontWeight: "700",
    },
    statLabel: {
      fontSize: 12,
      marginTop: 2,
    },
    chartContainer: {
      padding: 16,
    },
    chart: {
      marginBottom: 8,
    },
    distanceMarkers: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    distanceMarker: {
      fontSize: 10,
    },
    slopeAnalysis: {
      padding: 16,
      paddingTop: 0,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "600",
      marginBottom: 12,
    },
    gradientZones: {
      marginBottom: 16,
    },
    gradientZone: {
      alignItems: "center",
      marginRight: 12,
      minWidth: 60,
    },
    gradientBar: {
      width: 8,
      borderRadius: 4,
      marginBottom: 4,
    },
    gradientLabel: {
      fontSize: 12,
      fontWeight: "600",
      marginBottom: 2,
    },
    gradientDistance: {
      fontSize: 10,
    },
    gradientLegend: {
      marginTop: 8,
    },
    legendTitle: {
      fontSize: 14,
      fontWeight: "600",
      marginBottom: 8,
    },
    legendItems: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
    },
    legendItem: {
      flexDirection: "row",
      alignItems: "center",
    },
    legendColor: {
      width: 12,
      height: 12,
      borderRadius: 2,
      marginRight: 4,
    },
    legendText: {
      fontSize: 12,
    },
  });
