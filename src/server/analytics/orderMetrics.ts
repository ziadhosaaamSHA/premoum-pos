export type ProductCostSource = {
  id: string;
  recipeItems: Array<{
    quantity: unknown;
    material: {
      cost: unknown;
    };
  }>;
};

export type OrderMetricSource = {
  id: string;
  code: string;
  customerName: string;
  status: string;
  type: string;
  discount: unknown;
  createdAt: Date;
  zone: {
    fee: unknown;
  } | null;
  items: Array<{
    productId: string | null;
    quantity: number;
    unitPrice: unknown;
    totalPrice: unknown;
  }>;
};

export function buildProductCostMap(products: ProductCostSource[]) {
  const map = new Map<string, number>();

  for (const product of products) {
    const cost = product.recipeItems.reduce((sum, item) => {
      return sum + Number(item.quantity) * Number(item.material.cost);
    }, 0);
    map.set(product.id, cost);
  }

  return map;
}

export type OrderFinancials = {
  subtotal: number;
  cogs: number;
  deliveryFee: number;
  discount: number;
  total: number;
  profit: number;
};

export function calcOrderFinancials(order: OrderMetricSource, productCostMap: Map<string, number>): OrderFinancials {
  const subtotal = order.items.reduce((sum, item) => {
    if (item.totalPrice !== null && item.totalPrice !== undefined) {
      return sum + Number(item.totalPrice);
    }
    return sum + item.quantity * Number(item.unitPrice);
  }, 0);

  const cogs = order.items.reduce((sum, item) => {
    if (!item.productId) return sum;
    const unitCost = productCostMap.get(item.productId) || 0;
    return sum + unitCost * item.quantity;
  }, 0);

  const discount = Number(order.discount || 0);
  const deliveryFee = order.type === "DELIVERY" ? Number(order.zone?.fee || 0) : 0;
  const total = Math.max(0, subtotal + deliveryFee - discount);
  const profit = subtotal - cogs - discount;

  return { subtotal, cogs, deliveryFee, discount, total, profit };
}

export function sumOrderFinancials(
  orders: OrderMetricSource[],
  productCostMap: Map<string, number>
) {
  return orders.reduce(
    (acc, order) => {
      const totals = calcOrderFinancials(order, productCostMap);
      acc.revenue += totals.subtotal;
      acc.cogs += totals.cogs;
      acc.delivery += totals.deliveryFee;
      acc.discount += totals.discount;
      acc.total += totals.total;
      acc.profit += totals.profit;
      return acc;
    },
    { revenue: 0, cogs: 0, delivery: 0, discount: 0, total: 0, profit: 0 }
  );
}

export function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function toMonthKey(date: Date) {
  return date.toISOString().slice(0, 7);
}

export function formatMonthKey(key: string) {
  const [year, month] = key.split("-");
  return `${month}/${year}`;
}
