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
    // In dev/preview, we want to bypass the artificial loading state used for status display
    setLoading(false);
  }, [setLoading]);

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen items-center justify-center p-6 text-center">
        <p className="max-w-md font-sans text-sm text-muted-foreground">
          mas pq o serviço nao funciona. continua com erro no easypanel  ?
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
