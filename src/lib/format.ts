import { Order, Product, Zone, Material } from "@/lib/types";

const fmtMoney = new Intl.NumberFormat("ar-EG", {
  style: "currency",
  currency: "EGP",
});

const fmtNum2 = new Intl.NumberFormat("ar-EG", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function money(value: number) {
  return fmtMoney.format(Number(value || 0));
}

export function num2(value: number) {
  return fmtNum2.format(Number(value || 0));
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function autoCode(prefix: string) {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const rnd = Math.floor(Math.random() * 900 + 100);
  return `${prefix}-${yy}${mm}${dd}-${rnd}`;
}

const statusMap: Record<string, string> = {
  preparing: "قيد التحضير",
  ready: "جاهز",
  out: "خارج للتوصيل",
  delivered: "تم التسليم",
  cancelled: "ملغي",
  posted: "مرحلة",
  draft: "مسودة",
  paid: "مدفوع",
  dine_in: "صالة",
  takeaway: "تيك أواي",
  delivery: "توصيل",
  active: "نشط",
  inactive: "غير نشط",
  low: "منخفض",
  ok: "آمن",
  empty: "فارغة",
  occupied: "مشغولة",
  running: "جارية",
  paused: "متوقفة مؤقتاً",
  idle: "غير مبدوءة",
};

export function translateStatus(status?: string) {
  if (!status) return "—";
  return statusMap[status] || status;
}

export function findMaterial(materials: Material[], materialId: string) {
  return materials.find((m) => m.id === materialId);
}

export function calcProductCost(product: Product, materials: Material[]) {
  return (product.recipe || []).reduce((sum, r) => {
    const material = findMaterial(materials, r.materialId);
    const cost = material ? material.cost : 0;
    return sum + cost * r.qty;
  }, 0);
}

export function calcOrderTotals(order: Order, products: Product[], materials: Material[], zones: Zone[]) {
  const subtotal = order.items.reduce((sum, item) => {
    const product = products.find((p) => p.id === item.productId);
    return sum + (product?.price || 0) * item.qty;
  }, 0);
  const cogs = order.items.reduce((sum, item) => {
    const product = products.find((p) => p.id === item.productId);
    const cost = product ? calcProductCost(product, materials) : 0;
    return sum + cost * item.qty;
  }, 0);
  const zone = zones.find((z) => z.id === order.zoneId);
  const deliveryFee = order.type === "delivery" ? zone?.fee || 0 : 0;
  const discount = Number(order.discount || 0);
  const total = subtotal + deliveryFee - discount;
  const profit = subtotal - cogs - discount;
  return { subtotal, cogs, deliveryFee, discount, total, profit };
}

export function getZoneFee(zones: Zone[], zoneId: string) {
  const zone = zones.find((z) => z.id === zoneId);
  return zone ? zone.fee : 0;
}

export function formatDuration(totalMs: number) {
  const totalSeconds = Math.max(0, Math.floor(totalMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
