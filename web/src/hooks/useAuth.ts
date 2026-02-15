"use client";

import { useContext } from "react";
import { AuthContext } from "@/components/auth/AuthProvider";
import type { AuthContextValue } from "@/components/auth/AuthProvider";

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
