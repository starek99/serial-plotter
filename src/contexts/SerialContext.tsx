"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
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

class CircularBuffer<T> {
  private buffer: T[];
  private head: number = 0;
  private tail: number = 0;
  private size: number = 0;

  constructor(private capacity: number) {
    this.buffer = new Array(capacity);
  }

  push(item: T): void {
    this.buffer[this.tail] = item;
    this.tail = (this.tail + 1) % this.capacity;
    if (this.size < this.capacity) {
      this.size++;
    } else {
      this.head = (this.head + 1) % this.capacity;
    }
  }

  toArray(): T[] {
    const result = new Array(this.size);
    for (let i = 0; i < this.size; i++) {
      result[i] = this.buffer[(this.head + i) % this.capacity];
    }
    return result;
  }

  clear(): void {
    this.head = 0;
    this.tail = 0;
    this.size = 0;
  }
}

const SerialContext = createContext<SerialContextType | undefined>(undefined);

export const SerialProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [baudRate, setBaudRate] = useState(9600);
  const { isConnected, connectSerial, disconnectSerial, startReading } =
    useSerial(baudRate);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [data, setData] = useState<SerialDataPoint[]>([]);
  const lastCleanupRef = useRef<number>(Date.now());
  const MAX_BUFFER_SIZE = 10000; // Maximum number of points to keep
  const CLEANUP_INTERVAL = 20000;
  const [dataBuffer] = useState(() => new CircularBuffer<SerialDataPoint>(10000));

  const cleanupData = useCallback(() => {
    if (data.length > MAX_BUFFER_SIZE) {
      const newData = data.slice(-MAX_BUFFER_SIZE);
      setData(newData);
      dataBuffer.clear();
      newData.forEach(point => dataBuffer.push(point));
    }
    lastCleanupRef.current = Date.now();
  }, [data]);
  const addDataPoint = useCallback((point: SerialDataPoint) => {
    dataBuffer.push(point);
    setData(dataBuffer.toArray());
    }, []);

  const clearData = useCallback(() => {
    dataBuffer.clear();
  setData([]);
  }, []);

  useEffect(() => {
    let cleanupInterval: NodeJS.Timeout;
    
    if (isPaused) {
      cleanupInterval = setInterval(() => {
        const timeSinceLastCleanup = Date.now() - lastCleanupRef.current;
        if (timeSinceLastCleanup >= CLEANUP_INTERVAL) {
          cleanupData();
        }
      }, CLEANUP_INTERVAL);
    }

    return () => {
      if (cleanupInterval) {
        clearInterval(cleanupInterval);
      }
    };
  }, [isPaused, cleanupData]);

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
      console.log("Starting to read from serial port");
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
