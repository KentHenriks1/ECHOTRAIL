import React from "react";
export function DatabaseProvider({
  children,
}: {
  config?: any;
  children: React.ReactNode;
}): React.ReactElement {
  return <>{children}</>;
}
