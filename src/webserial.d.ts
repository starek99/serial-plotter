// src/webserial.d.ts

interface SerialPort {
    readonly readable: ReadableStream<Uint8Array> | null;
    readonly writable: WritableStream<Uint8Array> | null;
    open(options: { baudRate: number }): Promise<void>;
    close(): Promise<void>;
  }
  
  interface Serial {
    getPorts(): Promise<SerialPort[]>;
    requestPort(options?: SerialPortRequestOptions): Promise<SerialPort>;
  }
  
  interface Navigator {
    serial: Serial;
  }
  
  interface SerialPortRequestOptions {
    filters?: Array<{ usbVendorId?: number; usbProductId?: number }>;
  }
  