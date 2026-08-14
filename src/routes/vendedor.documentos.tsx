import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/vendedor/documentos')({
  component: Pagina,
});

function Pagina() {
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-black tracking-tight text-slate-900">Documentos</h1>
      <p className="text-slate-500">Esta área estará disponível em breve.</p>
    </div>
  );
}
