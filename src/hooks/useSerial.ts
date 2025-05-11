import { useCallback, useEffect, useRef, useState } from "react";
import { SerialDataPoint } from "../contexts/SerialContext";
import { useSerialContext } from "../contexts/SerialContext";
import { toast } from "sonner";

// Global variables for serial port and related state
// let globalPort: SerialPort | null = null;
// let globalReader: ReadableStreamDefaultReader<string> | null = null;
// let globalTextDecoder: TextDecoderStream | null = null;
// let globalStopReading = false;
// let globalReadLoopPromise: Promise<void> | null = null;

export const useSerial = () => {
  const [port, setPort] = useState<SerialPort>();
  const [reader, setReader] = useState<Promise<void>>();
  const stopReading = useRef(true);

  // Connect to serial port
  const connectSerial = useCallback(async () => {
    try {
      if (!("serial" in navigator)) {
        throw new Error("Web Serial API not supported");
      }

      const serial = navigator.serial;

      const newPort = await serial.requestPort({});

      try {
        await newPort.open({ baudRate: 9600 });
        setPort(newPort);
      } catch (error) {
        console.error(error);
      }

      toast.success(`Connected`);
    } catch (err) {
      console.error("Connection error:", err);
      toast.error("Connection failed");
    }
  }, []);

  // Start reading from serial port
  const startReading = useCallback(
    (cb: (dataPoint: SerialDataPoint) => void) => {
      if (!port) throw new Error("No Port");
      if (!port.readable) throw new Error("Port not Readable");

      const textDecoder = new TextDecoderStream();
      const streamClosed = port.readable
        .pipeTo(textDecoder.writable)
        .catch((err) => {
          console.error("Stream error:", err);
          toast.error("Stream error occurred");
        });

      const reader = textDecoder.readable.getReader();
      stopReading.current = false;
      let buffer = "";

      const readLoop = async () => {
        try {
          while (!stopReading.current) {
            const { value, done } = await reader.read();
            if (done) break;

            if (value) {
              buffer += value;
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";

              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;

                const pairs = trimmed.split(",");
                for (const pair of pairs) {
                  const [channelRaw, valStrRaw] = pair.split(":");
                  if (!channelRaw || !valStrRaw) continue;

                  const channel = channelRaw.trim();
                  const numValue = parseFloat(valStrRaw.trim());
                  if (!isNaN(numValue)) {
                    cb({
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
          console.error("Error reading stream:", err);
          toast.error("Error reading data");
        } finally {
          try {
            await reader
              ?.cancel()
              .catch((e) => console.warn("Reader cancel error:", e));

            await streamClosed;

            // Release the lock
            reader?.releaseLock();
          } catch (finalErr) {
            console.warn("Cleanup error:", finalErr);
          }
        }
      };

      setReader(readLoop());

      return () => {
        stopReading.current = true;
      };
    },
    [port]
  );

  // Write to serial port
  const writeSerial = useCallback(async (data: string) => {
    // if (!globalPort || !globalPort.writable) {
    //   toast.error("No port open for writing");
    //   return;
    // }
    // const writer = globalPort.writable.getWriter();
    // try {
    //   const encoder = new TextEncoder();
    //   await writer.write(encoder.encode(data)); // Fix: encode string to Uint8Array
    //   toast.success("Data written to serial port");
    // } catch (err) {
    //   console.error("Write error:", err);
    //   toast.error("Failed to write data");
    // } finally {
    //   writer.releaseLock();
    // }
  }, []);

  // Disconnect from serial port
  const disconnectSerial = useCallback(async () => {
    if (!port) {
      toast.info("No port to disconnect");

      return;
    }

    try {
      stopReading.current = true;

      await reader;

      await port.close();

      setPort(undefined);
      toast.success("Disconnected");
    } catch (err) {
      console.error("Disconnection error:", err);
      toast.error("Disconnection failed");
    }
  }, [port, reader]);

  return {
    connectSerial,
    disconnectSerial,
    startReading,
    writeSerial,
    isConnected: !!port,
  };
};
