"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
} from "react";
import { useSerial } from "../hooks/useSerial";

export interface SerialDataPoint {
  timestamp: number;
  value: number;
  channel: string;
}

interface SerialContextType {
  baudRate: number;
  setBaudRate: (rate: number) => void;
  isConnected: boolean;
  isPaused: boolean;
  setIsPaused: (paused: boolean) => void;
  data: SerialDataPoint[];
  addDataPoint: (point: SerialDataPoint) => void;
  clearData: () => void;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

const SerialContext = createContext<SerialContextType | undefined>(undefined);

export const SerialProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isConnected, connectSerial, disconnectSerial, startReading } =
    useSerial();
  const [baudRate, setBaudRate] = useState<number>(9600);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [data, setData] = useState<SerialDataPoint[]>([]);

  const addDataPoint = useCallback((point: SerialDataPoint) => {
    setData((prev) => [...prev, point]);
  }, []);

  const clearData = useCallback(() => {
    setData([]);
  }, []);

  const value = useMemo(
    () => ({
      baudRate,
      setBaudRate,
      isConnected,
      isPaused,
      setIsPaused,
      data,
      addDataPoint,
      clearData,
      connect: connectSerial,
      disconnect: disconnectSerial,
    }),
    [baudRate, isConnected, isPaused, data, addDataPoint, clearData]
  );

  useEffect(() => {
    let unsubscriber: () => void | undefined;
    if (isConnected && !isPaused) {
      console.log("STARTING TO READ!");
      unsubscriber = startReading((dp) => addDataPoint(dp));
    }

    return () => {
      unsubscriber?.();
    };
  }, [isConnected, isPaused]);

  return (
    <SerialContext.Provider value={value}>{children}</SerialContext.Provider>
  );
};

export const useSerialContext = (): SerialContextType => {
  const context = useContext(SerialContext);
  if (!context) {
    throw new Error("useSerialContext must be used within a SerialProvider");
  }
  return context;
};
