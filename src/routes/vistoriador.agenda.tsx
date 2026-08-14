import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/vistoriador/agenda")({
  component: () => <div className="p-4 lg:ml-64 lg:p-10">Agenda (Em desenvolvimento)</div>,
});
