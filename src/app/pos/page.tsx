"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/context/ToastContext";
import { useBranding } from "@/context/BrandingContext";
import { ApiError, apiRequest } from "@/lib/api";
import { money } from "@/lib/format";
import { buildReceiptSnapshot, ReceiptSnapshot } from "@/lib/receipt";
import InlineModal from "@/components/ui/InlineModal";
import ConfirmModal from "@/components/ui/ConfirmModal";
import ReceiptModal from "@/components/ui/ReceiptModal";

type PosCategory = {
  id: string;
  name: string;
  description: string | null;
};

type PosProduct = {
  id: string;
  name: string;
  categoryId: string;
  price: number;
  label: string;
  imageUrl: string | null;
  isActive: boolean;
  maxQty: number | null;
};

type PosZone = {
  id: string;
  name: string;
  limit: number;
  fee: number;
  minOrder: number;
  status: "active" | "inactive";
};

type PosTable = {
  id: string;
  name: string;
  number: number;
  status: "empty" | "occupied";
  orderId: string | null;
  activeOrder: {
    id: string;
    code: string;
    customer: string;
    status: "preparing" | "ready" | "out" | "delivered" | "cancelled";
  } | null;
};

type PosTax = {
  id: string;
  name: string;
  rate: number;
  isDefault: boolean;
  isActive: boolean;
};

type CartItem = {
  productId: string;
  qty: number;
};

type OrderTypeUi = "dine_in" | "takeaway" | "delivery";
type PaymentUi = "cash" | "card" | "wallet" | "mixed";

type PosOrder = {
  id: string;
  code: string;
  type: "dine_in" | "takeaway" | "delivery";
  status: "preparing" | "ready" | "out" | "delivered" | "cancelled";
  customer: string;
  tableId: string | null;
  tableName: string | null;
  tableNumber: number | null;
  zoneName: string | null;
  discount: number;
  taxRate: number;
  taxAmount: number;
  payment: PaymentUi;
  notes: string | null;
  subtotal: number;
  deliveryFee: number;
  total: number;
  receiptSnapshot: ReceiptSnapshot | null;
  createdAt: string;
  items: Array<{
    id: string;
    name: string;
    qty: number;
    unitPrice: number;
    totalPrice: number;
  }>;
};

type FinishAdjustment = {
  itemId: string;
  name: string;
  qty: number;
  unitPrice: number;
  deductQty: number;
};

type DeferredPricing = {
  discountRate: number;
  extraTaxRate: number;
  locked: boolean;
};

