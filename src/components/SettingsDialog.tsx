"use client";

import { useState } from "react"
import { useSerialContext } from "../contexts/SerialContext"
import { Button } from "../components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select"
import { Label } from "../components/ui/label"
import { Input } from "../components/ui/input"
import { Trash2 } from "lucide-react"
import { Checkbox } from "../components/ui/checkbox"
import { useSerial } from "../hooks/useSerial"
import { toast } from "sonner"

export function SettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { baudRate, setBaudRate, clearData, isConnected, connect } = useSerialContext()
  const [localBaudRate, setLocalBaudRate] = useState(baudRate.toString())
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [customBaudRate, setCustomBaudRate] = useState("")

  const baudRates = ["9600", "19200", "38400", "57600", "115200", "230400", "460800", "921600"]

  const handleBaudRateChange = (value: string) => {
    setLocalBaudRate(value)
    setBaudRate(Number.parseInt(value, 10))
  }

  const handleCustomBaudRateSave = () => {
    const rate = Number.parseInt(customBaudRate, 10)
    if (!isNaN(rate) && rate > 0) {
      setLocalBaudRate(customBaudRate)
      setBaudRate(rate)
    }
  }

  const handleConnect = async () => {
    try {
      await connect();
      onOpenChange(false);
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
  };

  const handleClearData = () => {
    clearData()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Configure your serial connection and data settings</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="baud-rate" className="text-right">
              Baud Rate
            </Label>
            <Select 
              value={localBaudRate} 
              onValueChange={handleBaudRateChange}
              disabled={isConnected}
            >
              <SelectTrigger id="baud-rate" className="col-span-3">
                <SelectValue placeholder="Select baud rate" />
              </SelectTrigger>
              <SelectContent>
                {baudRates.map((rate) => (
                  <SelectItem key={rate} value={rate}>
                    {rate} bps
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox 
              id="advanced" 
              checked={showAdvanced} 
              onCheckedChange={(checked) => setShowAdvanced(checked as boolean)}
              disabled={isConnected}
            />
            <Label htmlFor="advanced">Show advanced baud rate options</Label>
          </div>

          {showAdvanced && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="advanced-baud" className="text-right">
                Advanced Rate
              </Label>
              <div className="col-span-3 flex gap-2">
                <Input
                  id="advanced-baud"
                  type="number"
                  value={customBaudRate}
                  onChange={(e) => setCustomBaudRate(e.target.value)}
                  disabled={isConnected}
                  className="flex-1"
                  placeholder="Enter custom baud rate"
                />
                <Button 
                  onClick={handleCustomBaudRateSave}
                  disabled={isConnected}
                  variant="secondary"
                >
                  Save
                </Button>
              </div>
            </div>
          )}

          <div className="border-t pt-4 mt-2">
            <Button variant="destructive" onClick={handleClearData} className="w-full">
              <Trash2 className="mr-2 h-4 w-4" /> Clear All Data
            </Button>
          </div>
        </div>
        {isConnected && (
          <p className="text-sm text-muted-foreground text-center mb-4">
            You need to disconnect before changing the baud rate
          </p>
        )}
        <DialogFooter>
          <div className="border-t pt-4 mt-2 flex gap-4 items-center">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleConnect}
              disabled={isConnected}
            >
              Connect
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
