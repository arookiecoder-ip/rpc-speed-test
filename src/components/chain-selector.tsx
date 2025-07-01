"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { CHAIN_NAMES } from "@/lib/rpc"
import { ChainIcon } from "./chain-icon"

const chainOptions = [
    { value: "auto", label: "Auto-Detect", icon: "HelpCircle"},
    ...Object.entries(CHAIN_NAMES)
        .filter(([id]) => id !== 'unknown')
        .map(([id, name]) => ({ value: id, label: name, icon: id }))
];

interface ChainSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function ChainSelector({ value, onChange, disabled }: ChainSelectorProps) {
  const [open, setOpen] = React.useState(false)

  const selectedLabel = chainOptions.find((option) => option.value === value)?.label || "Select chain...";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full sm:w-[200px] justify-between h-12 text-base bg-input border-border/80"
          disabled={disabled}
        >
          <div className="flex items-center gap-2">
            <ChainIcon chain={value === 'auto' ? 'HelpCircle' : value} className="w-5 h-5" />
            <span className="truncate">{selectedLabel}</span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Search chain..." />
          <CommandList>
            <CommandEmpty>No chain found.</CommandEmpty>
            <CommandGroup>
              {chainOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => {
                    onChange(option.value)
                    setOpen(false)
                  }}
                >
                    <div className="flex items-center gap-2">
                        <ChainIcon chain={option.icon} className="w-5 h-5" />
                        <span>{option.label}</span>
                    </div>
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
