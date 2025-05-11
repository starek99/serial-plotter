"use client"

import { useSerialContext } from "../contexts/SerialContext"
import { useSerial } from "../hooks/useSerial"
import { Button } from "../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card"
import { Badge } from "../components/ui/badge"
import { Checkbox } from "../components/ui/checkbox"
import { Label } from "../components/ui/label"
import { Pause, Play, Plug, PlugIcon as PlugOff } from "lucide-react"
import { ScrollArea } from "../components/ui/scroll-area"
import { useState, useMemo } from "react"

export function SerialControls() {
  const {isPaused, setIsPaused, data, isConnected } = useSerialContext()
  const { connectSerial, disconnectSerial } = useSerial()

  // Get all unique channels
  const channels = useMemo(() => {
    const set = new Set<string>()
    data.forEach((d) => {
      if (d.channel && typeof d.channel === "string" && !d.channel.includes("�")) {
        set.add(d.channel)
      }
    })
    return Array.from(set)
  }, [data])

  // State for which channels are visible
  const [selectedChannels, setSelectedChannels] = useState<Set<string>>(new Set(channels))

  // Update selected channels when new ones are detected
  useState(() => {
    const validChannels = channels.filter((ch) => typeof ch === "string" && !ch.includes("�") && ch.trim() !== "")
    setSelectedChannels(new Set(validChannels))
  })

  const toggleChannel = (channel: string) => {
    setSelectedChannels((prev) => {
      const newSet = new Set(prev)
      newSet.has(channel) ? newSet.delete(channel) : newSet.add(channel)
      return newSet
    })
  }

  // Generate static colors for lines
  const getLineColor = (channel: string) => {
    const colors = {
      SENSOR_1: "bg-blue-500 dark:bg-blue-400",
      SENSOR_2: "bg-red-500 dark:bg-red-400",
      SENSOR_3: "bg-green-500 dark:bg-green-400",
      SENSOR_4: "bg-amber-500 dark:bg-amber-400",
      SENSOR_5: "bg-violet-500 dark:bg-violet-400",
      default: "bg-slate-500 dark:bg-slate-400",
    }

    return colors[channel as keyof typeof colors] || colors.default
  }

  // Get the latest readings
  const latestReadings = useMemo(() => {
    if (data.length === 0) return []

    // Group by channel and get the latest for each
    const latestByChannel = new Map<string, { value: number; timestamp: number }>()

    for (const point of data) {
      if (!point.channel) continue

      if (!latestByChannel.has(point.channel) || point.timestamp > latestByChannel.get(point.channel)!.timestamp) {
        latestByChannel.set(point.channel, {
          value: point.value,
          timestamp: point.timestamp,
        })
      }
    }

    return Array.from(latestByChannel.entries()).map(([channel, data]) => ({
      channel,
      value: data.value,
      timestamp: new Date(data.timestamp).toLocaleTimeString(),
    }))
  }, [data])

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Connection</CardTitle>
          <CardDescription>Connect to your serial device</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2">
          <Button 
  onClick={isConnected ? disconnectSerial : connectSerial}
  variant={isConnected ? "destructive" : "default"}
>
  {isConnected ? "Disconnect" : "Connect"}

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
              <Button onClick={() => setIsPaused(!isPaused)} variant="outline" className="w-full">
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
          </div>

          {isConnected && (
            <Badge variant={isPaused ? "outline" : "default"} className="w-full justify-center">
              {isPaused ? "Paused" : "Receiving data"}
            </Badge>
          )}
        </CardContent>
      </Card>

      {channels.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Sensors</CardTitle>
            <CardDescription>Toggle sensor visibility</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px] pr-4">
              <div className="space-y-2">
                {channels.map((channel) => (
                  <div key={channel} className="flex items-center space-x-2 rounded-md p-2 hover:bg-accent">
                    <Checkbox
                      id={`channel-${channel}`}
                      checked={selectedChannels.has(channel)}
                      onCheckedChange={() => toggleChannel(channel)}
                    />
                    <div className={`h-3 w-3 rounded-full ${getLineColor(channel)}`} />
                    <Label htmlFor={`channel-${channel}`} className="flex-1 cursor-pointer">
                      {channel}
                    </Label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {latestReadings.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Latest Readings</CardTitle>
            <CardDescription>Most recent sensor values</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px] pr-4">
              <div className="space-y-2">
                {latestReadings.map((reading, index) => (
                  <div key={index} className="flex items-center justify-between rounded-md p-2 hover:bg-accent">
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${getLineColor(reading.channel)}`} />
                      <span className="font-medium">{reading.channel}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono">{reading.value.toFixed(2)}</span>
                      <div className="text-xs text-muted-foreground">{reading.timestamp}</div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
