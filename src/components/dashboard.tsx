"use client";
import { useSerial } from "../hooks/useSerial";
import { SerialPlot } from "./SerialPlot";
import { ModeToggle } from "./ModeToggle";
import { useSerialContext } from "../contexts/SerialContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { ScrollArea } from "../components/ui/scroll-area";
import {
  Download,
  Settings,
  Pause,
  Play,
  Plug,
  PlugIcon as PlugOff,
  Terminal,
  Trash2,
  FileText,
  Table,
} from "lucide-react";
import { useState, useEffect } from "react";
import { SettingsDialog } from "./SettingsDialog";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";


export function Dashboard() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [logMessages, setLogMessages] = useState<string[]>([]);
  const {
    data,
    isConnected,
    isPaused,
    setIsPaused,
    clearData,
    connect,
    disconnect,
  } = useSerialContext();
  const handleConnectClick = async () => {
    if (isConnected) {
      try {
        await disconnect();
        // Instead of window.location.reload(), implement soft refresh
        clearData();
        setLogMessages([]);
        // Force a re-render by updating state
        setIsPaused(false);

      } catch (err) {
      }
    } else {
      try {
        await connect();
      } catch (err) {
        if (err instanceof Error && err.message.includes('No port selected')) {
          toast.warning("Connection Failed", {
            description: "No port was selected. Please select a port to connect.",
            duration: 2000
          });
        } else {
          toast.error("Connection Failed", {
            description: err instanceof Error ? err.message : "Unknown error occurred",
            duration: 2000
          });
        }
      }
    }
  };
  // Add export function for XLSX
const exportToXLSX = async () => {
  if (!data.length) return;
  
  // Dynamic import XLSX library
  const XLSX = await import('xlsx');

  // Get all unique channels
  const channels = Array.from(
    new Set(
      data
        .map((d) => d.channel)
        .filter((channel): channel is string => !!channel)
    )
  );

  // Group data by timestamp
  const groupedData: Record<number, Record<string, any>> = {};
  data.forEach((d) => {
    if (!d.channel) return;
    const ts = d.timestamp;
    if (!groupedData[ts]) groupedData[ts] = { timestamp: ts };
    groupedData[ts][d.channel] = d.value;
  });

  // Prepare data with proper type assertions
  const rows = Object.values(groupedData).sort(
    (a, b) => (a as { timestamp: number }).timestamp - (b as { timestamp: number }).timestamp
  ).map((row) => ({
    timestamp: new Date((row as { timestamp: number }).timestamp)
      .toISOString()
      .replace('T', ' ')
      .replace('Z', ''),
    ...channels.reduce<Record<string, any>>((acc, ch) => ({
      ...acc,
      [ch]: (row as Record<string, any>)[ch] ?? ''
    }), {})
  }));

  // Create workbook
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Data');
  
  // Save file
  XLSX.writeFile(wb, `ez-plotter-data-${new Date().toISOString().slice(0, 10)}.xlsx`);
};

  const handlePauseClick = async () => {
    console.log("Pause clicked");
    if (isPaused) {
      console.log("Resuming data reception");
      setIsPaused(false);
    } else {
      setIsPaused(true);
    }
  };

  // Update log when new data comes in
  useEffect(() => {
    if (data.length > 0 && !isPaused) {
      // Get the latest data point for each channel
      const latestByChannel = new Map<
        string,
        { value: number; timestamp: number }
      >();
      const dataToProcess = isPaused ? data.slice(-10) : data.slice(-100);
      for (const point of dataToProcess) {
        // Look at last 10 points to catch all channels
        if (!point.channel) continue;

        if (
          !latestByChannel.has(point.channel) ||
          point.timestamp > latestByChannel.get(point.channel)!.timestamp
        ) {
          latestByChannel.set(point.channel, {
            value: point.value,
            timestamp: point.timestamp,
          });
        }
      }

      if (latestByChannel.size > 0) {
        const timestamp = new Date().toLocaleTimeString();
        const message = `[${timestamp}] ${Array.from(latestByChannel.entries())
          .map(([channel, data]) => `${channel}: ${data.value.toFixed(2)}`)
          .join(", ")}`;

        setLogMessages((prev) => [...prev.slice(-100), message]); // Keep last 100 messages
      }
    }
  }, [data, isPaused]);

  const exportToCSV = () => {
    if (!data.length) return;

    // Get all unique channels
    const channels = Array.from(
      new Set(
        data
          .map((d) => d.channel)
          .filter((channel): channel is string => !!channel)
      )
    );

    // Group data by timestamp
    const groupedData: Record<number, Record<string, any>> = {};
    data.forEach((d) => {
      if (!d.channel) return;
      const ts = d.timestamp;
      if (!groupedData[ts]) groupedData[ts] = { timestamp: ts };
      groupedData[ts][d.channel] = d.value;
    });

    // Convert to array and sort by timestamp
    const rows = Object.values(groupedData).sort(
      (a, b) => a.timestamp - b.timestamp
    );

    // Create CSV content
    const headers = ["timestamp", ...channels];
    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        [
          new Date(row.timestamp)
            .toISOString()
            .replace('T', ' ')
            .replace('Z', ''),
          ...channels.map((ch) => row[ch] ?? ""),
        ].join(",")
      ),
    ].join("\n");

    // Download the file
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ez-plotter-data-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    clearData();
    setLogMessages([]);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
        <div className="flex h-16 items-center justify-between px-12">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold">EZ Plotter</h1>
            <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 border-r pr-4 mr-4 divide-x divide-border">
            <div className="pr-3">
              <Button
                onClick={handleConnectClick}
                variant={isConnected ? "destructive" : "default"}
                size="sm"
                className="min-w-[120px] justify-center"
              >
      {isConnected ? (
        <>
          <PlugOff className="mr-2 h-4 w-4" /> Disconnect
        </>
      ) : (
        <>
          <Plug className="mr-2 h-4 w-4" /> Connect
        </>
      )}
     </Button>
     </div>

     <div className="pl-4 flex items-center gap-2">
              {isConnected && (
                <Button onClick={handlePauseClick} variant="outline" size="sm">
                  {isPaused ? (
                    <>
                      <Play className="mr-2 h-4 w-4" /> Resume
                    </>
                  ) : (
                    <>
                      <Pause className="mr-2 h-4 w-4" /> Pause
                    </>
                  )}
                </Button>
              )}

              {isConnected && (
                <Badge 
                variant={isPaused ? "outline" : "default"}
                className="min-w-[90px] h-6 flex items-center justify-center text-sm font-medium"
              >
                {isPaused ? (
                  <>
                    <span className="flex items-center">
                      <Pause className="mr-2 h-4 w-4" />
                      Paused
                    </span>
                  </>
                ) : (
                  <>
                    <span className="flex items-center">
                      <Play className="mr-2 h-3 w-3 animate-pulse" />
                      Receiving
                    </span>
                  </>
                )}
              </Badge>
              )}
              </div>
            </div>
          </div>
