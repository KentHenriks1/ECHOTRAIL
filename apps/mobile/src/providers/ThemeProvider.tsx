/**
 * Theme Provider Stub - Temporary Implementation
 */

import React from "react";

interface ThemeProviderProps {
  config?: any;
  children: React.ReactNode;
}

export function ThemeProvider({
  children,
}: ThemeProviderProps): React.ReactElement {
  return <>{children}</>;
}
