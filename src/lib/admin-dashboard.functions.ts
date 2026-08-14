import { createServerFn } from "@tanstack/react-start";
import { getDashboardStats } from "@/db/admin-dashboard.server";

export const getAdminDashboardDataFn = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const data = await getDashboardStats();
      return { ok: true as const, data };
    } catch (e: any) {
      return { ok: false as const, message: e.message };
    }
  });
