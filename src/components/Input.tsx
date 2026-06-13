import React, { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
  touched?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, icon, className = '', ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block text-sm font-semibold text-zinc-300">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={`
              block w-full rounded-xl border-0 py-3 text-zinc-100 ring-1 ring-inset ring-zinc-700
              bg-zinc-900 placeholder:text-zinc-500
              focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500
              transition-all duration-200 text-sm min-h-[44px]
              ${icon ? 'pl-10 pr-4' : 'px-4'}
              ${error ? 'ring-red-500/50 focus-visible:ring-red-500' : 'hover:ring-zinc-600'}
              disabled:cursor-not-allowed disabled:bg-zinc-800/50 disabled:text-zinc-500 disabled:ring-zinc-800
              ${className}
            `}
            {...props}
          />
        </div>
        {error && (
          <p className="flex items-center gap-1 text-sm text-red-400" role="alert">
            <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            {error}
          </p>
        )}
        {helperText && !error && (
          <p className="text-sm text-zinc-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;