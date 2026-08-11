import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/redefinir-senha")({
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Redefinir Senha</h1>
        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nova Senha</label>
            <input type="password" className="w-full p-2 border border-slate-300 rounded-md" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Confirmar Senha</label>
            <input type="password" className="w-full p-2 border border-slate-300 rounded-md" />
          </div>
          <button className="w-full bg-teal-900 text-white py-2 rounded-md font-bold">Alterar Senha</button>
        </form>
      </div>
    </div>
  );
}
