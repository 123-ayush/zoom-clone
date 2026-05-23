"use client";
import { createContext, useContext } from "react";
import type { User } from "@/types";

const NAME = process.env.NEXT_PUBLIC_DEFAULT_USER_NAME ?? "Demo User";

// The assignment spec ("assume a default user is logged in") permits a single
// implicit user. This is centralized here so the value is never hard-coded
// anywhere else in the frontend.
const DEFAULT_USER: User = {
  id: 1,
  name: NAME,
  email: `${NAME.toLowerCase().replace(/\s+/g, ".")}@zoomclone.app`,
  avatar_url: null,
  // Fixed timestamp so server-rendered and client-rendered markup match.
  created_at: "1970-01-01T00:00:00.000Z",
};

const UserContext = createContext<User>(DEFAULT_USER);

export function UserProvider({ children }: { children: React.ReactNode }) {
  return (
    <UserContext.Provider value={DEFAULT_USER}>{children}</UserContext.Provider>
  );
}

export function useUser(): User {
  return useContext(UserContext);
}
