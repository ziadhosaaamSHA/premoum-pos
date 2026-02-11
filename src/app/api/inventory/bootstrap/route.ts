import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { requireAuth } from "@/server/auth/guards";
import { jsonError, jsonOk } from "@/server/http";
import { mapMaterial, mapPurchase, mapWaste } from "@/server/inventory/mappers";

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request, { allPermissions: ["inventory:view"] });

    const [materials, purchases, waste, suppliers] = await Promise.all([
      db.material.findMany({
        orderBy: { name: "asc" },
      }),
      db.purchase.findMany({
        orderBy: { date: "desc" },
        include: {
          supplier: { select: { id: true, name: true } },
          items: {
            orderBy: { id: "asc" },
            include: {
              material: { select: { id: true, name: true } },
            },
          },
        },
      }),
      db.waste.findMany({
        orderBy: { date: "desc" },
        include: {
          material: { select: { id: true, name: true, unit: true } },
        },
      }),
      db.supplier.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
    ]);

    return jsonOk({
      materials: materials.map((item) => mapMaterial(item)),
      purchases: purchases.map((item) => mapPurchase(item)),
      waste: waste.map((item) => mapWaste(item)),
      suppliers,
    });
  } catch (error) {
    return jsonError(error);
  }
}