</div>
          <div className="flex items-center gap-2">
          <a 
              href="https://thedevhouse.web.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors mr-4"
            >
              Powered By DevHouse
            </a>
  <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!data.length}
                  className="flex items-center gap-2 min-w-[100px] justify-center"
                >
                  <Download className="h-4 w-4" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={exportToCSV}>
                  <FileText className="h-4 w-4 mr-2" />
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportToXLSX}>
                  <Table className="h-4 w-4 mr-2" />
                  Export as XLSX
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsSettingsOpen(true)}
              title="Settings"
              className="hover:bg-accent/50"
            >
              <Settings className="h-4 w-4" />
            </Button>
            <ModeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1 px-12 py-4 flex flex-col gap-4">
        {/* Main Plot */}
        <SerialPlot />

        {/* Console Log */}
        <Card className="bg-card/50 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between py-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Terminal className="h-4 w-4" />
              Console Log
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={handleReset}
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Clear logs</span>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
  <ScrollArea className="h-[200px] rounded-md bg-muted/10 font-mono text-sm">
    {logMessages.length === 0 ? (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <Terminal className="h-6 w-6 mr-2 opacity-50" />
        No data received yet...
      </div>
    ) : (
      <div className="space-y-1.5 p-4" id="log-messages">
        {logMessages.map((message, index) => (
          <div
            key={index}
            className="log-message break-all rounded-sm px-3 py-1.5 hover:bg-accent/50 transition-colors bg-card/50 flex items-center gap-4 group"
          >
            <span className="text-xs text-muted-foreground whitespace-nowrap font-semibold">
              {message.split(']')[0].substring(1)}
            </span>
            <span className="flex-1 font-medium">
              {message.split(']')[1]}
            </span>
          </div>
        ))}
      </div>
    )}
  </ScrollArea>
</CardContent>
        </Card>
      </main>

      <SettingsDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
    </div>
  );
}
