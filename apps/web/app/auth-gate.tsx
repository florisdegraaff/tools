"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

type AuthGateProps = {
  children: React.ReactNode;
};

const SESSION_KEY = "app:isAuthenticated";

export default function AuthGate({ children }: AuthGateProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const hasSession = window.sessionStorage.getItem(SESSION_KEY) === "true";
    setIsAuthenticated(hasSession);
    setIsReady(true);
  }, [pathname]);

  useEffect(() => {
    if (!isReady) return;

    if (!isAuthenticated && pathname !== "/login") {
      router.replace("/login");
      return;
    }

    if (isAuthenticated && pathname === "/login") {
      router.replace("/");
    }
  }, [isAuthenticated, isReady, pathname, router]);

  if (!isReady) return null;
  if (!isAuthenticated && pathname !== "/login") return null;

  return <>{children}</>;
}
