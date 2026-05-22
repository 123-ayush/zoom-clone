"use client";
import { createContext, useContext } from "react";
import type { User } from "@/types";

const DEFAULT_USER: User = {
  id: 1,
  name: "Default User",
  email: "user@zoom-clone.dev",
  avatar_url: null,
  created_at: new Date().toISOString(),
};

const UserContext = createContext<User>(DEFAULT_USER);

export function UserProvider({ children }: { children: React.ReactNode }) {
  return <UserContext.Provider value={DEFAULT_USER}>{children}</UserContext.Provider>;
}

export function useUser(): User {
  return useContext(UserContext);
}
