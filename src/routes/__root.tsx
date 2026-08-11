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
        <p className="max-w-md font-sans text-sm text-muted-foreground whitespace-pre-wrap">
          Service is not reachable
          Make sure the service is running and healthy.
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
