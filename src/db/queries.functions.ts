import { createServerFn } from "@tanstack/react-start";
import { db, migrateDb } from "./index";
import { leiloes } from "./schema";
import { desc, eq } from "drizzle-orm";

export const getActiveAuctions = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      // Trigger migration check
      await migrateDb();
      
      if (!db) {
        console.error("Database connection not initialized. Check DATABASE_URL.");
        return [];
      }

      // Check if table exists before querying to avoid 500s if migrations fail silently
      const results = await db.select().from(leiloes)
        .where(eq(leiloes.status, 'aberto'))
        .orderBy(desc(leiloes.criado_em))
        .limit(10);
      
      return results;
    } catch (error) {
      console.error("Failed to fetch auctions:", error);
      // Return empty instead of throwing to prevent crashing the whole page
      return [];
    }
  });


