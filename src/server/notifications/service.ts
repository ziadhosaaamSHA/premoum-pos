import { OrderStatus, SaleStatus } from "@prisma/client";
import { db } from "@/server/db";
import { AuthUser } from "@/server/auth/session";

export type NotificationItem = {
  id: string;
  type: "low_stock" | "warning" | "info";
  title: string;
  message: string;
  createdAt: string;
};

const fmtMoney = new Intl.NumberFormat("ar-EG", {
  style: "currency",
  currency: "EGP",
});

function formatMoney(value: number) {
  return fmtMoney.format(Number(value || 0));
}

function hasAnyPermission(user: AuthUser, permissions: string[]) {
  if (user.isOwner) return true;
  return permissions.some((permission) => user.permissions.includes(permission));
}

export async function buildNotificationsForUser(user: AuthUser): Promise<NotificationItem[]> {
  const notifications: NotificationItem[] = [];
  const tasks: Array<Promise<void>> = [];

  if (hasAnyPermission(user, ["inventory:view"])) {
    tasks.push(
      (async () => {
        const materials = await db.material.findMany({
          select: { id: true, name: true, stock: true, minStock: true, updatedAt: true },
          orderBy: { updatedAt: "desc" },
        });

        const lowStock = materials
          .filter((material) => Number(material.stock) <= Number(material.minStock))
          .slice(0, 5);

        lowStock.forEach((material) => {
          notifications.push({
            id: `low-stock-${material.id}`,
            type: "low_stock",
            title: "مخزون منخفض",
            message: `المادة ${material.name} أقل من الحد الأدنى.`,
            createdAt: material.updatedAt.toISOString(),
          });
        });

        const latestWaste = await db.waste.findFirst({
          orderBy: { date: "desc" },
          include: { material: { select: { name: true } } },
        });

        if (latestWaste) {
          notifications.push({
            id: `waste-${latestWaste.id}`,
            type: "warning",
            title: "هدر مسجل",
            message: `تم تسجيل هدر ${latestWaste.material.name} بقيمة ${formatMoney(
              Number(latestWaste.cost)
            )}.`,
            createdAt: latestWaste.date.toISOString(),
          });
        }
      })()
    );
  }

  if (hasAnyPermission(user, ["orders:view", "orders:manage"])) {
    tasks.push(
      (async () => {
        const pendingCount = await db.order.count({
          where: { status: { in: [OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.OUT] } },
        });
        const latestPending = await db.order.findFirst({
          where: { status: { in: [OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.OUT] } },
          orderBy: { updatedAt: "desc" },
          select: { updatedAt: true },
        });
        if (pendingCount > 0) {
          notifications.push({
            id: "orders-pending",
            type: "info",
            title: "طلبات قيد المتابعة",
            message: `لديك ${pendingCount} طلب قيد المتابعة.`,
            createdAt: (latestPending?.updatedAt || new Date()).toISOString(),
          });
        }
      })()
    );
  }

  if (hasAnyPermission(user, ["sales:view", "sales:manage"])) {
    tasks.push(
      (async () => {
        const draftCount = await db.sale.count({ where: { status: SaleStatus.DRAFT } });
        const latestDraft = await db.sale.findFirst({
          where: { status: SaleStatus.DRAFT },
          orderBy: { updatedAt: "desc" },
          select: { updatedAt: true },
        });
        if (draftCount > 0) {
          notifications.push({
            id: "sales-drafts",
            type: "info",
            title: "فواتير مسودة",
            message: `لديك ${draftCount} فاتورة مسودة بحاجة للاعتماد.`,
            createdAt: (latestDraft?.updatedAt || new Date()).toISOString(),
          });
        }
      })()
    );
  }

  await Promise.all(tasks);

  notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return notifications;
}
