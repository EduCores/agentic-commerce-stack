"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";

/** En sign-in el modo oscuro es el predeterminado (solo si el usuario no eligió antes). */
export function SignInTheme() {
  const { setTheme } = useTheme();
  useEffect(() => {
    try {
      if (!localStorage.getItem("theme")) setTheme("dark");
    } catch {
      setTheme("dark");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
