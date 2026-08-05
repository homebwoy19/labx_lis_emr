"use client"

import React from "react"
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area"
import { cn } from "../../lib/utils"

function ScrollArea({ className, children, ...props }) {
  return (
    <ScrollAreaPrimitive.Root
      className={cn("relative", className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport className="focus-visible:ring-ring/50 size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:outline-1">
        {children}
      </ScrollAreaPrimitive.Viewport>

      <ScrollBar />

      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  )
}

function ScrollBar({
  className,
  orientation = "vertical",
  ...props
}) {
  return (
    <ScrollAreaPrimitive.Scrollbar
      orientation={orientation}
      className={cn(
        "flex touch-none select-none transition-colors",
        orientation === "vertical" &&
          "h-full w-2.5 border-l border-l-transparent p-[1px]",
        orientation === "horizontal" &&
          "h-2.5 flex-col border-t border-t-transparent p-[1px]",
        className
      )}
      {...props}
    >
      <ScrollAreaPrimitive.Thumb className="bg-border relative flex-1 rounded-full" />
    </ScrollAreaPrimitive.Scrollbar>
  )
}

export { ScrollArea, ScrollBar }
