"use client"
import { useSerial } from "../hooks/useSerial"  
import { SerialControls } from "./SerialControls"
import {SerialPlot}  from "./SerialPlot"
import { ModeToggle } from "./ModeToggle"
import { useSerialContext } from "../contexts/SerialContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs"
import { Button } from "../components/ui/button"
import { Badge } from "../components/ui/badge"
import { ScrollArea } from "../components/ui/scroll-area"
import { Download, Settings, Pause, Play, Plug, PlugIcon as PlugOff } from "lucide-react"
import { useState,useEffect } from "react"
import { SettingsDialog } from "./SettingsDialog"


export function Dashboard() {

  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [logMessages, setLogMessages] = useState<string[]>([])
  const { data, isConnected, isPaused, setIsPaused, clearData } = useSerialContext()
  const { connectSerial, disconnectSerial, startReading, stopReading } = useSerial()
  const handleConnectClick = async () => {
    if (isConnected) {
      await disconnectSerial()
    } else {
      await connectSerial()
      await startReading()
    }
  }

  const handlePauseClick = async () => {
    if (isPaused) {
      await startReading()
      setIsPaused(false)
    } else {
      await stopReading()
      setIsPaused(true)
    }
  }

  // Update log when new data comes in
  useEffect(() => {
    if (data.length > 0 && !isPaused) {
      // Get the latest data point for each channel
      const latestByChannel = new Map<string, { value: number; timestamp: number }>()

      for (const point of data.slice(-10)) {
        // Look at last 10 points to catch all channels
        if (!point.channel) continue

        if (!latestByChannel.has(point.channel) || point.timestamp > latestByChannel.get(point.channel)!.timestamp) {
          latestByChannel.set(point.channel, {
            value: point.value,
            timestamp: point.timestamp,
          })
        }
      }

      if (latestByChannel.size > 0) {
        const timestamp = new Date().toLocaleTimeString()
        const message = `[${timestamp}] ${Array.from(latestByChannel.entries())
          .map(([channel, data]) => `${channel}: ${data.value.toFixed(2)}`)
          .join(", ")}`

        setLogMessages((prev) => [...prev.slice(-100), message]) // Keep last 100 messages
      }
    }
  }, [data, isPaused])

  const exportToCSV = () => {
    if (!data.length) return

    // Get all unique channels
    const channels = Array.from(new Set(data.map((d) => d.channel).filter((channel): channel is string => !!channel)))

    // Group data by timestamp
    const groupedData: Record<number, Record<string, any>> = {}
    data.forEach((d) => {
      if (!d.channel) return
      const ts = d.timestamp
      if (!groupedData[ts]) groupedData[ts] = { timestamp: ts }
      groupedData[ts][d.channel] = d.value
    })

    // Convert to array and sort by timestamp
    const rows = Object.values(groupedData).sort((a, b) => a.timestamp - b.timestamp)

    // Create CSV content
    const headers = ["timestamp", ...channels]
    const csvContent = [
      headers.join(","),
      ...rows.map((row) => [new Date(row.timestamp).toISOString(), ...channels.map((ch) => row[ch] ?? "")].join(",")),
    ].join("\n")

    // Download the file
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `ez-plotter-data-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleReset = () => {
    clearData()
    setLogMessages([])
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold">EZ Plotter</h1>
            <div className="flex items-center gap-2">
            <Button
      onClick={handleConnectClick}
      variant={isConnected ? "destructive" : "default"}
      size="sm"
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
                <Badge variant={isPaused ? "outline" : "default"}>{isPaused ? "Paused" : "Receiving"}</Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={exportToCSV}
              disabled={!data.length}
              title="Export data to CSV"
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => setIsSettingsOpen(true)} title="Settings">
              <Settings className="h-4 w-4" />
            </Button>
            <ModeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1 container py-4 flex flex-col gap-4">
        {/* Main Plot */}
        <SerialPlot />

        {/* Console Log */}
        <Card>
          <CardHeader className="py-2">
            <CardTitle className="text-sm">Console Log</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[150px] border rounded-md bg-muted/30 font-mono text-xs p-2">
              {logMessages.length === 0 ? (
                <div className="text-muted-foreground p-2">No data received yet...</div>
              ) : (
                <div className="space-y-1 p-2">
                  {logMessages.map((message, index) => (
                    <div key={index} className="break-all">
                      {message}
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
  )
}
