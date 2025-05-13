"use client"

import { useState, useMemo, useRef,useEffect } from "react"
import { useSerialContext } from "../contexts/SerialContext"
import { useTheme } from "next-themes"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@radix-ui/react-select"
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
  Brush,  // Add this import
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Slider } from "../components/ui/slider"
import { Switch } from "../components/ui/switch"
import { Label } from "../components/ui/label"
import { Checkbox } from "../components/ui/checkbox"
import { ScrollArea } from "../components/ui/scroll-area"
import { ZoomIn, ZoomOut, RefreshCw, Clock, LineChartIcon, Maximize2, Minimize2 } from "lucide-react"

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
  const [smoothing, setSmoothing] = useState(50)
  const [lineThickness, setLineThickness] = useState(2)
  const [autoScroll, setAutoScroll] = useState(true)
  
  // Add these new state variables
  const [showDataPoints, setShowDataPoints] = useState(true)
  const [yAxisRange, setYAxisRange] = useState<[number, number]>([0, 5000]);
  const [yAxisType, setYAxisType] = useState<"auto" | "fixed">("auto")
  const [gridOpacity, setGridOpacity] = useState(0.3)
  const [dataWindowSize, setDataWindowSize] = useState(100)
  const effectiveWindowSize = isPaused ? Math.min(dataWindowSize, 1000) : 100;
  const [isFullscreen, setIsFullscreen] = useState(false);
  

