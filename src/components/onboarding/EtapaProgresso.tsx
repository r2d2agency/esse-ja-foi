import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface EtapaProps {
  currentStep: number;
  totalSteps: number;
  etapas: string[];
}

export function EtapaProgresso({ currentStep, totalSteps, etapas }: EtapaProps) {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-white">Complete seu cadastro</h2>
          <span className="text-xs font-bold text-teal-200 uppercase tracking-wider">
            Etapa {currentStep} de {totalSteps}
          </span>
        </div>
        <p className="text-sm text-teal-100/80">
          Precisamos dessas informações para validar sua identidade e dar segurança às negociações.
        </p>
      </div>

      <div className="relative h-2 w-full overflow-hidden rounded-full bg-teal-950/50">
        <div 
          className="h-full bg-teal-400 transition-all duration-500 ease-out shadow-[0_0_10px_rgba(45,212,191,0.5)]"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Indicadores de etapa (Desktop) */}
      <div className="hidden lg:grid grid-cols-5 gap-2">
        {etapas.map((label, idx) => {
          const stepNum = idx + 1;
          const isCompleted = stepNum < currentStep;
          const isCurrent = stepNum === currentStep;

          return (
            <div key={label} className="flex flex-col gap-1.5">
              <div className={cn(
                "h-1 rounded-full transition-colors",
                isCompleted || isCurrent ? "bg-teal-400" : "bg-teal-900"
              )} />
              <span className={cn(
                "text-[10px] font-bold uppercase tracking-tight",
                isCurrent ? "text-white" : isCompleted ? "text-teal-400" : "text-teal-700"
              )}>
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
