import React from "react";
export function GlobalErrorBoundary({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return <>{children}</>;
}
