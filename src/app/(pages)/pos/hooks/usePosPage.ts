import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/context/ToastContext";
import { useBranding } from "@/context/BrandingContext";
import { ApiError, apiRequest } from "@/lib/api";
import { isRetailMode } from "@/lib/businessMode";
import { money } from "@/lib/format";
import { buildReceiptSnapshot, type ReceiptSnapshot } from "@/lib/receipt";
import type {
  BusinessMode,
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
  const [businessMode, setBusinessMode] = useState<BusinessMode>("cafe_restaurant");

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
  const [retailCustomerName, setRetailCustomerName] = useState("");
  const [retailCustomerPhone, setRetailCustomerPhone] = useState("");
  const [paymentPlanEnabled, setPaymentPlanEnabled] = useState(false);
  const [paymentPlanDownPayment, setPaymentPlanDownPayment] = useState(0);
  const [paymentPlanInstallmentCount, setPaymentPlanInstallmentCount] = useState(3);
  const [paymentPlanFirstDueDate, setPaymentPlanFirstDueDate] = useState("");
  const [paymentPlanNotes, setPaymentPlanNotes] = useState("");

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

  const retailMode = isRetailMode(businessMode);
  const appendToOrderId =
    !retailMode && orderType === "dine_in" ? selectedTable?.activeOrder?.id || null : null;

  const fetchBootstrap = useCallback(async () => {
    try {
      const data = await apiRequest<{
        categories: PosCategory[];
        products: PosProduct[];
        materials: PosMaterial[];
        zones: PosZone[];
        tables: PosTable[];
        taxes: PosTax[];
        businessMode: BusinessMode;
      }>("/api/pos/bootstrap");
      const nextRetailMode = isRetailMode(data.businessMode);

      setCategories(data.categories || []);
      setProducts(data.products || []);
      setMaterials(data.materials || []);
      setZones(data.zones || []);
      setTables(data.tables || []);
      setTaxes(data.taxes || []);
      setBusinessMode(data.businessMode || "cafe_restaurant");

      setZoneId((current) => {
        if (nextRetailMode) return "";
        if (!data.zones?.length) return "";
        const valid = data.zones.some((zone) => zone.id === current && zone.status === "active");
        if (valid) return current;
        return data.zones.find((zone) => zone.status === "active")?.id || "";
      });

      setTableId((current) => {
        if (nextRetailMode) return "";
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
    if (retailMode) return;
    if (orderType !== "delivery") return;
    if (!activeZones.some((zone) => zone.id === zoneId)) {
      setZoneId(activeZones[0]?.id || "");
    }
  }, [activeZones, orderType, retailMode, zoneId]);

  useEffect(() => {
    if (retailMode) return;
    if (orderType !== "dine_in") return;
    if (!dineInTables.some((table) => table.id === tableId)) {
      const preferred = dineInTables.find((table) => table.status === "empty") || dineInTables[0];
      setTableId(preferred?.id || "");
    }
  }, [dineInTables, orderType, retailMode, tableId]);

  useEffect(() => {
    if (!retailMode) return;
    setOrderType("delivery");
    setTableId("");
    setZoneId("");
    setBusyDrawerOpen(false);
    setActiveTableOrder(null);
    setFinishModalOpen(false);
    setFinishAdjustments([]);
  }, [retailMode]);

  useEffect(() => {
    if (retailMode) return;
    setRetailCustomerName("");
    setRetailCustomerPhone("");
    setPaymentPlanEnabled(false);
    setPaymentPlanDownPayment(0);
    setPaymentPlanInstallmentCount(3);
    setPaymentPlanFirstDueDate("");
    setPaymentPlanNotes("");
  }, [retailMode]);

  useEffect(() => {
    if (retailMode || initialRouteAppliedRef.current || tables.length === 0) return;

    const routeTableId = searchParams.get("tableId");
    if (routeTableId) {
      const routeTable = tables.find((table) => table.id === routeTableId);
      if (routeTable) {
        setOrderType("dine_in");
        setTableId(routeTable.id);
      }
    }

    initialRouteAppliedRef.current = true;
  }, [retailMode, searchParams, tables]);

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
        if (item.isGift) return sum;
        if (item.type === "custom") return sum + item.unitPrice * item.qty;
        const product = products.find((entry) => entry.id === item.productId);
        return sum + (product?.price || 0) * item.qty;
      }, 0),
    [cart, products]
  );

  const deliveryFee = useMemo(() => {
    if (retailMode) return 0;
    if (orderType !== "delivery") return 0;
    const zone = zones.find((entry) => entry.id === zoneId);
    return zone?.fee || 0;
  }, [orderType, retailMode, zoneId, zones]);

  const defaultTax = useMemo(() => taxes.find((tax) => tax.isDefault && tax.isActive) || null, [taxes]);
  const defaultTaxRate = defaultTax?.rate || 0;
  const combinedTaxRate = defaultTaxRate + extraTaxRate;
  const discountAmount = Math.min(cartSubtotal, (cartSubtotal * discountRate) / 100);
  const taxableBase = Math.max(0, cartSubtotal - discountAmount);
  const taxAmount = taxableBase * (combinedTaxRate / 100);
  const total = taxableBase + deliveryFee + taxAmount;
  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const paymentPlanPreview = useMemo(() => {
    const downPayment = Math.max(0, Number(paymentPlanDownPayment || 0));
    const installmentCount = Math.max(1, Number(paymentPlanInstallmentCount || 1));
    const remainingAmount = Math.max(0, total - downPayment);
    const installmentAmount = Math.round((remainingAmount / installmentCount) * 100) / 100;
    return {
      downPayment,
      remainingAmount,
      installmentCount,
      installmentAmount,
    };
  }, [paymentPlanDownPayment, paymentPlanInstallmentCount, total]);
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
    if (retailMode && !retailCustomerPhone.trim()) return "اكتب رقم العميل أو رقم الهاتف";
    if (retailMode && paymentPlanEnabled) {
      if (paymentPlanDownPayment < 0 || paymentPlanDownPayment > total) {
        return "الدفعة المقدمة يجب أن تكون بين صفر وإجمالي الفاتورة";
      }
      if (!Number.isInteger(Number(paymentPlanInstallmentCount)) || paymentPlanInstallmentCount < 1) {
        return "عدد الأقساط يجب أن يكون 1 أو أكثر";
      }
    }
    if (!retailMode && orderType === "delivery" && !zoneId) return "اختر نطاق التوصيل";
    if (!retailMode && orderType === "dine_in" && !tableId) return "اختر طاولة أولاً";
    if (!retailMode && orderType === "dine_in" && selectedTable?.status === "occupied" && !selectedTable.activeOrder) {
      return "الطاولة مشغولة بدون طلب نشط، اربطها بطلب أولاً من صفحة الطلبيات";
    }
    return null;
  }, [
    cart.length,
    orderType,
    paymentPlanDownPayment,
    paymentPlanEnabled,
    paymentPlanInstallmentCount,
    retailCustomerPhone,
    retailMode,
    selectedTable,
    tableId,
    total,
    zoneId,
  ]);

  const submitConfirmContent = useMemo(() => {
    if (retailMode) {
      return {
        title: "تأكيد البيع",
        confirmLabel: "إنهاء البيع",
        message: paymentPlanEnabled
          ? `سيتم تسجيل بيع مباشر بإجمالي ${money(total)} مع تقسيط ${paymentPlanPreview.installmentCount} أقساط.`
          : `سيتم تسجيل بيع مباشر مدفوع بإجمالي ${money(total)}.`,
      };
    }

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
  }, [
    appendToOrderId,
    cartCount,
    cartSubtotal,
    orderType,
    paymentPlanEnabled,
    paymentPlanPreview.installmentCount,
    retailMode,
    selectedTable,
    total,
  ]);

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
      return [...prev, { id: productId, type: "product", productId, qty: 1, isGift: false }];
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
    setCart((prev) => [
      ...prev,
      {
        ...item,
        id,
        type: "custom",
        name,
        qty: 1,
        isGift: false,
        recipeProductId: retailMode ? null : item.recipeProductId,
      },
    ]);
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

  const toggleGiftItem = (cartItemId: string) => {
    if (!retailMode) return;
    setCart((prev) =>
      prev.map((item) =>
        item.id === cartItemId ? { ...item, isGift: !item.isGift } : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
    setLastAddedCartItemId(null);
    if (!appendToOrderId) {
      setDiscountRate(0);
      setExtraTaxRate(0);
    }
    setPaymentPlanEnabled(false);
    setPaymentPlanDownPayment(0);
    pushToast("تم تفريغ السلة", "success");
  };

  const startNewOrder = useCallback(() => {
    const firstEmptyTable = dineInTables.find((table) => table.status === "empty");
    setBusyDrawerOpen(false);
    setOrderType(retailMode ? "delivery" : "dine_in");
    setTableId(retailMode ? "" : firstEmptyTable?.id || "");
    setZoneId("");
    setCart([]);
    setLastAddedCartItemId(null);
    setRetailCustomerName("");
    setRetailCustomerPhone("");
    setPaymentPlanEnabled(false);
    setPaymentPlanDownPayment(0);
    setPaymentPlanInstallmentCount(3);
    setPaymentPlanFirstDueDate("");
    setPaymentPlanNotes("");
    setDiscountRate(0);
    setExtraTaxRate(0);
    setActiveTableOrder(null);
    setFinishModalOpen(false);
    setFinishAdjustments([]);
  }, [dineInTables, retailMode]);

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
    if (retailMode) {
      pushToast("وضع التجزئة لا يستخدم إنهاء الطاولات", "error");
      return;
    }

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
          customerPhone: finalized.customerPhone,
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
            isGift: item.isGift,
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
      const effectiveOrderType: OrderTypeUi = retailMode ? "delivery" : orderType;
      const isDineIn = !retailMode && effectiveOrderType === "dine_in";
      const retailCustomerPhoneValue = retailCustomerPhone.trim();
      const retailCustomerNameValue = retailCustomerName.trim() || retailCustomerPhoneValue || "عميل بيع مباشر";
      const payload = {
        type: effectiveOrderType,
        customerName:
          retailMode
            ? retailCustomerNameValue
            : effectiveOrderType === "dine_in"
            ? "عميل صالة"
            : effectiveOrderType === "takeaway"
              ? "عميل تيك أواي"
              : "عميل توصيل",
        customerPhone: retailMode ? retailCustomerPhoneValue : null,
        zoneId: effectiveOrderType === "delivery" && !retailMode ? zoneId : null,
        tableId: isDineIn ? tableId : null,
        appendToOrderId: isDineIn ? appendToOrderId : null,
        discount: isDineIn ? 0 : discountAmount,
        taxRate: isDineIn ? 0 : combinedTaxRate,
        payment,
        paymentPlan:
          retailMode && paymentPlanEnabled
            ? {
                downPayment: paymentPlanPreview.downPayment,
                installmentCount: paymentPlanPreview.installmentCount,
                firstDueDate: paymentPlanFirstDueDate || null,
                notes: paymentPlanNotes || null,
              }
            : null,
        items: cart.map((item) =>
          item.type === "product"
            ? { productId: item.productId, quantity: item.qty, isGift: Boolean(item.isGift) }
            : {
                name: item.name,
                unitPrice: item.unitPrice,
                quantity: item.qty,
                isGift: Boolean(item.isGift),
                recipeProductId: retailMode ? null : item.recipeProductId,
                materials: item.materials,
              }
        ),
      };

      const isAppending = Boolean(payload.appendToOrderId);

      const result = await apiRequest<{ order: PosOrder }>("/api/orders", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (effectiveOrderType !== "dine_in") {
        const fallbackItems = cart.map((item) => {
          if (item.type === "custom") {
            const unitPrice = item.isGift ? 0 : item.unitPrice;
            return {
              name: item.name,
              qty: item.qty,
              unitPrice,
              totalPrice: unitPrice * item.qty,
              isGift: Boolean(item.isGift),
            };
          }
          const product = products.find((entry) => entry.id === item.productId);
          const unitPrice = item.isGift ? 0 : product?.price || 0;
          return {
            name: product?.name || "منتج",
            qty: item.qty,
            unitPrice,
            totalPrice: unitPrice * item.qty,
            isGift: Boolean(item.isGift),
          };
        });

        const fallbackReceipt = buildReceiptSnapshot({
          code: result.order.code,
          createdAt: new Date().toISOString(),
          customerName: payload.customerName,
          customerPhone: payload.customerPhone,
          orderType: effectiveOrderType,
          payment,
          brandName: branding.brandName,
          brandTagline: branding.brandTagline || undefined,
          logoUrl: branding.logoUrl || null,
          tableName: isDineIn ? selectedTable?.name || null : null,
          tableNumber: isDineIn ? selectedTable?.number ?? null : null,
          zoneName:
            effectiveOrderType === "delivery" && !retailMode
              ? zones.find((zone) => zone.id === zoneId)?.name || null
              : null,
          items: fallbackItems,
          discount: discountAmount,
          taxRate: combinedTaxRate,
          taxAmount,
          deliveryFee,
          total,
          notes: null,
          paymentPlan:
            retailMode && paymentPlanEnabled
              ? {
                  downPayment: paymentPlanPreview.downPayment,
                  remainingAmount: paymentPlanPreview.remainingAmount,
                  installmentCount: paymentPlanPreview.installmentCount,
                  installmentAmount: paymentPlanPreview.installmentAmount,
                  firstDueDate: paymentPlanFirstDueDate || null,
                }
              : null,
        });

        setReceipt(result.order.receiptSnapshot ?? fallbackReceipt);
        setReceiptOpen(true);
      }

      setCart([]);
      setLastAddedCartItemId(null);
      if (retailMode) {
        setRetailCustomerName("");
        setRetailCustomerPhone("");
        setPaymentPlanEnabled(false);
        setPaymentPlanDownPayment(0);
        setPaymentPlanInstallmentCount(3);
        setPaymentPlanFirstDueDate("");
        setPaymentPlanNotes("");
      }

      if (isDineIn) {
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

      if (isDineIn) {
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

      if (isDineIn) {
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
    businessMode,
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
    retailMode,
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
    paymentPlanDownPayment,
    paymentPlanEnabled,
    paymentPlanFirstDueDate,
    paymentPlanInstallmentCount,
    paymentPlanNotes,
    paymentPlanPreview,
    total,
    retailCustomerName,
    retailCustomerPhone,
    undoLastItem,
    unlockOrderPricing,
    setPaymentPlanDownPayment,
    setPaymentPlanEnabled,
    setPaymentPlanFirstDueDate,
    setPaymentPlanInstallmentCount,
    setPaymentPlanNotes,
    setRetailCustomerName,
    setRetailCustomerPhone,
    toggleGiftItem,
    zoneId,
  };
}

export type PosPageState = ReturnType<typeof usePosPage>;
