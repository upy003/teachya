import { type InputHTMLAttributes } from 'react';
import clsx from 'clsx';

interface SliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  displayValue?: string;
}

/** A styled range slider with optional label and value display */
export function Slider({ label, displayValue, className, ...props }: SliderProps) {
  return (
    <div className={clsx('flex flex-col gap-1', className)}>
      {(label || displayValue) && (
        <div className="flex justify-between items-center text-xs">
          {label && <span className="text-white/60">{label}</span>}
          {displayValue && <span className="text-violet-400 font-mono font-semibold">{displayValue}</span>}
        </div>
      )}
      <input
        type="range"
        className={clsx(
          'w-full h-1.5 rounded-full appearance-none cursor-pointer',
          'bg-white/15',
          '[&::-webkit-slider-thumb]:appearance-none',
          '[&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4',
          '[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-violet-500',
          '[&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md',
          '[&::-webkit-slider-thumb]:shadow-violet-900/60',
          '[&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4',
          '[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-violet-500',
          '[&::-moz-range-thumb]:border-0',
        )}
        {...props}
      />
    </div>
  );
}
