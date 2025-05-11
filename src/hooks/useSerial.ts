import { useCallback, useEffect } from 'react';
import { SerialDataPoint } from '../contexts/SerialContext';
import { useSerialContext } from '../contexts/SerialContext';
import { toast } from 'sonner';

// Global variables for serial port and related state
let globalPort: SerialPort | null = null;
let globalReader: ReadableStreamDefaultReader<string> | null = null;
let globalTextDecoder: TextDecoderStream | null = null;
let globalStopReading = false;
let globalReadLoopPromise: Promise<void> | null = null;

export const useSerial = () => {
  const {
    addDataPoint,
    setIsConnected,
    setPort,
    baudRate,
    isPaused,
  } = useSerialContext();

  // Connect to serial port
  const connectSerial = useCallback(async () => {
    try {
      if (!('serial' in navigator)) {
        throw new Error('Web Serial API not supported');
      }

      const serial = navigator.serial as Serial;

      if (globalPort?.readable || globalPort?.writable) {
        toast.error('Already connected to a port');
        return;
      }

      const newPort = await serial.requestPort();
      await newPort.open({ baudRate });
      globalPort = newPort;
      setPort(newPort);
      setIsConnected(true);
      toast.success(`Connected at ${baudRate} baud`);
    } catch (err) {
      console.error('Connection error:', err);
      setIsConnected(false);
      setPort(null);
      toast.error('Connection failed');
    }
  }, [baudRate, setIsConnected, setPort]);

  // Start reading from serial port
  const startReading = useCallback(() => {
    if (!globalPort || !globalPort.readable) {
      toast.error('No port open for reading');
      return;
    }
    globalTextDecoder = new TextDecoderStream();
    globalPort.readable.pipeTo(globalTextDecoder.writable).catch(() => {});
    globalReader = globalTextDecoder.readable.getReader();
    globalStopReading = false;

    let buffer = '';

    const readLoop = async () => {
      try {
        while (!globalStopReading && globalPort && globalPort.readable) {
          if (!globalReader) break;
          const { value, done } = await globalReader.read();
          if (done) break;

          if (value && !isPaused) {
            buffer += value;
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed) continue;

              const pairs = trimmed.split(',');

              for (const pair of pairs) {
                const [channelRaw, valStrRaw] = pair.split(':');
                if (!channelRaw || !valStrRaw) continue;

                const channel = channelRaw.trim();
                const numValue = parseFloat(valStrRaw.trim());

                if (!isNaN(numValue)) {
                  addDataPoint({
                    timestamp: Date.now(),
                    value: numValue,
                    channel,
                  });
                }
              }
            }
          }
        }
      } catch (err) {
        console.error('Error reading stream:', err);
        toast.error('Error reading data');
      } finally {
        if (globalReader) {
          try {
            if (typeof globalReader.releaseLock === "function") {
              globalReader.releaseLock();
            }          
          } catch (err) {
            console.warn('Reader release lock error:', err);
          }
          globalReader = null;
        }
        if (globalTextDecoder?.readable) {
          try {
            globalTextDecoder.readable.cancel?.();
          } catch (err) {
            console.warn('TextDecoder cancel error:', err);
          }
        }
      }
    };

    globalReadLoopPromise = readLoop();
  }, [addDataPoint, isPaused]);

  // Stop reading from serial port
  const stopReading = useCallback(async () => {
    globalStopReading = true;
    if (globalReader) {
      try {
        await globalReader.cancel();
      } catch (cancelErr) {
        console.warn('Reader cancel error:', cancelErr);
      }
      try {
        globalReader.releaseLock();
      } catch (releaseErr) {
        console.warn('Reader release lock error:', releaseErr);
      }
      globalReader = null;
    }
    if (globalTextDecoder) {
      try {
        await globalTextDecoder.readable.cancel?.();
      } catch (cancelErr) {
        console.warn('TextDecoder cancel error:', cancelErr);
      }
      globalTextDecoder = null;
    }
    globalReadLoopPromise = null;
  }, []);

  // Write to serial port
  const writeSerial = useCallback(async (data: string) => {
    if (!globalPort || !globalPort.writable) {
      toast.error('No port open for writing');
      return;
    }
    const writer = globalPort.writable.getWriter();
    try {
      const encoder = new TextEncoder();
      await writer.write(encoder.encode(data)); // Fix: encode string to Uint8Array
      toast.success('Data written to serial port');
    } catch (err) {
      console.error('Write error:', err);
      toast.error('Failed to write data');
    } finally {
      writer.releaseLock();
    }
  }, []);

  // Disconnect from serial port
  const disconnectSerial = useCallback(async () => {
    try {
      await stopReading();

      if (globalPort && globalPort.readable) {
        try {
          await globalPort.close();
          setPort(null);
          console.log('Serial port closed.');
        } catch (closeErr) {
          console.error('Port close error:', closeErr);
        }
      }
    } catch (err) {
      console.error('Error disconnecting:', err);
      toast.error('Error during disconnection');
    } finally {
      setIsConnected(false);
      setPort(null);
      globalPort = null;
    }
  }, [setIsConnected, setPort, stopReading]);

  useEffect(() => {
    return () => {
      if (globalPort && globalPort.readable) {
        disconnectSerial().catch(console.error);
      }
    };
  }, [disconnectSerial]);

  return { connectSerial, disconnectSerial, startReading, stopReading, writeSerial };
};