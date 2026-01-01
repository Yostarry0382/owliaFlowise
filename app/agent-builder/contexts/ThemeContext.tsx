'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type ThemeMode = 'dark' | 'light';

interface ThemeColors {
  bg: {
    primary: string;
    secondary: string;
    tertiary: string;
    hover: string;
  };
  border: {
    primary: string;
    secondary: string;
  };
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
  };
  accent: string;
}

interface ThemeContextType {
  mode: ThemeMode;
  toggleTheme: () => void;
  colors: ThemeColors;
}

const darkColors: ThemeColors = {
  bg: {
    primary: '#0f0f1a',
    secondary: '#1e1e2f',
    tertiary: '#252536',
    hover: '#2d2d44',
  },
  border: {
    primary: '#2d2d44',
    secondary: '#3d3d54',
  },
  text: {
    primary: '#ffffff',
    secondary: '#888888',
    tertiary: '#666666',
  },
  accent: '#6366f1',
};

const lightColors: ThemeColors = {
  bg: {
    primary: '#f5f5f7',
    secondary: '#ffffff',
    tertiary: '#f0f0f2',
    hover: '#e8e8eb',
  },
  border: {
    primary: '#e0e0e0',
    secondary: '#d0d0d0',
  },
  text: {
    primary: '#1a1a1a',
    secondary: '#666666',
    tertiary: '#999999',
  },
  accent: '#6366f1',
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('dark');

  useEffect(() => {
    const savedTheme = localStorage.getItem('agent-builder-theme') as ThemeMode | null;
    if (savedTheme) {
      setMode(savedTheme);
    }
  }, []);

  const toggleTheme = () => {
    const newMode = mode === 'dark' ? 'light' : 'dark';
    setMode(newMode);
    localStorage.setItem('agent-builder-theme', newMode);
  };

  const colors = mode === 'dark' ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
