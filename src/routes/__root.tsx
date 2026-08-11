import { createRootRoute, Outlet } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuthStore } from "@/hooks/use-auth";
import { Toaster } from "sonner";

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  const { isLoading, setLoading } = useAuthStore();

  useEffect(() => {
    // Check local storage for tokens to re-hydrate state if needed
    const accessToken = localStorage.getItem("accessToken");
    if (accessToken) {
      // In a real app, we might call an endpoint to verify the token/fetch user here
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [setLoading]);

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen items-center justify-center p-6 text-center">
        <p className="max-w-md break-all font-mono text-xs text-muted-foreground whitespace-pre-wrap text-left">
          2026/08/11 02:57:36 [notice] 33#33: exiting
          2026/08/11 02:57:36 [notice] 32#32: exit
          2026/08/11 02:57:36 [notice] 33#33: exit
          2026/08/11 02:57:36 [notice] 1#1: signal 17 (SIGCHLD) received from 31
          2026/08/11 02:57:36 [notice] 1#1: worker process 31 exited with code 0
          2026/08/11 02:57:36 [notice] 1#1: signal 29 (SIGIO) received
          2026/08/11 02:57:36 [notice] 1#1: signal 17 (SIGCHLD) received from 30
          2026/08/11 02:57:36 [notice] 1#1: worker process 30 exited with code 0
          2026/08/11 02:57:36 [notice] 1#1: signal 29 (SIGIO) received
          2026/08/11 02:57:36 [notice] 1#1: signal 17 (SIGCHLD) received from 32
          2026/08/11 02:57:36 [notice] 1#1: worker process 32 exited with code 0
          2026/08/11 02:57:36 [notice] 1#1: signal 29 (SIGIO) received
          2026/08/11 02:57:36 [notice] 1#1: signal 17 (SIGCHLD) received from 33
          2026/08/11 02:57:36 [notice] 1#1: worker process 33 exited with code 0
          2026/08/11 02:57:36 [notice] 1#1: exit 

          o log ta assim e nao carrega a pagina
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Outlet />
      <Toaster />
    </div>
  );
}
