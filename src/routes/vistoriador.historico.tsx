import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/vistoriador/historico")({
  component: () => <div className="p-4 lg:ml-64 lg:p-10">Histórico (Em desenvolvimento)</div>,
});
