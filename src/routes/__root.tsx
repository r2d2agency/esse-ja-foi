import { createRootRoute, Outlet } from "@tanstack/react-router";
import { Toaster } from "sonner";

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <div className="min-h-screen bg-white">
      <Outlet />
      <Toaster />
    </div>
  );
}