const toggleFullscreen = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
    setIsFullscreen(true);
  } else {
    document.exitFullscreen();
    setIsFullscreen(false);
  }
};

  // Get all unique channels
  // const channels = useMemo(() => {
  // [  const set = new Set<string>()
  //   data.forEach((d) => {
  //     if (d.channel && typeof d.channel === "string" && !d.channel.includes("�")) {
  //       // Trim and normalize the channel name
  //       set.add(d.channel.trim())
  //     }
  //   })
  //   // Sort for stability
  //   return Array.from(set).sort()]
  // }, [data])

  const [channels, setChannels] = useState<string[]>([
    
  ])

  useEffect(() => {
      const set = new Set<string>()
    data.forEach((d) => {
      if (d.channel && typeof d.channel === "string" && !d.channel.includes("�")) {
        // Trim and normalize the channel name
        set.add(d.channel.trim())
      }
    })

    const finalChannels = Array.from(set).sort();
    // Sort for stability
    if(!channels.length || channels.some((ch, i) => finalChannels[i] !== ch)) {
      setChannels(finalChannels)
    }
  }, [data])

  // State for which channels are visible
  const [selectedChannels, setSelectedChannels] = useState<Set<string>>(new Set())

  useEffect(() => {
    const validChannels = channels.filter((ch) => typeof ch === "string" && !ch.includes("�"))
    setSelectedChannels(new Set(validChannels))
  
  }, [channels])


  const reshapedData = useMemo(() => {
    const dataToProcess = data.slice(-Math.max(effectiveWindowSize, 2000));
    const grouped: Record<number, Record<string, any>> = {}
    dataToProcess.forEach((d) => {
      if (!d.channel || !selectedChannels.has(d.channel)) return 

      const ts = d.timestamp
      const ch = d.channel
      if (!grouped[ts]) grouped[ts] = { timestamp: ts }
      grouped[ts][ch] = d.value
    })

    return Object.values(grouped).sort((a, b) => a.timestamp - b.timestamp)
  }, [data, selectedChannels,effectiveWindowSize])
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


  const [channelColors, setChannelColors] = useState<Record<string, string>>({});

  // Define a set of predefined colors
  const predefinedColors = [
    "#3b82f6", // blue
    "#ef4444", // red
    "#10b981", // green
    "#f59e0b", // amber
    "#8b5cf6", // violet
    "#ec4899", // pink
    "#14b8a6", // teal
    "#f97316", // orange
    "#6366f1", // indigo
    "#84cc16", // lime
    "#9333ea", // purple
    "#06b6d4", // cyan
    "#eab308", // yellow
    "#64748b", // slate
    "#d946ef"  // fuchsia
  ];

  // Generate static colors for lines
  const getLineColor = (channel: string) => {
    if (channelColors[channel]) {
      return channelColors[channel];
    }
    // Use modulo to cycle through colors if we have more channels than colors
    const index = channels.indexOf(channel) % predefinedColors.length;
    return predefinedColors[index];
  }

  // Replace the color input with a color selector
  const toggleChannel = (channel: string) => {
    setSelectedChannels((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(channel)) {
        newSet.delete(channel)
      } else {
        newSet.add(channel)
      }
      return newSet
    })
  }


  const handleResetData = () => {
    clearData()
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
    <Card className="w-full bg-background text-foreground">
      <CardHeader className="pb-2 flex flex-row justify-between items-start bg-background text-foreground">
        <div>
          <CardTitle>Real-time Data Plot</CardTitle>
        </div>
        <div className="flex flex-wrap gap-2 bg-background text-foreground">
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

          <Button variant="outline" size="sm" onClick={handleResetData} className="flex items-center gap-1">
            <RefreshCw className="h-4 w-4" /> Reset Data
          </Button>

          <Button variant="outline" size="sm" onClick={toggleFullscreen} className="flex items-center gap-1">
            {isFullscreen ? (
              <>
                <Minimize2 className="h-4 w-4" /> Exit
              </>
            ) : (
              <>
                <Maximize2 className="h-4 w-4" /> Full
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Sensor Controls and Latest Readings */}
        {/* Combined Sensor Controls and Latest Readings */}
        <div className="border rounded-lg bg-card/50 backdrop-blur p-2">
          <ScrollArea className="h-[min(300px,max(120px,2.5rem*${channels.length}))]">
            <div className="space-y-2">
              {channels.map((channel) => (
                <div
                  key={channel}
                  className="flex items-center justify-between rounded-md p-2 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <Checkbox
                      id={`channel-${channel}`}
                      checked={selectedChannels.has(channel)}
                      onCheckedChange={() => toggleChannel(channel)}
                      className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />

<Select
                      value={channelColors[channel] || getLineColor(channel)}
                      onValueChange={(value) => setChannelColors(prev => ({
                        ...prev,
                        [channel]: value
                      }))}>
                      <SelectTrigger className="w-[100px] h-7 px-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded-full border border-border"
                            style={{ backgroundColor: channelColors[channel] || getLineColor(channel) }}
                          />
                          <span className="text-xs truncate">Color</span>
                        </div>
                      </SelectTrigger>
                      <SelectContent className="min-w-[160px] bg-popover border rounded-md shadow-md">
                        <div className="grid grid-cols-5 gap-1 p-2 bg-popover rounded-md">
                          {predefinedColors.map((color, index) => (
                            <SelectItem 
                              key={color} 
                              value={color}
                              className="p-1 m-0 hover:bg-accent rounded-md transition-colors data-[highlighted]:bg-accent"
                            >
                              <div
                                className="w-6 h-6 rounded-full border border-border hover:scale-110 transition-transform cursor-pointer"
                                style={{ backgroundColor: color }}
                                title={`Color ${index + 1}`}
                              />
                            </SelectItem>
                          ))}
                        </div>
                      </SelectContent>
                    </Select>
                    <Label
                      htmlFor={`channel-${channel}`}
                      className="font-medium text-sm cursor-pointer"
                    >
                      {channel}
                    </Label>
                  </div>
                  {latestReadings.find(r => r.channel === channel) && (
                    <div className="flex items-center gap-4 text-right">
                      <span className="font-mono text-sm font-semibold">
                        {latestReadings.find(r => r.channel === channel)?.value.toFixed(2)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {latestReadings.find(r => r.channel === channel)?.timestamp}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Chart Controls */}
        <div className="flex flex-wrap gap-4 p-4 border rounded-lg bg-card">
          <div className="flex gap-6 flex-wrap w-full">
            {/* Line Style Controls */}
            <div className="space-y-4 border-r pr-6 flex-1">
              <div className="flex flex-col gap-2 min-w-[200px]">
                <div className="flex justify-between items-center">
                  <Label htmlFor="smoothing" className="text-sm font-medium">
                    Line Smoothing
                  </Label>
                  <span className="text-sm font-mono text-muted-foreground">
                    {smoothing}%
                  </span>
                </div>
                <Slider
                  id="smoothing"
                  min={0}
                  max={100}
                  step={1}
                  value={[smoothing]}
                  onValueChange={(value) => setSmoothing(value[0])}
                  className="w-full"
                />
              </div>

              <div className="flex flex-col gap-2 min-w-[200px]">
                <div className="flex justify-between items-center">
                  <Label htmlFor="thickness" className="text-sm font-medium">
                    Line Width
                  </Label>
                   <div className="flex items-center gap-2">
                   <span className="text-sm font-mono text-muted-foreground">
                    {lineThickness}px
                  </span>
                  <Switch id="show-points" checked={showDataPoints} onCheckedChange={setShowDataPoints} />
              </div>
                </div>
                <Slider
                  id="thickness"
                  min={1}
                  max={5}
                  step={0.5}
                  value={[lineThickness]}
                  onValueChange={(value) => setLineThickness(value[0])}
                  className="w-full"
                />
              </div>
            </div>

            {/* Grid and Data Window Controls */}
            <div className="space-y-4 border-r pr-6 flex-1">
              <div className="flex flex-col gap-2 min-w-[200px]">
                <div className="flex justify-between items-center">
                  <Label className="text-sm font-medium">Grid Opacity</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono text-muted-foreground">
                      {(gridOpacity * 100).toFixed(0)}%
                    </span>
                    <Switch id="show-grid" checked={showGrid} onCheckedChange={setShowGrid} />
                  </div>
                </div>
                <Slider
                  min={0}
                  max={100}
                  value={[gridOpacity * 100]}
                  onValueChange={(value) => setGridOpacity(value[0] / 100)}
                  className="w-full"
                  disabled={!showGrid}
                />
              </div>

              <div className="flex flex-col gap-2 min-w-[200px]">
                <div className="flex justify-between items-center">
                  <Label className="text-sm font-medium">Data Window</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono text-muted-foreground">
                      {dataWindowSize} pts
                    </span>
                  </div>
                </div>
                <Slider
                  min={50}
                  max={1000}
                  step={50}
                  value={[dataWindowSize]}
                  onValueChange={(value) => setDataWindowSize(value[0])}
                  className="w-full"
                  disabled={!isPaused}
                />
              </div>
            </div>

            {/* Y-Axis Controls */}
            <div className="space-y-4 flex-1">
              <div className="flex flex-col gap-2 min-w-[200px]">
                <div className="flex justify-between items-center">
                  <Label className="text-sm font-medium">Y-Axis Range</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Auto</span>
                    <Switch
                      checked={yAxisType === "fixed"}
                      onCheckedChange={(checked) => setYAxisType(checked ? "fixed" : "auto")}
                    />
                    <span className="text-sm text-muted-foreground">Fixed</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {/* Maximum slider */}
                  <Slider
                    min={yAxisRange[0] + 100}
                    max={5000}
                    step={100}
                    value={[yAxisRange[1]]}
                    onValueChange={(value) => setYAxisRange([yAxisRange[0], value[0]])}
                    className="w-full"
                    disabled={yAxisType === "auto"}
                  />
                  <div className="flex justify-end">
                    <span className="text-xs font-mono text-muted-foreground">
                      Max: {yAxisRange[1].toFixed(0)}
                    </span>
                  </div>
                  
                  {/* Minimum slider */}
                  <Slider
                    min={0}
                    max={yAxisRange[1] - 100}
                    step={100}
                    value={[yAxisRange[0]]}
                    onValueChange={(value) => setYAxisRange([value[0], yAxisRange[1]])}
                    className="w-full"
                    disabled={yAxisType === "auto"}
                  />
                  <div className="flex justify-end">
                    <span className="text-xs font-mono text-muted-foreground">
                      Min: {yAxisRange[0].toFixed(0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Chart */}
        <div className="space-y-2">
          <div className="h-[55vh] min-h-[400px] border rounded-lg p-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart 
                ref={chartRef} 
                data={reshapedData.slice(-effectiveWindowSize)}  
                margin={{ top: 10, right: 20, left: 10, bottom: 0 }}
                onMouseMove={(e) => {
                  if (isPaused && e?.activeLabel) {
                    // Update tooltip or cursor position
                  }
                }}
              >
              {showGrid && <CartesianGrid strokeDasharray="3 3" opacity={gridOpacity} />}

              <XAxis
                dataKey="timestamp"
                type="number"
                tickFormatter={(ts) => (xAxisScale === "time" ? new Date(ts).toLocaleTimeString() : ts)}
                scale={xAxisScale}
                domain={zoomRange || ["dataMin", "dataMax"]}
                allowDataOverflow
              />

              <YAxis 
                domain={yAxisType === "fixed" ? yAxisRange : ["auto", "auto"]} 
                allowDataOverflow 
              />

              <Tooltip 
                content={<CustomTooltip />}
                isAnimationActive={false}
                cursor={{ stroke: isPaused ? "#666" : "transparent", strokeWidth: 1, strokeDasharray: "3 3" }}
              />
              

<Brush
                  dataKey="timestamp"
                  height={30}
                  stroke={theme === "dark" ? "#94a3b8" : "#64748b"}
                  fill={theme === "dark" ? "#1e293b" : "#f1f5f9"}
                  tickFormatter={(ts: number) => new Date(ts).toLocaleTimeString()}
                  display={isPaused ? "block" : "none"}
                />

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
                    dot={showDataPoints}
                    strokeWidth={lineThickness}
                    isAnimationActive={false}
                    activeDot={{ r: showDataPoints ? 6 : 4 }}
                    connectNulls
                  />
                ))}
            </LineChart>
          </ResponsiveContainer>
          
          
        </div>
        {/* <div className="h-[60px] border-b">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart 
                data={reshapedData} 
                margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
              >
                {channels
                  .filter((ch) => selectedChannels.has(ch) && typeof ch === "string" && !ch.includes("�"))
                  .map((channel) => (
                    <Line
                      key={channel}
                      type="monotone"
                      dataKey={channel}
                      stroke={getLineColor(channel)}
                      dot={false}
                      strokeWidth={1}
                      isAnimationActive={false}
                    />
                  ))}
              </LineChart>
            </ResponsiveContainer>
          </div> */}
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

