"use client";

import React, { createContext, useContext, useState, useCallback, useMemo } from "react";

export interface SerialDataPoint {
  timestamp: number;
  value: number;
  channel: string;
}

interface SerialContextType {
  port: SerialPort | null;
  setPort: (port: SerialPort | null) => void;
  baudRate: number;
  setBaudRate: (rate: number) => void;
  isConnected: boolean;
  setIsConnected: (connected: boolean) => void;
  isPaused: boolean;
  setIsPaused: (paused: boolean) => void;
  data: SerialDataPoint[];
  addDataPoint: (point: SerialDataPoint) => void;
  clearData: () => void;
}

const SerialContext = createContext<SerialContextType | undefined>(undefined);

export const SerialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [port, setPort] = useState<SerialPort | null>(null);
  const [baudRate, setBaudRate] = useState<number>(9600);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [data, setData] = useState<SerialDataPoint[]>([]);

  const addDataPoint = useCallback((point: SerialDataPoint) => {
    setData(prev => [...prev, point]);
  }, []);

  const clearData = useCallback(() => {
    setData([]);
  }, []);

  const value = useMemo(() => ({
    port,
    setPort,
    baudRate,
    setBaudRate,
    isConnected,
    setIsConnected,
    isPaused,
    setIsPaused,
    data,
    addDataPoint,
    clearData,
  }), [port, baudRate, isConnected, isPaused, data, addDataPoint, clearData]);

  return (
    <SerialContext.Provider value={value}>
      {children}
    </SerialContext.Provider>
  );
};

export const useSerialContext = (): SerialContextType => {
  const context = useContext(SerialContext);
  if (!context) {
    throw new Error("useSerialContext must be used within a SerialProvider");
  }
  return context;
};
