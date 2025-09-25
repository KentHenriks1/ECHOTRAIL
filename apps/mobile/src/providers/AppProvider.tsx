/**
 * App Provider Stub - Temporary Implementation
 */

import React from "react";
import type { EnvironmentConfig } from "../core/config/types";

interface AppProviderProps {
  config: EnvironmentConfig;
  children: React.ReactNode;
}

export function AppProvider({
  children,
}: AppProviderProps): React.ReactElement {
  return <>{children}</>;
}
