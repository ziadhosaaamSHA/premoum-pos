import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/context/ToastContext";
import { useBranding } from "@/context/BrandingContext";
import { ApiError, apiRequest } from "@/lib/api";
import { money } from "@/lib/format";
import { buildReceiptSnapshot, ReceiptSnapshot } from "@/lib/receipt";
import {
  CartItem,
  CustomCartItem,
  DeferredPricing,
  FinishAdjustment,
  OrderTypeUi,
  PaymentUi,
  PosCategory,
  PosMaterial,
  PosOrder,
  PosProduct,
  PosTable,
  PosTax,
  PosZone,
} from "../types";

export function usePosPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { pushToast } = useToast();
  const { branding } = useBranding();
  const initialRouteAppliedRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<PosCategory[]>([]);
  const [products, setProducts] = useState<PosProduct[]>([]);
  const [materials, setMaterials] = useState<PosMaterial[]>([]);
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
  const [lastAddedCartItemId, setLastAddedCartItemId] = useState<string | null>(null);
  const [customOrderModalOpen, setCustomOrderModalOpen] = useState(false);

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
        materials: PosMaterial[];
        zones: PosZone[];
        tables: PosTable[];
        taxes: PosTax[];
      }>("/api/pos/bootstrap");

      setCategories(data.categories || []);
      setProducts(data.products || []);
      setMaterials(data.materials || []);
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
        if (item.type === "custom") return sum + item.unitPrice * item.qty;
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
  const cartQtyMap = useMemo(
    () =>
      new Map(
        cart
          .filter((item) => item.type === "product")
          .map((item) => [item.productId, item.qty])
      ),
    [cart]
  );
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
      const existing = prev.find((item) => item.type === "product" && item.productId === productId);
      if (existing) {
        return prev.map((item) =>
          item.type === "product" && item.productId === productId ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { id: productId, type: "product", productId, qty: 1 }];
    });
    setLastAddedCartItemId(productId);
  };

  const addCustomOrder = (item: Omit<CustomCartItem, "id" | "type" | "qty">) => {
    const name = item.name.trim();
    if (!name) {
      pushToast("اكتب اسم الطلب الخاص", "error");
      return false;
    }
    if (!Number.isFinite(item.unitPrice) || item.unitPrice < 0) {
      pushToast("اكتب سعر صحيح للطلب الخاص", "error");
      return false;
    }

    const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setCart((prev) => [...prev, { ...item, id, type: "custom", name, qty: 1 }]);
    setLastAddedCartItemId(id);
    pushToast("تمت إضافة الطلب الخاص إلى السلة", "success");
    return true;
  };

  const changeCartQty = (cartItemId: string, delta: number) => {
    if (delta > 0) {
      const cartLine = cart.find((item) => item.id === cartItemId);
      const product = cartLine?.type === "product" ? products.find((entry) => entry.id === cartLine.productId) : null;
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
          item.id === cartItemId ? { ...item, qty: item.qty + delta } : item
        )
        .filter((item) => item.qty > 0)
    );
  };

  const clearCart = () => {
    setCart([]);
    setLastAddedCartItemId(null);
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
    setLastAddedCartItemId(null);
    setDiscountRate(0);
    setExtraTaxRate(0);
    setActiveTableOrder(null);
    setFinishModalOpen(false);
    setFinishAdjustments([]);
  }, [dineInTables]);

  const undoLastItem = () => {
    if (!lastAddedCartItemId) {
      pushToast("لا يوجد عنصر حديث للتراجع", "error");
      return;
    }

    const existing = cart.find((item) => item.id === lastAddedCartItemId);
    if (!existing) {
      pushToast("لا يوجد عنصر حديث للتراجع", "error");
      setLastAddedCartItemId(null);
      return;
    }

    setCart((prev) =>
      prev
        .map((item) =>
          item.id === lastAddedCartItemId ? { ...item, qty: item.qty - 1 } : item
        )
        .filter((item) => item.qty > 0)
    );
    setLastAddedCartItemId(null);
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
        items: cart.map((item) =>
          item.type === "product"
            ? { productId: item.productId, quantity: item.qty }
            : {
                name: item.name,
                unitPrice: item.unitPrice,
                quantity: item.qty,
                recipeProductId: item.recipeProductId,
                materials: item.materials,
              }
        ),
      };

      const isAppending = Boolean(payload.appendToOrderId);

      const result = await apiRequest<{ order: PosOrder }>("/api/orders", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (orderType !== "dine_in") {
        const fallbackItems = cart.map((item) => {
          if (item.type === "custom") {
            return {
              name: item.name,
              qty: item.qty,
              unitPrice: item.unitPrice,
              totalPrice: item.unitPrice * item.qty,
            };
          }
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
      setLastAddedCartItemId(null);

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


  const goToFinance = useCallback(() => {
    router.push("/finance");
  }, [router]);

  return {
    activeOrderLoading,
    activeOrderPricingLocked,
    activeTableOrder,
    activeZones,
    addCustomOrder,
    addToCart,
    appendToOrderId,
    busyDrawerOpen,
    busyTables,
    cart,
    cartCount,
    cartSubtotal,
    categoriesWithAll,
    category,
    changeCartQty,
    changeFinishDeduction,
    clearCart,
    combinedTaxRate,
    customOrderModalOpen,
    defaultTax,
    deliveryFee,
    dineInTables,
    discountAmount,
    discountRate,
    extraTaxRate,
    filteredProducts,
    finishAdjustments,
    finishModalOpen,
    finishOrder,
    finishPreview,
    finishSubmitting,
    getProductAvailability,
    goToFinance,
    loading,
    materials,
    openFinishOrderModal,
    openSubmitConfirmation,
    orderType,
    payment,
    products,
    projectedActiveOrder,
    receipt,
    receiptOpen,
    search,
    selectedTable,
    setBusyDrawerOpen,
    setCategory,
    setCustomOrderModalOpen,
    setFinishModalOpen,
    setOrderDiscountRate,
    setOrderExtraTaxRate,
    setOrderType,
    setPayment,
    setReceiptOpen,
    setSearch,
    setSubmitConfirmOpen,
    setTableId,
    setZoneId,
    startNewOrder,
    submitConfirmContent,
    submitConfirmOpen,
    submitOrder,
    submitting,
    tableId,
    taxAmount,
    total,
    undoLastItem,
    unlockOrderPricing,
    zoneId,
  };
}

export type PosPageState = ReturnType<typeof usePosPage>;
