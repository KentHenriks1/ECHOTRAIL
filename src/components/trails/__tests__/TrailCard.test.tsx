import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { TrailCard } from "../TrailCard";
import {
  mockTheme,
  mockTrailData,
} from "../../../__tests__/setup/testSetup.config";
import { Trail } from "../../../types/Trail";

// Mock @expo/vector-icons
jest.mock("@expo/vector-icons", () => ({
  MaterialIcons: ({ name, size, color, ...props }: any) => {
    const MockedComponent = require("react-native").Text;
    return (
      <MockedComponent testID={`material-icon-${name}`} {...props}>
        {name}
      </MockedComponent>
    );
  },
}));

// Mock expo-linear-gradient
jest.mock("expo-linear-gradient", () => ({
  LinearGradient: ({ children, ...props }: any) => {
    const MockedComponent = require("react-native").View;
    return <MockedComponent {...props}>{children}</MockedComponent>;
  },
}));

// Mock ModernCard component
jest.mock("../../modern", () => ({
  ModernCard: ({ children, ...props }: any) => {
    const MockedComponent = require("react-native").View;
    return (
      <MockedComponent testID="modern-card" {...props}>
        {children}
      </MockedComponent>
    );
  },
}));

// Animated is mocked in the global setup

describe("TrailCard", () => {
  const defaultProps = {
    trail: mockTrailData,
    theme: mockTheme,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render trail information correctly", () => {
      const { getByText } = render(<TrailCard {...defaultProps} />);

      expect(getByText("Test Trail")).toBeTruthy();
      expect(getByText("A beautiful test trail")).toBeTruthy();
      expect(getByText("5.0km")).toBeTruthy();
      expect(getByText("2t 0min")).toBeTruthy();
      expect(getByText("300m")).toBeTruthy(); // elevation gain
      expect(getByText("4.5")).toBeTruthy(); // rating
    });

    it("should render difficulty badge correctly", () => {
      const { getByText } = render(<TrailCard {...defaultProps} />);
      expect(getByText("Moderat")).toBeTruthy();
    });

    it("should render category badge correctly", () => {
      const { getByText } = render(<TrailCard {...defaultProps} />);
      expect(getByText("Hiking")).toBeTruthy();
    });

    it("should render audio guide indicator when audio points exist", () => {
      const trailWithAudio = {
        ...mockTrailData,
        audioGuidePoints: [
          {
            id: "1",
            coordinate: { latitude: 59.9139, longitude: 10.7522 },
            title: "Point 1",
            description: "Test point",
            audioScript: "Test audio",
            triggerRadius: 50,
            category: "history" as const,
          },
          {
            id: "2",
            coordinate: { latitude: 59.914, longitude: 10.7523 },
            title: "Point 2",
            description: "Test point 2",
            audioScript: "Test audio 2",
            triggerRadius: 50,
            category: "nature" as const,
          },
          {
            id: "3",
            coordinate: { latitude: 59.9141, longitude: 10.7524 },
            title: "Point 3",
            description: "Test point 3",
            audioScript: "Test audio 3",
            triggerRadius: 50,
            category: "culture" as const,
          },
        ],
      };

      const { getByText } = render(
        <TrailCard {...defaultProps} trail={trailWithAudio} />
      );

      expect(getByText("3 lydguide-punkter")).toBeTruthy();
    });

    it("should not render audio guide indicator when no audio points", () => {
      const trailWithoutAudio = {
        ...mockTrailData,
        audioGuidePoints: [],
      };

      const { queryByText } = render(
        <TrailCard {...defaultProps} trail={trailWithoutAudio} />
      );

      expect(queryByText(/lydguide-punkter/)).toBeNull();
    });
  });

  describe("Compact Mode", () => {
    it("should render compact version when compact prop is true", () => {
      const { getByText, queryByText } = render(
        <TrailCard {...defaultProps} compact={true} />
      );

      expect(getByText("Test Trail")).toBeTruthy();
      expect(getByText("5.0km • 2t 0min")).toBeTruthy();
      // Should not render full description in compact mode
      expect(queryByText("A beautiful test trail")).toBeNull();
    });

    it("should show user distance in compact mode when provided", () => {
      const { getByText } = render(
        <TrailCard
          {...defaultProps}
          compact={true}
          showDistance={true}
          userDistance={1500}
        />
      );

      expect(getByText("1.5km unna")).toBeTruthy();
    });
  });

  describe("Distance Display", () => {
    it("should show user distance when showDistance and userDistance are provided", () => {
      const { getByText } = render(
        <TrailCard {...defaultProps} showDistance={true} userDistance={2500} />
      );

      expect(getByText("2.5km fra din posisjon")).toBeTruthy();
    });

    it("should not show distance when showDistance is false", () => {
      const { queryByText } = render(
        <TrailCard {...defaultProps} showDistance={false} userDistance={2500} />
      );

      expect(queryByText(/fra din posisjon/)).toBeNull();
    });

    it("should format distance correctly for meters", () => {
      const { getByText } = render(
        <TrailCard {...defaultProps} showDistance={true} userDistance={500} />
      );

      expect(getByText("500m fra din posisjon")).toBeTruthy();
    });
  });

  describe("Difficulty Levels", () => {
    it("should render easy difficulty correctly", () => {
      const easyTrail: Trail = { ...mockTrailData, difficulty: "easy" };
      const { getByText } = render(
        <TrailCard {...defaultProps} trail={easyTrail} />
      );

      expect(getByText("Lett")).toBeTruthy();
    });

    it("should render hard difficulty correctly", () => {
      const hardTrail: Trail = { ...mockTrailData, difficulty: "hard" };
      const { getByText } = render(
        <TrailCard {...defaultProps} trail={hardTrail} />
      );

      expect(getByText("Vanskelig")).toBeTruthy();
    });

    it("should render extreme difficulty correctly", () => {
      const extremeTrail: Trail = { ...mockTrailData, difficulty: "extreme" };
      const { getByText } = render(
        <TrailCard {...defaultProps} trail={extremeTrail} />
      );

      expect(getByText("Ekstrem")).toBeTruthy();
    });
  });

  describe("Categories", () => {
    it("should render walking category correctly", () => {
      const walkingTrail: Trail = { ...mockTrailData, category: "walking" };
      const { getByText } = render(
        <TrailCard {...defaultProps} trail={walkingTrail} />
      );

      expect(getByText("Walking")).toBeTruthy();
    });

    it("should render cycling category correctly", () => {
      const cyclingTrail: Trail = { ...mockTrailData, category: "cycling" };
      const { getByText } = render(
        <TrailCard {...defaultProps} trail={cyclingTrail} />
      );

      expect(getByText("Cycling")).toBeTruthy();
    });

    it("should render cultural category correctly", () => {
      const culturalTrail: Trail = { ...mockTrailData, category: "cultural" };
      const { getByText } = render(
        <TrailCard {...defaultProps} trail={culturalTrail} />
      );

      expect(getByText("Cultural")).toBeTruthy();
    });
  });

  describe("User Interactions", () => {
    it("should call onPress when card is pressed", () => {
      const onPress = jest.fn();
      const { getByText } = render(
        <TrailCard {...defaultProps} onPress={onPress} />
      );

      fireEvent.press(getByText("Test Trail"));
      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it("should call onStartTrail when start button is pressed", () => {
      const onStartTrail = jest.fn();
      const { getByText } = render(
        <TrailCard {...defaultProps} onStartTrail={onStartTrail} />
      );

      fireEvent.press(getByText("Start sti"));
      expect(onStartTrail).toHaveBeenCalledTimes(1);
    });

    it("should not render start button when onStartTrail is not provided", () => {
      const { queryByText } = render(<TrailCard {...defaultProps} />);
      expect(queryByText("Start sti")).toBeNull();
    });

    it("should trigger scale animation when pressed", async () => {
      const mockSequence = jest.fn(() => ({ start: jest.fn() }));
      const mockTiming = jest.fn(() => ({ mockTiming: true }));

      require("react-native").Animated.sequence = mockSequence;
      require("react-native").Animated.timing = mockTiming;

      const { getByText } = render(<TrailCard {...defaultProps} />);

      fireEvent.press(getByText("Test Trail"));

      await waitFor(() => {
        expect(mockSequence).toHaveBeenCalled();
      });
    });
  });

  describe("Data Formatting", () => {
    it("should format short distances in meters", () => {
      const shortTrail: Trail = { ...mockTrailData, distance: 500 };
      const { getByText } = render(
        <TrailCard {...defaultProps} trail={shortTrail} />
      );

      expect(getByText("500m")).toBeTruthy();
    });

    it("should format long distances in kilometers", () => {
      const longTrail: Trail = { ...mockTrailData, distance: 15000 };
      const { getByText } = render(
        <TrailCard {...defaultProps} trail={longTrail} />
      );

      expect(getByText("15.0km")).toBeTruthy();
    });

    it("should format duration with hours and minutes", () => {
      const longTrail: Trail = { ...mockTrailData, estimatedDuration: 150 }; // 2h 30min
      const { getByText } = render(
        <TrailCard {...defaultProps} trail={longTrail} />
      );

      expect(getByText("2t 30min")).toBeTruthy();
    });

    it("should format duration with only minutes when less than an hour", () => {
      const shortTrail: Trail = { ...mockTrailData, estimatedDuration: 45 };
      const { getByText } = render(
        <TrailCard {...defaultProps} trail={shortTrail} />
      );

      expect(getByText("45min")).toBeTruthy();
    });

    it("should format rating with one decimal place", () => {
      const trailWithRating: Trail = { ...mockTrailData, rating: 3.7 };
      const { getByText } = render(
        <TrailCard {...defaultProps} trail={trailWithRating} />
      );

      expect(getByText("3.7")).toBeTruthy();
    });
  });

  describe("Edge Cases", () => {
    it("should handle missing description gracefully", () => {
      const trailWithoutDescription: Trail = {
        ...mockTrailData,
        description: undefined as any,
      };

      const { getByText } = render(
        <TrailCard {...defaultProps} trail={trailWithoutDescription} />
      );

      expect(getByText("Test Trail")).toBeTruthy(); // Should still render the name
    });

    it("should handle zero elevation gain", () => {
      const flatTrail: Trail = { ...mockTrailData, elevationGain: 0 };
      const { getByText } = render(
        <TrailCard {...defaultProps} trail={flatTrail} />
      );

      expect(getByText("0m")).toBeTruthy();
    });

    it("should handle very high ratings", () => {
      const perfectTrail: Trail = { ...mockTrailData, rating: 5.0 };
      const { getByText } = render(
        <TrailCard {...defaultProps} trail={perfectTrail} />
      );

      expect(getByText("5.0")).toBeTruthy();
    });

    it("should handle unknown difficulty", () => {
      const unknownTrail: Trail = {
        ...mockTrailData,
        difficulty: "unknown" as any,
      };
      const { getByText } = render(
        <TrailCard {...defaultProps} trail={unknownTrail} />
      );

      expect(getByText("Ukjent")).toBeTruthy();
    });

    it("should handle unknown category", () => {
      const unknownTrail: Trail = {
        ...mockTrailData,
        category: "unknown" as any,
      };
      const { getByText } = render(
        <TrailCard {...defaultProps} trail={unknownTrail} />
      );

      expect(getByText("Unknown")).toBeTruthy();
    });
  });

  describe("Accessibility", () => {
    it("should render with proper text accessibility", () => {
      const { getByText } = render(<TrailCard {...defaultProps} />);

      const titleElement = getByText("Test Trail");
      expect(titleElement).toBeTruthy();

      const descriptionElement = getByText("A beautiful test trail");
      expect(descriptionElement).toBeTruthy();
    });

    it("should handle long trail names with numberOfLines prop", () => {
      const longNameTrail: Trail = {
        ...mockTrailData,
        name: "This is a very long trail name that should be truncated when displayed in the card component",
      };

      const { getByText } = render(
        <TrailCard {...defaultProps} trail={longNameTrail} />
      );

      expect(getByText(/This is a very long trail name/)).toBeTruthy();
    });
  });
});
