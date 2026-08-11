import { createServerFn } from "@tanstack/react-start";
import { db, migrateDb } from "./index";
import { leiloes } from "./schema";
import { desc } from "drizzle-orm";

export const getActiveAuctions = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      // Ensure migrations have run (useful for the first request after deploy)
      await migrateDb();
      
      if (!db) {
        console.error("Database connection not initialized. Check DATABASE_URL.");
        return [];
      }

      const results = await db.query.leiloes.findMany({
        where: (leiloes, { eq }) => eq(leiloes.status, 'aberto'),
        with: {
          veiculo: true,
        },
        orderBy: [desc(leiloes.criado_em)],
        limit: 10,
      });
      return results;
    } catch (error) {
      console.error("Failed to fetch auctions:", error);
      return [];
    }
  });

