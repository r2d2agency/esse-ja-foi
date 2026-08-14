import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/vistoriador/execucao/$id")({
  component: VistoriaExecucaoPage,
});

function VistoriaExecucaoPage() {
  return (
    <div className="p-4 lg:ml-64 lg:p-10">
      Execução da Vistoria (Em desenvolvimento)
    </div>
  );
}
