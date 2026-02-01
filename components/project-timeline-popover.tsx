"use client"

import * as React from "react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer"
import { Project } from "@/lib/types"
import { formatDate } from "@/lib/utils/format"
import { Calendar as CalendarIcon, Clock, Info, X } from "lucide-react"
import { useIsMobile } from "@/components/ui/use-mobile"
import { cn } from "@/lib/utils"

interface ProjectTimelinePopoverProps {
  project: Project
  children: React.ReactNode
}

export function ProjectTimelinePopover({ project, children }: ProjectTimelinePopoverProps) {
  const startDate = project.startDate ? new Date(project.startDate) : null
  const endDate = project.endDate ? new Date(project.endDate) : null
  const deadline = new Date(project.deadline)
  const isMobile = useIsMobile()

  const content = (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h4 className="font-semibold text-sm">Project Timeline</h4>
        <div className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Info className="h-3 w-3" />
          <span>Click dates to view details</span>
        </div>
      </div>

      <div className="flex justify-center">
        <Calendar
          mode="single"
          className="rounded-md border shadow-sm w-full max-w-[320px]"
          selected={deadline}
          modifiers={{
            projectRange: (date) => {
              if (!startDate || !endDate) return false
              const d = new Date(date)
              d.setHours(0, 0, 0, 0)
              const start = new Date(startDate)
              start.setHours(0, 0, 0, 0)
              const end = new Date(endDate)
              end.setHours(0, 0, 0, 0)
              return d >= start && d <= end
            },
            deadline: (date) => {
              const d = new Date(date)
              d.setHours(0, 0, 0, 0)
              const dead = new Date(deadline)
              dead.setHours(0, 0, 0, 0)
              return d.getTime() === dead.getTime()
            }
          }}
          modifiersClassNames={{
            projectRange: "bg-accent/30 text-accent-foreground",
            deadline: "bg-warning text-warning-foreground font-bold outline outline-2 outline-warning outline-offset-1"
          }}
        />
      </div>

      <div className="space-y-2 pt-2 border-t border-border">
        {startDate && (
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-accent/30 rounded-full" />
              <span className="text-muted-foreground">Project Start</span>
            </div>
            <span className="font-medium">{formatDate(startDate)}</span>
          </div>
        )}
        {endDate && (
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-accent/30 rounded-full" />
              <span className="text-muted-foreground">Project End</span>
            </div>
            <span className="font-medium">{formatDate(endDate)}</span>
          </div>
        )}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-warning rounded-full" />
            <span className="text-muted-foreground">Bid Deadline</span>
          </div>
          <span className="font-bold text-warning">{formatDate(deadline)}</span>
        </div>
      </div>

      <div className="bg-muted/50 p-2 rounded-md text-[11px] text-muted-foreground">
        <p>Subcontractors must submit all bids before the deadline to be considered.</p>
      </div>
    </div>
  )

  if (isMobile) {
    return (
      <Drawer>
        <DrawerTrigger asChild>
          <div
            className="cursor-pointer hover:bg-muted/50 transition-colors rounded-md -m-1 p-1"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                e.currentTarget.click()
              }
            }}
          >
            {children}
          </div>
        </DrawerTrigger>
        <DrawerContent className="p-4 pb-8">
          <DrawerHeader className="px-0 pt-0">
            <DrawerTitle>Project Timeline</DrawerTitle>
            <DrawerDescription>
              Important dates for the {project.title} project.
            </DrawerDescription>
          </DrawerHeader>
          <div className="mt-4">
            {content}
          </div>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div
          className="cursor-pointer hover:bg-muted/50 transition-colors rounded-md -m-1 p-1"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              e.currentTarget.click()
            }
          }}
        >
          {children}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[350px] p-4" align="start" side="bottom">
        {content}
      </PopoverContent>
    </Popover>
  )
}