export default function PosPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { pushToast } = useToast();
  const { branding } = useBranding();
  const initialRouteAppliedRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<PosCategory[]>([]);
  const [products, setProducts] = useState<PosProduct[]>([]);
  const [zones, setZones] = useState<PosZone[]>([]);
  const [tables, setTables] = useState<PosTable[]>([]);
  const [taxes, setTaxes] = useState<PosTax[]>([]);

  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [orderType, setOrderType] = useState<OrderTypeUi>("dine_in");
  const [payment, setPayment] = useState<PaymentUi>("cash");
  const [zoneId, setZoneId] = useState("");
  const [tableId, setTableId] = useState("");
  const [discountRate, setDiscountRate] = useState(0);
  const [extraTaxRate, setExtraTaxRate] = useState(0);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [lastAddedProductId, setLastAddedProductId] = useState<string | null>(null);

  const [busyDrawerOpen, setBusyDrawerOpen] = useState(false);
  const [activeTableOrder, setActiveTableOrder] = useState<PosOrder | null>(null);
  const [activeOrderLoading, setActiveOrderLoading] = useState(false);

  const [finishModalOpen, setFinishModalOpen] = useState(false);
  const [finishSubmitting, setFinishSubmitting] = useState(false);
  const [finishAdjustments, setFinishAdjustments] = useState<FinishAdjustment[]>([]);
  const [deferredPricingByOrder, setDeferredPricingByOrder] = useState<Record<string, DeferredPricing>>({});

  const [submitting, setSubmitting] = useState(false);
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptSnapshot | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);

  const activeZones = useMemo(() => zones.filter((zone) => zone.status === "active"), [zones]);

  const dineInTables = useMemo(
    () =>
      [...tables].sort((a, b) => {
        if (a.status !== b.status) return a.status === "empty" ? -1 : 1;
        return a.number - b.number;
      }),
    [tables]
  );

  const busyTables = useMemo(
    () => dineInTables.filter((table) => table.status === "occupied" && table.activeOrder),
    [dineInTables]
  );

  const selectedTable = useMemo(
    () => tables.find((table) => table.id === tableId) || null,
    [tables, tableId]
  );

  const appendToOrderId = orderType === "dine_in" ? selectedTable?.activeOrder?.id || null : null;

  const fetchBootstrap = useCallback(async () => {
    try {
      const data = await apiRequest<{
        categories: PosCategory[];
        products: PosProduct[];
        zones: PosZone[];
        tables: PosTable[];
        taxes: PosTax[];
      }>("/api/pos/bootstrap");

      setCategories(data.categories || []);
      setProducts(data.products || []);
      setZones(data.zones || []);
      setTables(data.tables || []);
      setTaxes(data.taxes || []);

      setZoneId((current) => {
        if (!data.zones?.length) return "";
        const valid = data.zones.some((zone) => zone.id === current && zone.status === "active");
        if (valid) return current;
        return data.zones.find((zone) => zone.status === "active")?.id || "";
      });

      setTableId((current) => {
        if (!data.tables?.length) return "";
        const valid = data.tables.some((table) => table.id === current);
        if (valid) return current;
        return data.tables.find((table) => table.status === "empty")?.id || data.tables[0]?.id || "";
      });
    } catch (error) {
      if (error instanceof ApiError) {
        pushToast(error.message || "تعذر تحميل بيانات الكاشير", "error");
      } else {
        pushToast("تعذر تحميل بيانات الكاشير", "error");
      }
    }
  }, [pushToast]);

  const loadActiveOrder = useCallback(
    async (orderId: string, showError = true) => {
      try {
        const payload = await apiRequest<{ order: PosOrder }>(`/api/orders/${orderId}`);
        setActiveTableOrder(payload.order);
        return payload.order;
      } catch (error) {
        setActiveTableOrder(null);
        if (showError) {
          if (error instanceof ApiError) {
            pushToast(error.message || "تعذر تحميل تفاصيل الطلب النشط", "error");
          } else {
            pushToast("تعذر تحميل تفاصيل الطلب النشط", "error");
          }
        }
        return null;
      }
    },
    [pushToast]
  );

  useEffect(() => {
    void (async () => {
      setLoading(true);
      await fetchBootstrap();
      setLoading(false);
    })();
  }, [fetchBootstrap]);

  useEffect(() => {
    if (orderType !== "delivery") return;
    if (!activeZones.some((zone) => zone.id === zoneId)) {
      setZoneId(activeZones[0]?.id || "");
    }
  }, [activeZones, orderType, zoneId]);

  useEffect(() => {
    if (orderType !== "dine_in") return;
    if (!dineInTables.some((table) => table.id === tableId)) {
      const preferred = dineInTables.find((table) => table.status === "empty") || dineInTables[0];
      setTableId(preferred?.id || "");
    }
  }, [dineInTables, orderType, tableId]);

  useEffect(() => {
    if (initialRouteAppliedRef.current || tables.length === 0) return;

    const routeTableId = searchParams.get("tableId");
    if (routeTableId) {
      const routeTable = tables.find((table) => table.id === routeTableId);
      if (routeTable) {
        setOrderType("dine_in");
        setTableId(routeTable.id);
      }
    }

    initialRouteAppliedRef.current = true;
  }, [searchParams, tables]);

  useEffect(() => {
    if (!appendToOrderId) {
      setActiveTableOrder(null);
      setActiveOrderLoading(false);
      return;
    }

    let active = true;
    setActiveOrderLoading(true);

    void (async () => {
      await loadActiveOrder(appendToOrderId);
      if (active) setActiveOrderLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [appendToOrderId, loadActiveOrder]);

  const categoriesWithAll = useMemo(
    () => [{ id: "all", name: "الكل", description: null }, ...categories],
    [categories]
  );

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((product) => {
      const matchesCategory = category === "all" || product.categoryId === category;
      const matchesSearch = !q || product.name.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [category, products, search]);

  const cartSubtotal = useMemo(
    () =>
      cart.reduce((sum, item) => {
        const product = products.find((entry) => entry.id === item.productId);
        return sum + (product?.price || 0) * item.qty;
      }, 0),
    [cart, products]
  );

  const deliveryFee = useMemo(() => {
    if (orderType !== "delivery") return 0;
    const zone = zones.find((entry) => entry.id === zoneId);
    return zone?.fee || 0;
  }, [orderType, zoneId, zones]);

  const defaultTax = useMemo(() => taxes.find((tax) => tax.isDefault && tax.isActive) || null, [taxes]);
  const defaultTaxRate = defaultTax?.rate || 0;
  const combinedTaxRate = defaultTaxRate + extraTaxRate;
  const discountAmount = Math.min(cartSubtotal, (cartSubtotal * discountRate) / 100);
  const taxableBase = Math.max(0, cartSubtotal - discountAmount);
  const taxAmount = taxableBase * (combinedTaxRate / 100);
  const total = taxableBase + deliveryFee + taxAmount;
  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const cartQtyMap = useMemo(() => new Map(cart.map((item) => [item.productId, item.qty])), [cart]);
  const activeDeferredPricing = useMemo(
    () => (appendToOrderId ? deferredPricingByOrder[appendToOrderId] || null : null),
    [appendToOrderId, deferredPricingByOrder]
  );
  const activeOrderPricingLocked = Boolean(appendToOrderId && (activeDeferredPricing?.locked ?? false));

  const projectedActiveOrder = useMemo(() => {
    if (!appendToOrderId || !activeTableOrder) {
      return {
        subtotal: 0,
        discount: 0,
        taxRate: 0,
        taxAmount: 0,
        total: 0,
      };
    }

    const subtotal = activeTableOrder.subtotal + cartSubtotal;
    const discount = Math.min(subtotal, (subtotal * discountRate) / 100);
    const base = Math.max(0, subtotal - discount);
    const taxRate = combinedTaxRate;
    const taxAmountValue = base * (taxRate / 100);
    const totalValue = base + (activeTableOrder.deliveryFee || 0) + taxAmountValue;

    return {
      subtotal,
      discount,
      taxRate,
      taxAmount: taxAmountValue,
      total: totalValue,
    };
  }, [activeTableOrder, appendToOrderId, cartSubtotal, combinedTaxRate, discountRate]);

  const finishDeductedSubtotal = useMemo(
    () => finishAdjustments.reduce((sum, item) => sum + item.deductQty * item.unitPrice, 0),
    [finishAdjustments]
  );

  const finishPreview = useMemo(() => {
    if (!activeTableOrder) {
      return {
        subtotal: 0,
        discount: 0,
        taxRate: 0,
        taxAmount: 0,
        total: 0,
      };
    }

    const subtotal = Math.max(0, activeTableOrder.subtotal - finishDeductedSubtotal);
    const discount = Math.min(subtotal, (subtotal * discountRate) / 100);
    const base = Math.max(0, subtotal - discount);
    const taxRate = combinedTaxRate;
    const taxAmountValue = base * (taxRate / 100);
    const totalValue = base + (activeTableOrder.deliveryFee || 0) + taxAmountValue;

    return {
      subtotal,
      discount,
      taxRate,
      taxAmount: taxAmountValue,
      total: totalValue,
    };
  }, [activeTableOrder, combinedTaxRate, discountRate, finishDeductedSubtotal]);

  useEffect(() => {
    if (!appendToOrderId || !activeTableOrder) return;

    if (activeDeferredPricing) {
      setDiscountRate(activeDeferredPricing.discountRate);
      setExtraTaxRate(activeDeferredPricing.extraTaxRate);
      return;
    }

    const subtotal = Math.max(0, activeTableOrder.subtotal || 0);
    const derivedDiscountRate =
      subtotal > 0 ? Number(((Number(activeTableOrder.discount || 0) / subtotal) * 100).toFixed(2)) : 0;
    const derivedExtraTax = Math.max(0, Number((activeTableOrder.taxRate || 0) - defaultTaxRate));
    const seeded: DeferredPricing = {
      discountRate: derivedDiscountRate,
      extraTaxRate: Number(derivedExtraTax.toFixed(2)),
      locked: true,
    };

    setDeferredPricingByOrder((prev) => ({
      ...prev,
      [appendToOrderId]: seeded,
    }));
    setDiscountRate(seeded.discountRate);
    setExtraTaxRate(seeded.extraTaxRate);
  }, [activeDeferredPricing, activeTableOrder, appendToOrderId, defaultTaxRate]);

  useEffect(() => {
    if (appendToOrderId || orderType !== "dine_in") return;
    setDiscountRate(0);
    setExtraTaxRate(0);
  }, [appendToOrderId, orderType]);

  const setOrderDiscountRate = useCallback(
    (value: number) => {
      const normalized = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
      setDiscountRate(normalized);
      if (!appendToOrderId) return;
      setDeferredPricingByOrder((prev) => ({
        ...prev,
        [appendToOrderId]: {
          discountRate: normalized,
          extraTaxRate: prev[appendToOrderId]?.extraTaxRate ?? extraTaxRate,
          locked: prev[appendToOrderId]?.locked ?? false,
        },
      }));
    },
    [appendToOrderId, extraTaxRate]
  );

  const setOrderExtraTaxRate = useCallback(
    (value: number) => {
      const normalized = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
      setExtraTaxRate(normalized);
      if (!appendToOrderId) return;
      setDeferredPricingByOrder((prev) => ({
        ...prev,
        [appendToOrderId]: {
          discountRate: prev[appendToOrderId]?.discountRate ?? discountRate,
          extraTaxRate: normalized,
          locked: prev[appendToOrderId]?.locked ?? false,
        },
      }));
    },
    [appendToOrderId, discountRate]
  );

  const unlockOrderPricing = () => {
    if (!appendToOrderId) return;
    setDeferredPricingByOrder((prev) => ({
      ...prev,
      [appendToOrderId]: {
        discountRate,
        extraTaxRate,
        locked: false,
      },
    }));
  };

  const validateBeforeSubmit = useCallback(() => {
    if (cart.length === 0) return "السلة فارغة";
    if (orderType === "delivery" && !zoneId) return "اختر نطاق التوصيل";
    if (orderType === "dine_in" && !tableId) return "اختر طاولة أولاً";
    if (orderType === "dine_in" && selectedTable?.status === "occupied" && !selectedTable.activeOrder) {
      return "الطاولة مشغولة بدون طلب نشط، اربطها بطلب أولاً من صفحة الطلبيات";
    }
    return null;
  }, [cart.length, orderType, zoneId, tableId, selectedTable]);

  const submitConfirmContent = useMemo(() => {
    if (appendToOrderId) {
      return {
        title: "تأكيد إضافة عناصر",
        confirmLabel: "تأكيد الإضافة",
        message: `سيتم إضافة ${cartCount} عنصر بإجمالي ${money(cartSubtotal)} إلى الطلب ${
          selectedTable?.activeOrder?.code || ""
        }.`,
      };
    }

    if (orderType === "dine_in") {
      return {
        title: "تأكيد الطلب",
        confirmLabel: "تأكيد الطلب",
        message: `سيتم إنشاء طلب جديد على ${selectedTable?.name || "الطاولة"} (${
          selectedTable?.number ?? "-"
        }) بقيمة ${money(total)}.`,
      };
    }

    if (orderType === "delivery") {
      return {
        title: "تأكيد طلب التوصيل",
        confirmLabel: "تأكيد الطلب",
        message: `سيتم تأكيد الطلب وإنشاء فاتورة مدفوعة مباشرة بإجمالي ${money(total)}.`,
      };
    }

    return {
      title: "تأكيد طلب تيك أواي",
      confirmLabel: "تأكيد الطلب",
      message: `سيتم تأكيد الطلب وإنشاء فاتورة مدفوعة مباشرة بإجمالي ${money(total)}.`,
    };
  }, [appendToOrderId, cartCount, cartSubtotal, orderType, selectedTable, total]);

  const openSubmitConfirmation = () => {
    const validationError = validateBeforeSubmit();
    if (validationError) {
      pushToast(validationError, "error");
      return;
    }
    setSubmitConfirmOpen(true);
  };

  const getProductAvailability = useCallback(
    (product: PosProduct) => {
      const cartQty = cartQtyMap.get(product.id) || 0;
      if (!product.isActive) {
        return { disabled: true, reason: "غير متاح حالياً", remaining: 0 };
      }
      if (product.maxQty === null) {
        return { disabled: false, reason: "", remaining: null as number | null };
      }

      const remaining = product.maxQty - cartQty;
      if (product.maxQty <= 0) {
        return { disabled: true, reason: "نفذ المخزون", remaining: 0 };
      }
      if (remaining <= 0) {
        return { disabled: true, reason: "لا يتوفر مخزون إضافي", remaining: 0 };
      }
      return { disabled: false, reason: "", remaining };
    },
    [cartQtyMap]
  );

  const addToCart = (productId: string) => {
    const product = products.find((entry) => entry.id === productId);
    if (!product) return;

    const availability = getProductAvailability(product);
    if (availability.disabled) {
      pushToast(availability.reason || "لا يمكن إضافة هذا المنتج حالياً", "error");
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.productId === productId);
      if (existing) {
        return prev.map((item) =>
          item.productId === productId ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { productId, qty: 1 }];
    });
    setLastAddedProductId(productId);
  };

  const changeCartQty = (productId: string, delta: number) => {
    if (delta > 0) {
      const product = products.find((entry) => entry.id === productId);
      if (product) {
        const availability = getProductAvailability(product);
        if (availability.disabled) {
          pushToast(availability.reason || "لا يمكن زيادة الكمية", "error");
          return;
        }
      }
    }

    setCart((prev) =>
      prev
        .map((item) =>
          item.productId === productId ? { ...item, qty: item.qty + delta } : item
        )
        .filter((item) => item.qty > 0)
    );
  };

  const clearCart = () => {
    setCart([]);
    setLastAddedProductId(null);
    if (!appendToOrderId) {
      setDiscountRate(0);
      setExtraTaxRate(0);
    }
    pushToast("تم تفريغ السلة", "success");
  };

  const startNewOrder = useCallback(() => {
    const firstEmptyTable = dineInTables.find((table) => table.status === "empty");
    setBusyDrawerOpen(false);
    setOrderType("dine_in");
    setTableId(firstEmptyTable?.id || "");
    setCart([]);
    setLastAddedProductId(null);
    setDiscountRate(0);
    setExtraTaxRate(0);
    setActiveTableOrder(null);
    setFinishModalOpen(false);
    setFinishAdjustments([]);
  }, [dineInTables]);

  const undoLastItem = () => {
    if (!lastAddedProductId) {
      pushToast("لا يوجد عنصر حديث للتراجع", "error");
      return;
    }

    const existing = cart.find((item) => item.productId === lastAddedProductId);
    if (!existing) {
      pushToast("لا يوجد عنصر حديث للتراجع", "error");
      setLastAddedProductId(null);
      return;
    }

    setCart((prev) =>
      prev
        .map((item) =>
          item.productId === lastAddedProductId ? { ...item, qty: item.qty - 1 } : item
        )
        .filter((item) => item.qty > 0)
    );
    setLastAddedProductId(null);
    pushToast("تم التراجع عن آخر إضافة", "success");
  };

  const openFinishOrderModal = () => {
    if (!appendToOrderId) {
      pushToast("اختر طاولة مشغولة مرتبطة بطلب نشط أولاً", "error");
      return;
    }

    if (cart.length > 0) {
      pushToast("احفظ العناصر في السلة أولاً أو قم بتفريغها قبل إنهاء الطاولة", "error");
      return;
    }

    if (!activeTableOrder) {
      pushToast("جارٍ تحميل تفاصيل الطلب النشط", "error");
      return;
    }

    setFinishAdjustments(
      activeTableOrder.items.map((item) => ({
        itemId: item.id,
        name: item.name,
        qty: item.qty,
        unitPrice: item.unitPrice,
        deductQty: 0,
      }))
    );
    setFinishModalOpen(true);
  };

  const changeFinishDeduction = (itemId: string, delta: number) => {
    setFinishAdjustments((prev) =>
      prev.map((item) => {
        if (item.itemId !== itemId) return item;
        const next = Math.max(0, Math.min(item.qty, item.deductQty + delta));
        return { ...item, deductQty: next };
      })
    );
  };

  const finishOrder = async () => {
    if (!activeTableOrder) return;

    setFinishSubmitting(true);
    try {
      const deductions = finishAdjustments
        .filter((item) => item.deductQty > 0)
        .map((item) => ({ itemId: item.itemId, quantity: item.deductQty }));

      const result = await apiRequest<{ order: PosOrder }>(`/api/orders/${activeTableOrder.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: "delivered",
          discount: finishPreview.discount,
          taxRate: finishPreview.taxRate,
          itemDeductions: deductions,
        }),
      });

      const finalized = result.order;
      const snapshot =
        finalized.receiptSnapshot ||
        buildReceiptSnapshot({
          code: finalized.code,
          createdAt: finalized.createdAt,
          customerName: finalized.customer,
          orderType: finalized.type,
          payment: finalized.payment,
          brandName: branding.brandName,
          brandTagline: branding.brandTagline || undefined,
          logoUrl: branding.logoUrl || null,
          tableName: finalized.tableName,
          tableNumber: finalized.tableNumber ?? null,
          zoneName: finalized.zoneName,
          items: finalized.items.map((item) => ({
            name: item.name,
            qty: item.qty,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
          })),
          discount: finalized.discount,
          taxRate: finalized.taxRate,
          taxAmount: finalized.taxAmount,
          deliveryFee: finalized.deliveryFee,
          total: finalized.total,
          notes: finalized.notes,
        });

      setFinishModalOpen(false);
      setFinishAdjustments([]);
      setReceipt(snapshot);
      setReceiptOpen(true);
      setDeferredPricingByOrder((prev) => {
        const next = { ...prev };
        delete next[finalized.id];
        return next;
      });
      pushToast(`تم إنهاء الطاولة وحفظ الفاتورة ${finalized.code}`, "success");

      await fetchBootstrap();
      startNewOrder();
    } catch (error) {
      if (error instanceof ApiError) {
        pushToast(error.message || "تعذر إنهاء الطاولة", "error");
      } else {
        pushToast("تعذر إنهاء الطاولة", "error");
      }
    } finally {
      setFinishSubmitting(false);
    }
  };

  const submitOrder = async () => {
    if (submitting) return;

    const validationError = validateBeforeSubmit();
    if (validationError) {
      pushToast(validationError, "error");
      return;
    }

    setSubmitConfirmOpen(false);
    setSubmitting(true);
    try {
      const isDineIn = orderType === "dine_in";
      const payload = {
        type: orderType,
        customerName:
          orderType === "dine_in"
            ? "عميل صالة"
            : orderType === "takeaway"
              ? "عميل تيك أواي"
              : "عميل توصيل",
        zoneId: orderType === "delivery" ? zoneId : null,
        tableId: orderType === "dine_in" ? tableId : null,
        appendToOrderId: orderType === "dine_in" ? appendToOrderId : null,
        discount: isDineIn ? 0 : discountAmount,
        taxRate: isDineIn ? 0 : combinedTaxRate,
        payment,
        items: cart.map((item) => ({ productId: item.productId, quantity: item.qty })),
      };

      const isAppending = Boolean(payload.appendToOrderId);

      const result = await apiRequest<{ order: PosOrder }>("/api/orders", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (orderType !== "dine_in") {
        const fallbackItems = cart.map((item) => {
          const product = products.find((entry) => entry.id === item.productId);
          const unitPrice = product?.price || 0;
          return {
            name: product?.name || "منتج",
            qty: item.qty,
            unitPrice,
            totalPrice: unitPrice * item.qty,
          };
        });

        const fallbackReceipt = buildReceiptSnapshot({
          code: result.order.code,
          createdAt: new Date().toISOString(),
          customerName: payload.customerName,
          orderType,
          payment,
          brandName: branding.brandName,
          brandTagline: branding.brandTagline || undefined,
          logoUrl: branding.logoUrl || null,
          tableName: selectedTable?.name || null,
          tableNumber: selectedTable?.number ?? null,
          zoneName: orderType === "delivery" ? zones.find((zone) => zone.id === zoneId)?.name || null : null,
          items: fallbackItems,
          discount: discountAmount,
          taxRate: combinedTaxRate,
          taxAmount,
          deliveryFee,
          total,
          notes: null,
        });

        setReceipt(result.order.receiptSnapshot ?? fallbackReceipt);
        setReceiptOpen(true);
      }

      setCart([]);
      setLastAddedProductId(null);

      if (orderType === "dine_in") {
        const targetOrderId = isAppending ? appendToOrderId : result.order.id;
        if (targetOrderId) {
          setDeferredPricingByOrder((prev) => ({
            ...prev,
            [targetOrderId]: {
              discountRate,
              extraTaxRate,
              locked: true,
            },
          }));
        }
      } else {
        setDiscountRate(0);
        setExtraTaxRate(0);
      }

      if (orderType === "dine_in") {
        pushToast(
          isAppending
            ? `تمت إضافة عناصر جديدة إلى ${selectedTable?.name || "الطاولة"}`
            : `تم تأكيد الطلب على ${selectedTable?.name || "الطاولة"}`,
          "success"
        );
      } else {
        pushToast(`تم تسجيل الطلب ${result.order.code}`, "success");
      }

      await fetchBootstrap();

      if (orderType === "dine_in") {
        if (isAppending && appendToOrderId) {
          setActiveOrderLoading(true);
          await loadActiveOrder(appendToOrderId, false);
          setActiveOrderLoading(false);
        } else {
          startNewOrder();
        }
      }
    } catch (error) {
      if (error instanceof ApiError) {
        pushToast(error.message || "تعذر تسجيل الطلب", "error");
      } else {
        pushToast("تعذر تسجيل الطلب", "error");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <section className="page active">
        <div className="card wide">
          <p className="hint">جارٍ تحميل بيانات الكاشير...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="page active pos-page">
      <div className="pos-layout">
        <div className="pos-panel menu-panel">
          <div className="pos-toolbar">
            <div className="order-types">
              {[
                { id: "dine_in", label: "صالة" },
                { id: "takeaway", label: "تيك أواي" },
                { id: "delivery", label: "توصيل" },
              ].map((type) => (
                <button
                  key={type.id}
                  type="button"
                  className={`pill ${orderType === type.id ? "active" : ""}`}
                  onClick={() => setOrderType(type.id as OrderTypeUi)}
                >
                  {type.label}
                </button>
              ))}
            </div>
            <div className="search-bar-wrapper">
              <i className="bx bx-search"></i>
              <input
                type="text"
                className="table-search"
                placeholder="ابحث عن منتج..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>

          <div className="pos-categories scroll-x">
            {categoriesWithAll.map((cat) => (
              <button
                key={cat.id}
                className={`chip ${category === cat.id ? "active" : ""}`}
                type="button"
                onClick={() => setCategory(cat.id)}
              >
                {cat.name}
              </button>
            ))}
          </div>

          <div className="pos-items-stage">
            <div className="pos-products-scroll">
              <div className="product-grid">
                {filteredProducts.map((product) => {
                  const availability = getProductAvailability(product);
                  return (
                    <button
                      key={product.id}
                      type="button"
                      className={`product-card ${availability.disabled ? "disabled" : ""}`}
                      onClick={() => addToCart(product.id)}
                      disabled={availability.disabled}
                    >
                      <div className="product-thumb">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="product-thumb-image"
                            loading="lazy"
                          />
                        ) : (
                          <div className="product-thumb-placeholder" aria-hidden="true" />
                        )}
                      </div>
                      <div className="product-name">{product.name}</div>
                      <div className="product-meta">
                        <span className="product-price">{money(product.price)}</span>
                        {availability.disabled && availability.reason ? (
                          <span className="product-status">{availability.reason}</span>
                        ) : null}
                      </div>
                      <div className="product-action">
                        <span>{availability.disabled ? "غير متاح" : "إضافة للسلة"}</span>
                        <i className="bx bx-plus"></i>
                      </div>
                    </button>
                  );
                })}
              </div>
              {filteredProducts.length === 0 ? <p className="hint">لا توجد منتجات مطابقة للفلتر الحالي.</p> : null}
            </div>

            <div className={`busy-tables-drawer ${busyDrawerOpen ? "open" : ""}`}>
              <div className="busy-drawer-header">
                <h3>الطاولات المشغولة ({busyTables.length})</h3>
                <button
                  className="ghost small"
                  type="button"
                  onClick={() => setBusyDrawerOpen(false)}
                >
                  إغلاق
                </button>
              </div>

              <div className="busy-drawer-list">
                {busyTables.length === 0 ? (
                  <p className="hint">لا توجد طاولات مشغولة حالياً.</p>
                ) : (
                  busyTables.map((table) => (
                    <button
                      key={table.id}
                      type="button"
                      className={`busy-table-item ${tableId === table.id ? "active" : ""}`}
                      onClick={() => {
                        setOrderType("dine_in");
                        setTableId(table.id);
                        setBusyDrawerOpen(false);
                      }}
                    >
                      <strong>
                        {table.name} ({table.number})
                      </strong>
                      <span>{table.activeOrder?.code}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="pos-quick-options">
            <div className="quick-actions-grid">
              <button
                type="button"
                className="quick-action qa-busy"
                onClick={() => setBusyDrawerOpen((prev) => !prev)}
              >
                <span className="quick-action-icon">
                  <i className="bx bx-table"></i>
                </span>
                <span className="quick-action-label">الطاولات المشغولة</span>
              </button>
              <button type="button" className="quick-action qa-new" onClick={startNewOrder}>
                <span className="quick-action-icon">
                  <i className="bx bx-plus-circle"></i>
                </span>
                <span className="quick-action-label">طلب جديد</span>
              </button>
              <button type="button" className="quick-action qa-undo" onClick={undoLastItem}>
                <span className="quick-action-icon">
                  <i className="bx bx-undo"></i>
                </span>
                <span className="quick-action-label">تراجع</span>
              </button>
              <button type="button" className="quick-action qa-expense" onClick={() => router.push("/finance")}>
                <span className="quick-action-icon">
                  <i className="bx bx-money-withdraw"></i>
                </span>
                <span className="quick-action-label">إضافة مصروف</span>
              </button>
            </div>
          </div>
        </div>

        <div className="pos-panel cart-panel">
          <div className="cart-header">
            <h2>الطلب الحالي</h2>
            <span className="badge neutral">{cartCount} عنصر</span>
          </div>

          {appendToOrderId ? (
            <div className="pos-active-order-note">
              <strong>
                {selectedTable?.name} ({selectedTable?.number})
              </strong>
              <span>
                {activeOrderLoading
                  ? "جارٍ تحميل الطلب النشط..."
                  : `طلب نشط: ${selectedTable?.activeOrder?.code || "-"}`}
              </span>
            </div>
          ) : null}

          <div className="cart-scroll-zone">
            <div className="cart-list">
              {cart.length === 0 ? (
                <div className="alert-empty">السلة فارغة</div>
              ) : (
                cart.map((item) => {
                  const product = products.find((entry) => entry.id === item.productId);
                  return (
                    <div key={item.productId} className="cart-item">
                      <div className="cart-item-info">
                        <div className="cart-item-name">{product?.name || "—"}</div>
                        <div className="cart-item-meta">سعر {money(product?.price || 0)}</div>
                      </div>
                      <div className="qty-control">
                        <button className="qty-btn" type="button" onClick={() => changeCartQty(item.productId, -1)}>
                          -
                        </button>
                        <span className="qty-value">{item.qty}</span>
                        <button className="qty-btn" type="button" onClick={() => changeCartQty(item.productId, 1)}>
                          +
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="cart-options">
              {orderType === "delivery" && (
                <div className="field">
                  <label>نطاق التوصيل</label>
                  <select value={zoneId} onChange={(event) => setZoneId(event.target.value)}>
                    {activeZones.map((zone) => (
                      <option key={zone.id} value={zone.id}>
                        {zone.name} - رسوم {money(zone.fee)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {orderType === "dine_in" && (
                <div className="field">
                  <label>اختيار الطاولة</label>
                  <select value={tableId} onChange={(event) => setTableId(event.target.value)}>
                    <option value="">اختر طاولة</option>
                    {dineInTables.map((table) => {
                      const isBusyWithoutOrder = table.status === "occupied" && !table.activeOrder;
                      const orderCode = table.activeOrder?.code;
                      const stateLabel = orderCode
                        ? `- مشغولة (${orderCode})`
                        : table.status === "empty"
                          ? "- فارغة"
                          : "- مشغولة بدون طلب";

                      return (
                        <option key={table.id} value={table.id} disabled={isBusyWithoutOrder}>
                          {table.name} ({table.number}) {stateLabel}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              <div className="field">
                <div className="field-title">
                  <label>خصم (%)</label>
                  {appendToOrderId && activeOrderPricingLocked ? (
                    <button
                      type="button"
                      className="action-btn edit compact"
                      onClick={unlockOrderPricing}
                      aria-label="تعديل الخصم والرسوم"
                      title="تعديل الخصم والرسوم"
                    >
                      <i className="bx bx-edit"></i>
                    </button>
                  ) : null}
                </div>
                <input
                  type="number"
                  value={discountRate}
                  min={0}
                  max={100}
                  step={0.5}
                  disabled={Boolean(appendToOrderId && activeOrderPricingLocked)}
                  onChange={(event) => setOrderDiscountRate(Number(event.target.value || 0))}
                />
              </div>

              <div className="field">
                <label>ضريبة النظام</label>
                <div className="muted">
                  {defaultTax ? `${defaultTax.name} بنسبة ${defaultTax.rate}%` : "لا توجد ضريبة افتراضية"}
                </div>
              </div>

              <div className="field">
                <label>ضريبة إضافية (%)</label>
                <input
                  type="number"
                  value={extraTaxRate}
                  min={0}
                  max={100}
                  step={0.5}
                  disabled={Boolean(appendToOrderId && activeOrderPricingLocked)}
                  onChange={(event) => setOrderExtraTaxRate(Number(event.target.value || 0))}
                />
              </div>

              {appendToOrderId ? (
                <p className="hint">
                  {activeOrderPricingLocked
                    ? "تم قفل الخصم والرسوم لهذا الطلب. استخدم أيقونة التعديل لفتحها."
                    : "سيتم تطبيق الخصم والرسوم فقط عند إنهاء الطاولة."}
                </p>
              ) : null}

              <div className="field">
                <label>طريقة الدفع</label>
                <div className="pill-group">
                  {[
                    { id: "cash", label: "نقدي" },
                    { id: "card", label: "بطاقة" },
                    { id: "wallet", label: "محفظة" },
                    { id: "mixed", label: "مختلط" },
                  ].map((method) => (
                    <button
                      key={method.id}
                      type="button"
                      className={`pill ${payment === method.id ? "active" : ""}`}
                      onClick={() => setPayment(method.id as PaymentUi)}
                    >
                      {method.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="cart-summary">
              {appendToOrderId ? (
                <div className="summary-row">
                  <span>إجمالي الطلب الحالي</span>
                  <strong>{money(activeTableOrder?.total || 0)}</strong>
                </div>
              ) : null}
              {appendToOrderId ? (
                <>
                  <div className="summary-row">
                    <span>إضافات جديدة على الطلب</span>
                    <strong>{money(cartSubtotal)}</strong>
                  </div>
                  <div className="summary-row">
                    <span>الإجمالي قبل الخصم (نهائي)</span>
                    <strong>{money(projectedActiveOrder.subtotal)}</strong>
                  </div>
                  <div className="summary-row">
                    <span>خصم نهائي ({discountRate.toFixed(1)}%)</span>
                    <strong>{money(projectedActiveOrder.discount)}</strong>
                  </div>
                  <div className="summary-row">
                    <span>ضريبة نهائية ({projectedActiveOrder.taxRate.toFixed(2)}%)</span>
                    <strong>{money(projectedActiveOrder.taxAmount)}</strong>
                  </div>
                  <div className="summary-row highlight">
                    <span>إجمالي نهائي متوقع</span>
                    <strong>{money(projectedActiveOrder.total)}</strong>
                  </div>
                </>
              ) : (
                <>
                  <div className="summary-row">
                    <span>الإجمالي قبل الخصم</span>
                    <strong>{money(cartSubtotal)}</strong>
                  </div>
                  <div className="summary-row">
                    <span>خصم ({discountRate.toFixed(1)}%)</span>
                    <strong>{money(discountAmount)}</strong>
                  </div>
                  <div className="summary-row">
                    <span>ضريبة ({combinedTaxRate.toFixed(2)}%)</span>
                    <strong>{money(taxAmount)}</strong>
                  </div>
                  <div className="summary-row">
                    <span>رسوم التوصيل</span>
                    <strong>{money(deliveryFee)}</strong>
                  </div>
                  <div className="summary-row highlight">
                    <span>الإجمالي النهائي</span>
                    <strong>{money(total)}</strong>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="cart-actions">
            <button className="ghost" type="button" onClick={clearCart}>
              <i className="bx bx-trash"></i>
              تفريغ السلة
            </button>

            {appendToOrderId ? (
              <>
                <button
                  className="primary"
                  type="button"
                  onClick={openSubmitConfirmation}
                  disabled={submitting || cart.length === 0 || activeOrderLoading}
                >
                  <i className="bx bx-plus-circle"></i>
                  {submitting ? "جارٍ الإضافة..." : "إضافة للطلب"}
                </button>

                <button
                  className="ghost"
                  type="button"
                  onClick={openFinishOrderModal}
                  disabled={finishSubmitting || activeOrderLoading}
                >
                  <i className="bx bx-check-circle"></i>
                  إنهاء الطاولة
                </button>
              </>
            ) : (
              <button
                className="primary"
                type="button"
                onClick={openSubmitConfirmation}
                disabled={submitting || cart.length === 0}
              >
                <i className="bx bx-check-circle"></i>
                {submitting ? "جارٍ التأكيد..." : "تأكيد الطلب"}
              </button>
            )}
          </div>

          <p className="hint">
            {appendToOrderId
              ? "يمكنك إضافة عناصر جديدة أو إنهاء الطاولة لإخراج الفاتورة النهائية."
              : "تأكيد الطلب يحفظه على الطاولة ويحوّلها لمشغولة."}
          </p>
        </div>
      </div>

      <InlineModal
        open={finishModalOpen}
        title="إنهاء الطاولة"
        onClose={() => setFinishModalOpen(false)}
        footer={
          <>
            <button className="ghost" type="button" onClick={() => setFinishModalOpen(false)}>
              إلغاء
            </button>
            <button className="primary" type="button" onClick={() => void finishOrder()} disabled={finishSubmitting}>
              {finishSubmitting ? "جارٍ الإنهاء..." : "تأكيد إنهاء الطاولة"}
            </button>
          </>
        }
      >
        {activeTableOrder ? (
          <div className="modal-body">
            <div className="list">
              <div className="row-line">
                <span>رقم الطلب</span>
                <strong>{activeTableOrder.code}</strong>
              </div>
              <div className="row-line">
                <span>الطاولة</span>
                <strong>
                  {activeTableOrder.tableName} ({activeTableOrder.tableNumber})
                </strong>
              </div>
            </div>

            <table className="view-table" style={{ marginTop: 12 }}>
              <thead>
                <tr>
                  <th>الصنف</th>
                  <th>الكمية</th>
                  <th>سعر الوحدة</th>
                  <th>الخصم من الصنف</th>
                  <th>بعد الخصم</th>
                </tr>
              </thead>
              <tbody>
                {finishAdjustments.map((item) => {
                  const remainingQty = item.qty - item.deductQty;
                  return (
                    <tr key={item.itemId}>
                      <td>{item.name}</td>
                      <td>{item.qty}</td>
                      <td>{money(item.unitPrice)}</td>
                      <td>
                        <div className="qty-control">
                          <button
                            className="qty-btn"
                            type="button"
                            onClick={() => changeFinishDeduction(item.itemId, -1)}
                            disabled={item.deductQty <= 0}
                          >
                            -
                          </button>
                          <span className="qty-value">{item.deductQty}</span>
                          <button
                            className="qty-btn"
                            type="button"
                            onClick={() => changeFinishDeduction(item.itemId, 1)}
                            disabled={item.deductQty >= item.qty}
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td>{remainingQty}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="cart-summary" style={{ marginTop: 12 }}>
              <div className="summary-row">
                <span>الإجمالي الفرعي بعد التعديل</span>
                <strong>{money(finishPreview.subtotal)}</strong>
              </div>
              <div className="summary-row">
                <span>الخصم النهائي ({discountRate.toFixed(1)}%)</span>
                <strong>{money(finishPreview.discount)}</strong>
              </div>
              <div className="summary-row">
                <span>الضريبة النهائية ({finishPreview.taxRate.toFixed(2)}%)</span>
                <strong>{money(finishPreview.taxAmount)}</strong>
              </div>
              <div className="summary-row highlight">
                <span>الإجمالي النهائي</span>
                <strong>{money(finishPreview.total)}</strong>
              </div>
            </div>
          </div>
        ) : (
          <p className="hint">تعذر تحميل تفاصيل الطلب النشط.</p>
        )}
      </InlineModal>

      <ConfirmModal
        open={submitConfirmOpen}
        title={submitConfirmContent.title}
        message={submitConfirmContent.message}
        confirmLabel={submitting ? "جارٍ التأكيد..." : submitConfirmContent.confirmLabel}
        onClose={() => setSubmitConfirmOpen(false)}
        onConfirm={() => void submitOrder()}
      />

      <ReceiptModal open={receiptOpen} receipt={receipt} onClose={() => setReceiptOpen(false)} />
    </section>
  );
}
