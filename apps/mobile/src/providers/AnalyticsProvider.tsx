import React from "react";
export function AnalyticsProvider({
  children,
}: {
  config?: any;
  children: React.ReactNode;
}): React.ReactElement {
  return <>{children}</>;
}
