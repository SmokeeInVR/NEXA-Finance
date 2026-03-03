import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import React from "react";

interface MoneyInputProps extends React.ComponentProps<typeof Input> {
  label: string;
}

export const MoneyInput = React.forwardRef<HTMLInputElement, MoneyInputProps>(
  ({ label, className, ...props }, ref) => {
    return (
      <div className="space-y-1.5 w-full">
        {label && (
          <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] ml-1">
            {label}
          </Label>
        )}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
          <Input
            {...props}
            ref={ref}
            type="number"
            step="0.01"
            className={`pl-7 h-11 bg-white text-black font-bold focus:ring-primary ${className}`}
            placeholder="0.00"
          />
        </div>
      </div>
    );
  }
);

MoneyInput.displayName = "MoneyInput";
