import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/vendedores")({
  component: VendedoresPage,
});

function VendedoresPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-black text-slate-950 uppercase">Vendedores</h1>
      <p className="text-slate-500">Gestão de vendedores, documentos e compliance.</p>
    </div>
  );
}
