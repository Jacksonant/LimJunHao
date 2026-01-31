'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface LoadingContextType {
  isLoading: boolean;
  progress: number;
  setProgress: (value: number) => void;
  completeLoading: () => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export const useLoading = (): LoadingContextType => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};

interface LoadingProviderProps {
  children: React.ReactNode;
}

export const LoadingProvider: React.FC<LoadingProviderProps> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Simulate loading assets
    const timer = setInterval(() => {
      setProgress((prevProgress) => {
        const newProgress = prevProgress + Math.random() * 10;
        return newProgress > 90 ? 90 : newProgress;
      });
    }, 200);

    // Auto-complete loading after a timeout if resources are taking too long
    const timeout = setTimeout(() => {
      clearInterval(timer);
      setProgress(100);
      setTimeout(() => setIsLoading(false), 500);
    }, 5000);

    return () => {
      clearInterval(timer);
      clearTimeout(timeout);
    };
  }, []);

  const completeLoading = () => {
    setProgress(100);
    setTimeout(() => setIsLoading(false), 500);
  };

  return (
    <LoadingContext.Provider value={{ isLoading, progress, setProgress, completeLoading }}>
      {children}
    </LoadingContext.Provider>
  );
};