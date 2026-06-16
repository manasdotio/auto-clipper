"use client";

import React, { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    // Check local storage or system preference
    const isLight = localStorage.getItem("theme") === "light" || 
      (!localStorage.getItem("theme") && window.matchMedia("(prefers-color-scheme: light)").matches);
    
    if (isLight) {
      setTheme("light");
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    } else {
      setTheme("dark");
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
    }
  }, []);

  const toggleTheme = () => {
    if (theme === "dark") {
      setTheme("light");
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      localStorage.setItem("theme", "light");
    } else {
      setTheme("dark");
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    }
  };

  return (
    <button
      onClick={toggleTheme}
      title={theme === "dark" ? "Click to turn Light Mode ON" : "Click to turn Dark Mode ON"}
      className="p-2.5 rounded-full border border-border bg-surface-2/60 hover:bg-surface text-text-1 transition-all flex items-center justify-center cursor-pointer shadow-sm hover:scale-105 active:scale-95"
      aria-label="Toggle theme"
    >
      {theme === "dark" ? (
        <Sun className="w-4 h-4 text-amber-400 fill-amber-400/20" />
      ) : (
        <Moon className="w-4 h-4 text-accent fill-accent/20" />
      )}
    </button>
  );
}
