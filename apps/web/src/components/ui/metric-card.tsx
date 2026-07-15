import * as React from 'react'
import { Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from './card'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from './tooltip'

interface MetricCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string
  value: string | number
  unit?: string
  delta?: number
  deltaLabel?: string
  tooltipText?: string
  accent?: boolean
}

function MetricCard({
  label,
  value,
  unit,
  delta,
  deltaLabel,
  tooltipText,
  accent,
  className,
  ...props
}: MetricCardProps) {
  const deltaPositive = delta !== undefined && delta >= 0

  return (
    <Card className={cn(accent && 'border-[var(--color-ocp)] border-2', className)} {...props}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-[var(--color-text-muted)]">{label}</p>
          {tooltipText && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="text-[var(--color-text-subtle)] hover:text-[var(--color-text-muted)] transition-colors" aria-label="More info">
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">{tooltipText}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <div className="mt-2 flex items-baseline gap-1">
          <span className={cn(
            'text-2xl font-bold tracking-tight',
            accent ? 'text-[var(--color-ocp)]' : 'text-[var(--color-text)]'
          )}>
            {value}
          </span>
          {unit && (
            <span className="text-sm text-[var(--color-text-muted)]">{unit}</span>
          )}
        </div>
        {delta !== undefined && (
          <div className={cn(
            'mt-1 text-xs font-medium',
            deltaPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
          )}>
            {deltaPositive ? '+' : ''}{delta}% {deltaLabel ?? ''}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export { MetricCard }
