import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/vistoriador/perfil")({
  component: () => <div className="p-4 lg:ml-64 lg:p-10">Perfil (Em desenvolvimento)</div>,
});
