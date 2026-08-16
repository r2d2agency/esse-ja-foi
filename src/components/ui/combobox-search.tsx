import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ComboboxSearchProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
  popularOptions?: string[];
  allowOther?: boolean;
  otherLabel?: string;
  otherPlaceholder?: string;
}

export function ComboboxSearch({
  options,
  value,
  onChange,
  placeholder = "Selecione...",
  searchPlaceholder = "Buscar...",
  emptyMessage = "Nenhum resultado encontrado.",
  className,
  popularOptions = [],
  allowOther = false,
  otherLabel = "Outro",
  otherPlaceholder = "Digite aqui...",
}: ComboboxSearchProps) {
  const [open, setOpen] = React.useState(false);
  const [isEditingOther, setIsEditingOther] = React.useState(false);
  const [otherValue, setOtherValue] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const allOptions = React.useMemo(() => {
    const opts = [...options];
    if (allowOther && !opts.includes(otherLabel)) {
      opts.push(otherLabel);
    }
    return opts;
  }, [options, allowOther, otherLabel]);

  const handleOtherSubmit = () => {
    if (otherValue.trim()) {
      onChange(otherValue.trim());
      setIsEditingOther(false);
      setOpen(false);
      setOtherValue("");
    }
  };

  return (
    <Popover open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) setIsEditingOther(false);
    }}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between h-12 rounded-xl font-medium text-left", className)}
        >
          <span className="truncate">
            {value ? value : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          {!isEditingOther ? (
            <>
              <CommandInput placeholder={searchPlaceholder} />
              <CommandList>
                <CommandEmpty>
                  {allowOther ? (
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start text-teal-600 font-bold"
                      onClick={() => setIsEditingOther(true)}
                    >
                      + Adicionar "{otherLabel}"
                    </Button>
                  ) : emptyMessage}
                </CommandEmpty>
            
            {popularOptions.length > 0 && (
              <CommandGroup heading="Mais usados">
                {popularOptions.map((opt) => (
                  <CommandItem
                    key={opt}
                    value={opt}
                    onSelect={(currentValue) => {
                      onChange(currentValue);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === opt ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {opt}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            <CommandGroup heading="Todas as opções">
              {allOptions.filter(opt => !popularOptions.includes(opt)).map((opt) => (
                <CommandItem
                  key={opt}
                  value={opt}
                  onSelect={(currentValue) => {
                    if (currentValue === otherLabel.toLowerCase()) {
                      setIsEditingOther(true);
                    } else {
                      onChange(opt);
                      setOpen(false);
                    }
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === opt ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {opt}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
          </>
          ) : (
            <div className="p-3 space-y-3">
              <div className="text-xs font-black text-slate-400 uppercase tracking-widest">
                Descreva o {otherLabel}
              </div>
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  autoFocus
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder={otherPlaceholder}
                  value={otherValue}
                  onChange={(e) => setOtherValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleOtherSubmit();
                    if (e.key === 'Escape') setIsEditingOther(false);
                  }}
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  className="flex-1 bg-teal-600 hover:bg-teal-700"
                  onClick={handleOtherSubmit}
                >
                  Confirmar
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setIsEditingOther(false)}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
