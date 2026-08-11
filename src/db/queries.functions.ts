import { createServerFn } from "@tanstack/react-start";
import { db } from "./index";
import { leiloes } from "./schema";
import { desc } from "drizzle-orm";

export const getActiveAuctions = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
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
