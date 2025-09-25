import React from "react";
export function NotificationProvider({
  children,
}: {
  config?: any;
  children: React.ReactNode;
}): React.ReactElement {
  return <>{children}</>;
}
