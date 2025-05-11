"use client"

import { useState, useMemo, useRef,useEffect } from "react"
import { useSerialContext } from "../contexts/SerialContext"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  type TooltipProps,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Slider } from "../components/ui/slider"
import { Switch } from "../components/ui/switch"
import { Label } from "../components/ui/label"
import { Checkbox } from "../components/ui/checkbox"
import { ScrollArea } from "../components/ui/scroll-area"
import { ZoomIn, ZoomOut, RefreshCw, Clock, LineChartIcon } from "lucide-react"
import { useTheme } from "next-themes"

export function SerialPlot() {
  const { data, isConnected, isPaused, clearData } = useSerialContext()
  const { theme } = useTheme()
  const chartRef = useRef<any>(null)

  // State for chart controls
  const [yAxisDomain, setYAxisDomain] = useState<[number | string, number | string]>(["auto", "auto"])
  const [xAxisScale, setXAxisScale] = useState<"auto" | "time">("time")
  const [isZoomed, setIsZoomed] = useState(false)
  const [zoomRange, setZoomRange] = useState<[number, number] | null>(null)
  const [showGrid, setShowGrid] = useState(true)
  const [smoothing, setSmoothing] = useState(50) // 0-100 scale for curve smoothing
  const [lineThickness, setLineThickness] = useState(2)
  const [autoScroll, setAutoScroll] = useState(true)

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
  const [selectedChannels, setSelectedChannels] = useState<Set<string>>(new Set())

  // Update selected channels when new ones are detected
  useEffect(() => {
    const validChannels = channels.filter((ch) => typeof ch === "string" && !ch.includes("�") && ch.trim() !== "")
    setSelectedChannels((prev) => {
      const newSet = new Set(prev)
      // Add any new channels
      validChannels.forEach((ch) => {
        if (!prev.has(ch)) {
          newSet.add(ch)
        }
      })
      return newSet
    })
  }, [channels])

  // Reshape data into a single object per timestamp, with each channel as a key
  const reshapedData = useMemo(() => {
    const grouped: Record<number, Record<string, any>> = {}

    data.forEach((d) => {
      if (!d.channel || !selectedChannels.has(d.channel)) return // Skip invalid or unselected channels

      const ts = d.timestamp
      const ch = d.channel
      if (!grouped[ts]) grouped[ts] = { timestamp: ts }
      grouped[ts][ch] = d.value
    })

    return Object.values(grouped).sort((a, b) => a.timestamp - b.timestamp)
  }, [data, selectedChannels])
  const statistics = useMemo(() => {
    const stats: Record<string, any> = {}

    channels.forEach((channel) => {
      // Skip invalid channels
      if (typeof channel !== "string" || channel.includes(" ")) return

      const values = reshapedData.map((d) => d[channel]).filter((v) => typeof v === "number") as number[]

      if (values.length === 0) return

      const mean = values.reduce((a, b) => a + b, 0) / values.length
      const min = Math.min(...values)
      const max = Math.max(...values)
      const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length
      const stdDev = Math.sqrt(variance)
      const sorted = [...values].sort((a, b) => a - b)
      const median =
        sorted.length % 2 === 0
          ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
          : sorted[Math.floor(sorted.length / 2)]
      const current = values[values.length - 1]

      stats[channel] = { mean, min, max, variance, stdDev, median, current }
    })

    return stats
  }, [reshapedData, channels])

  // Auto-scroll to latest data
  useEffect(() => {
    if (autoScroll && reshapedData.length > 0 && !isPaused) {
      setZoomRange(null)
    }
  }, [reshapedData, autoScroll, isPaused])

  // Generate static colors for lines
  const getLineColor = (channel: string) => {
    const colors = {
      SENSOR_1: theme === "dark" ? "#60a5fa" : "#3b82f6", // blue
      SENSOR_2: theme === "dark" ? "#f87171" : "#ef4444", // red
      SENSOR_3: theme === "dark" ? "#34d399" : "#10b981", // green
      SENSOR_4: theme === "dark" ? "#fbbf24" : "#f59e0b", // amber
      SENSOR_5: theme === "dark" ? "#a78bfa" : "#8b5cf6", // violet
      default: theme === "dark" ? "#94a3b8" : "#64748b", // slate
    }

    return colors[channel as keyof typeof colors] || colors.default
  }

  const toggleChannel = (channel: string) => {
    setSelectedChannels((prev) => {
      const newSet = new Set(prev)
      newSet.has(channel) ? newSet.delete(channel) : newSet.add(channel)
      return newSet
    })
  }

  const handleZoomIn = () => {
    if (chartRef.current) {
      const chart = chartRef.current
      const xAxis = chart.xAxis

      if (xAxis) {
        const xDomain = xAxis.domain
        const xCenter = (xDomain[0] + xDomain[1]) / 2
        const xRange = xDomain[1] - xDomain[0]

        setZoomRange([xCenter - xRange * 0.25, xCenter + xRange * 0.25])
        setIsZoomed(true)
        setAutoScroll(false)
      }
    }
  }

  const handleZoomOut = () => {
    if (chartRef.current) {
      const chart = chartRef.current
      const xAxis = chart.xAxis

      if (xAxis) {
        const xDomain = xAxis.domain
        const xCenter = (xDomain[0] + xDomain[1]) / 2
        const xRange = xDomain[1] - xDomain[0]

        setZoomRange([xCenter - xRange * 2, xCenter + xRange * 2])
      }
    }
  }

  const handleResetZoom = () => {
    clearData()
    setYAxisDomain(["auto", "auto"])
    setZoomRange(null)
    setIsZoomed(false)
    setAutoScroll(true)
  }

  const toggleXAxisScale = () => {
    setXAxisScale((prev) => (prev === "auto" ? "time" : "auto"))
  }

  const getCurveType = () => {
    // Map smoothing (0-100) to curve types
    if (smoothing < 25) return "linear"
    if (smoothing < 50) return "monotone"
    if (smoothing < 75) return "monotoneX"
    return "natural"
  }

  // Get the latest readings
  const latestReadings = useMemo(() => {
    if (data.length === 0) return []

    // Group by channel and get the latest for each
    const latestByChannel = new Map<string, { value: number; timestamp: number }>()

    for (const point of data) {
      if (!point.channel || !selectedChannels.has(point.channel)) continue

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
  }, [data, selectedChannels])

  const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-md shadow-md p-3">
          <p className="text-sm font-medium mb-1">{new Date(label).toLocaleTimeString()}</p>
          <div className="space-y-1">
            {payload.map((entry, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-sm font-medium">{entry.name}:</span>
                <span className="text-sm font-mono">{entry.value}</span>
              </div>
            ))}
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-2 flex flex-row justify-between items-start">
        <div>
          <CardTitle>Real-time Data Plot</CardTitle>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={toggleXAxisScale} className="flex items-center gap-1">
            {xAxisScale === "time" ? (
              <>
                <Clock className="h-4 w-4" /> Time
              </>
            ) : (
              <>
                <LineChartIcon className="h-4 w-4" /> Linear
              </>
            )}
          </Button>

          <Button variant="outline" size="sm" onClick={handleZoomIn} className="flex items-center gap-1">
            <ZoomIn className="h-4 w-4" /> Zoom In
          </Button>

          <Button variant="outline" size="sm" onClick={handleZoomOut} className="flex items-center gap-1">
            <ZoomOut className="h-4 w-4" /> Zoom Out
          </Button>

          <Button variant="outline" size="sm" onClick={handleResetZoom} className="flex items-center gap-1">
            <RefreshCw className="h-4 w-4" /> Reset
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Sensor Controls and Latest Readings */}
        <div className="flex flex-col md:flex-row gap-4">
          {/* Sensor Toggles */}
          <Card className="w-full md:w-1/2">
            <CardHeader className="py-2">
              <CardTitle className="text-sm">Sensor Visibility</CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <ScrollArea className="h-[100px]">
                <div className="space-y-2">
                  {channels.map((channel) => (
                    <div key={channel} className="flex items-center space-x-2 rounded-md p-1 hover:bg-accent">
                      <Checkbox
                        id={`channel-${channel}`}
                        checked={selectedChannels.has(channel)}
                        onCheckedChange={() => toggleChannel(channel)}
                      />
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: getLineColor(channel) }} />
                      <Label htmlFor={`channel-${channel}`} className="flex-1 cursor-pointer text-sm">
                        {channel}
                      </Label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Latest Readings */}
          <Card className="w-full md:w-1/2">
            <CardHeader className="py-2">
              <CardTitle className="text-sm">Latest Readings</CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <ScrollArea className="h-[100px]">
                {latestReadings.length === 0 ? (
                  <div className="text-muted-foreground text-sm p-2">No data available</div>
                ) : (
                  <div className="space-y-2">
                    {latestReadings.map((reading, index) => (
                      <div key={index} className="flex items-center justify-between rounded-md p-1 hover:bg-accent">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: getLineColor(reading.channel) }}
                          />
                          <span className="font-medium text-sm">{reading.channel}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono text-sm">{reading.value.toFixed(2)}</span>
                          <div className="text-xs text-muted-foreground">{reading.timestamp}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Chart Controls */}
        <div className="flex flex-wrap gap-2 justify-between items-center">
          <div className="space-y-2 w-full md:w-auto md:flex md:items-center md:gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="smoothing" className="w-24 text-sm">
                Smoothing
              </Label>
              <Slider
                id="smoothing"
                min={0}
                max={100}
                step={1}
                value={[smoothing]}
                onValueChange={(value) => setSmoothing(value[0])}
                className="w-32"
              />
              <span className="text-xs text-muted-foreground w-8 text-right">{smoothing}%</span>
            </div>

            <div className="flex items-center gap-2">
              <Label htmlFor="thickness" className="w-24 text-sm">
                Line Width
              </Label>
              <Slider
                id="thickness"
                min={1}
                max={5}
                step={0.5}
                value={[lineThickness]}
                onValueChange={(value) => setLineThickness(value[0])}
                className="w-32"
              />
              <span className="text-xs text-muted-foreground w-8 text-right">{lineThickness}px</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch id="auto-scroll" checked={autoScroll} onCheckedChange={setAutoScroll} />
              <Label htmlFor="auto-scroll" className="text-sm">
                Auto-scroll
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Switch id="show-grid" checked={showGrid} onCheckedChange={setShowGrid} />
              <Label htmlFor="show-grid" className="text-sm">
                Grid
              </Label>
            </div>
          </div>
        </div>

        {/* Main Chart */}
        <div className="h-[60vh] min-h-[400px] border rounded-lg p-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart ref={chartRef} data={reshapedData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
              {showGrid && <CartesianGrid strokeDasharray="3 3" opacity={0.5} />}

              <XAxis
                dataKey="timestamp"
                type="number"
                tickFormatter={(ts) => (xAxisScale === "time" ? new Date(ts).toLocaleTimeString() : ts)}
                scale={xAxisScale}
                domain={zoomRange || ["dataMin", "dataMax"]}
                allowDataOverflow
              />

              <YAxis domain={yAxisDomain} allowDataOverflow />

              <Tooltip content={<CustomTooltip />} />

              <Legend
                wrapperStyle={{ paddingTop: "10px" }}
                formatter={(value) => <span className="text-sm">{value}</span>}
              />

              {channels
                .filter((ch) => selectedChannels.has(ch) && typeof ch === "string" && !ch.includes("�"))
                .map((channel) => (
                  <Line
                    key={channel}
                    type={getCurveType()}
                    dataKey={channel}
                    name={channel}
                    stroke={getLineColor(channel)}
                    dot={false}
                    strokeWidth={lineThickness}
                    isAnimationActive={false}
                    activeDot={{ r: 6 }}
                    connectNulls
                  />
                ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
      <Card>  
        <CardContent>
           {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Object.entries(statistics).map(([channel, stat]) => (
          <Card key={channel} className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getLineColor(channel) }} />
                <CardTitle className="text-base">{channel}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-muted p-2 rounded flex flex-col">
                  <span className="text-muted-foreground">Current</span>
                  <span className="font-mono font-medium">{stat.current.toFixed(2)}</span>
                </div>
                <div className="bg-muted p-2 rounded flex flex-col">
                  <span className="text-muted-foreground">Mean</span>
                  <span className="font-mono font-medium">{stat.mean.toFixed(2)}</span>
                </div>
                <div className="bg-muted p-2 rounded flex flex-col">
                  <span className="text-muted-foreground">Min</span>
                  <span className="font-mono font-medium">{stat.min.toFixed(2)}</span>
                </div>
                <div className="bg-muted p-2 rounded flex flex-col">
                  <span className="text-muted-foreground">Max</span>
                  <span className="font-mono font-medium">{stat.max.toFixed(2)}</span>
                </div>
                <div className="bg-muted p-2 rounded flex flex-col">
                  <span className="text-muted-foreground">Std Dev</span>
                  <span className="font-mono font-medium">{stat.stdDev.toFixed(2)}</span>
                </div>
                <div className="bg-muted p-2 rounded flex flex-col">
                  <span className="text-muted-f oreground">Median</span>
                  <span className="font-mono font-medium">{stat.median.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

        </CardContent>
      </Card>
    </Card>
    
  )
}

