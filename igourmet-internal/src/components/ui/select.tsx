import { forwardRef, type SelectHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, className, id, children, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

    return (
      <div className="flex flex-col gap-1 text-sm w-full">
        {label && (
          <label htmlFor={selectId} className="font-medium text-slate-700 dark:text-slate-300 text-xs">
            {label}
            {props.required && <span className="text-rose-500 ml-0.5">*</span>}
          </label>
        )}
        <select
          id={selectId}
          ref={ref}
          className={cn(
            'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-all duration-150',
            'focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20',
            'disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed',
            'dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100 dark:focus:border-emerald-500',
            error && 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20',
            className,
          )}
          {...props}
        >
          {children}
        </select>
        {error && <span className="text-xs text-rose-600 dark:text-rose-400 font-medium">{error}</span>}
      </div>
    )
  },
)

Select.displayName = 'Select'
