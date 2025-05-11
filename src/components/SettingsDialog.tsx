"use client"

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

export function SettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { baudRate, setBaudRate, clearData } = useSerialContext()
  const [localBaudRate, setLocalBaudRate] = useState(baudRate.toString())

  const baudRates = ["9600", "19200", "38400", "57600", "115200", "230400", "460800", "921600"]

  const handleSave = () => {
    const rate = Number.parseInt(localBaudRate, 10)
    if (!isNaN(rate) && rate > 0) {
      setBaudRate(rate)
    }
    onOpenChange(false)
  }

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
            <Select value={localBaudRate} onValueChange={setLocalBaudRate}>
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

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="custom-baud" className="text-right">
              Custom
            </Label>
            <Input
              id="custom-baud"
              type="number"
              value={localBaudRate}
              onChange={(e) => setLocalBaudRate(e.target.value)}
              className="col-span-3"
            />
          </div>

          <div className="border-t pt-4 mt-2">
            <Button variant="destructive" onClick={handleClearData} className="w-full">
              <Trash2 className="mr-2 h-4 w-4" /> Clear All Data
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
