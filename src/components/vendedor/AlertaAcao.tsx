import { Button } from "@/components/ui/button";

export function AlertaAcao({
  titulo,
  descricao,
  acaoLabel,
  onAcao,
}: {
  titulo: string;
  descricao: string;
  acaoLabel: string;
  onAcao: () => void;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-amber-200 bg-amber-50/70 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-semibold text-amber-900">{titulo}</p>
        <p className="mt-1 text-sm text-amber-800/80">{descricao}</p>
      </div>
      <Button
        onClick={onAcao}
        className="h-11 w-full rounded-xl bg-amber-500 text-white transition-colors hover:bg-amber-600 sm:w-auto"
      >
        {acaoLabel}
      </Button>
    </div>
  );
}
