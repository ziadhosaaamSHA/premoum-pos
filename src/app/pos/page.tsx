"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "@/context/ToastContext";
import { useBranding } from "@/context/BrandingContext";
import { ApiError, apiRequest } from "@/lib/api";
import { money } from "@/lib/format";
import { buildReceiptSnapshot, ReceiptSnapshot } from "@/lib/receipt";
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

export default function PosPage() {
  const { pushToast } = useToast();
  const { branding } = useBranding();

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
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptSnapshot | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);

  const activeZones = useMemo(() => zones.filter((zone) => zone.status === "active"), [zones]);
  const availableTables = useMemo(() => tables.filter((table) => table.status === "empty"), [tables]);

  const fetchBootstrap = useCallback(async () => {
    try {
      const data = await apiRequest<{
        categories: PosCategory[];
        products: PosProduct[];
        zones: PosZone[];
        tables: PosTable[];
        taxes: PosTax[];
      }>("/api/pos/bootstrap");

      setCategories(data.categories);
      setProducts(data.products);
      setZones(data.zones);
      setTables(data.tables);
      setTaxes(data.taxes || []);

      if (data.zones.length > 0 && !data.zones.some((zone) => zone.id === zoneId && zone.status === "active")) {
        setZoneId(data.zones.find((zone) => zone.status === "active")?.id || "");
      }

      if (data.tables.length > 0 && !data.tables.some((table) => table.id === tableId && table.status === "empty")) {
        setTableId(data.tables.find((table) => table.status === "empty")?.id || "");
      }
    } catch (error) {
      if (error instanceof ApiError) {
        pushToast(error.message || "تعذر تحميل بيانات الكاشير", "error");
      } else {
        pushToast("تعذر تحميل بيانات الكاشير", "error");
      }
    }
  }, [pushToast, tableId, zoneId]);

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
    if (!availableTables.some((table) => table.id === tableId)) {
      setTableId(availableTables[0]?.id || "");
    }
  }, [availableTables, orderType, tableId]);

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

  const defaultTax = useMemo(
    () => taxes.find((tax) => tax.isDefault && tax.isActive) || null,
    [taxes]
  );
  const defaultTaxRate = defaultTax?.rate || 0;
  const combinedTaxRate = defaultTaxRate + extraTaxRate;
  const discountAmount = Math.min(cartSubtotal, (cartSubtotal * discountRate) / 100);
  const taxableBase = Math.max(0, cartSubtotal - discountAmount);
  const taxAmount = taxableBase * (combinedTaxRate / 100);
  const total = taxableBase + deliveryFee + taxAmount;
  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const cartQtyMap = useMemo(() => new Map(cart.map((item) => [item.productId, item.qty])), [cart]);

  const getProductAvailability = useCallback(
    (product: PosProduct) => {
      const cartQty = cartQtyMap.get(product.id) || 0;
      if (!product.isActive) {
        return { disabled: true, reason: "غير متاح حالياً", remaining: 0 };
      }
      if (product.maxQty === null) {
        return { disabled: false, reason: "", remaining: null };
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
    setDiscountRate(0);
    setExtraTaxRate(0);
    pushToast("تم تفريغ السلة", "success");
  };

  const submitOrder = async () => {
    if (cart.length === 0) {
      pushToast("السلة فارغة", "error");
      return;
    }

    if (orderType === "delivery" && !zoneId) {
      pushToast("اختر نطاق التوصيل", "error");
      return;
    }

    if (orderType === "dine_in" && !tableId) {
      pushToast("اختر طاولة أولاً", "error");
      return;
    }

    setSubmitting(true);
    try {
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
        discount: discountAmount,
        taxRate: combinedTaxRate,
        payment,
        items: cart.map((item) => ({ productId: item.productId, quantity: item.qty })),
      };

      const result = await apiRequest<{ order: { code: string; receiptSnapshot?: ReceiptSnapshot | null } }>(
        "/api/orders",
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      );

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
        orderType: orderType,
        payment: payment,
        brandName: branding.brandName,
        brandTagline: branding.brandTagline || undefined,
        tableName:
          orderType === "dine_in" ? tables.find((table) => table.id === tableId)?.name || null : null,
        tableNumber:
          orderType === "dine_in" ? tables.find((table) => table.id === tableId)?.number || null : null,
        zoneName:
          orderType === "delivery" ? zones.find((zone) => zone.id === zoneId)?.name || null : null,
        items: fallbackItems,
        discount: discountAmount,
        taxRate: combinedTaxRate,
        taxAmount,
        deliveryFee,
        total,
        notes: null,
      });

      const snapshot = result.order.receiptSnapshot ?? fallbackReceipt;
      setReceipt(snapshot);
      setReceiptOpen(true);

      setCart([]);
      setDiscountRate(0);
      setExtraTaxRate(0);
      pushToast(`تم تسجيل الطلب ${result.order.code}`, "success");
      await fetchBootstrap();
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
    <section className="page active">
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
                    <div className="product-thumb">{product.label || product.name[0]}</div>
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
        </div>

        <div className="pos-panel cart-panel">
          <div className="cart-header">
            <h2>السلة الحالية</h2>
            <span className="badge neutral">{cartCount} عنصر</span>
          </div>
          <div className="cart-list">
            {cart.length === 0 ? (
              <div className="alert-empty">لا توجد عناصر في السلة</div>
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
                <div className="delivery-options">
                  <select value={zoneId} onChange={(event) => setZoneId(event.target.value)}>
                    {activeZones.map((zone) => (
                      <option key={zone.id} value={zone.id}>
                        {zone.name} - رسوم {money(zone.fee)}
                      </option>
                    ))}
                  </select>
                  <div className="muted">
                    رسوم التوصيل: <strong>{money(deliveryFee)}</strong>
                  </div>
                </div>
              </div>
            )}

            {orderType === "dine_in" && (
              <div className="field">
                <label>اختيار الطاولة</label>
                <select value={tableId} onChange={(event) => setTableId(event.target.value)}>
                  <option value="">بدون طاولة</option>
                  {availableTables.map((table) => (
                    <option key={table.id} value={table.id}>
                      {table.name} ({table.number})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="field">
              <label>خصم (%)</label>
              <input
                type="number"
                value={discountRate}
                min={0}
                max={100}
                step={0.5}
                onChange={(event) => setDiscountRate(Number(event.target.value || 0))}
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
                onChange={(event) => setExtraTaxRate(Number(event.target.value || 0))}
              />
            </div>

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
          </div>

          <div className="cart-actions">
            <button className="ghost" type="button" onClick={clearCart}>
              <i className="bx bx-trash"></i>
              تفريغ السلة
            </button>
            <button className="primary" type="button" onClick={submitOrder} disabled={submitting}>
              <i className="bx bx-check-circle"></i>
              {submitting ? "جارٍ تسجيل الطلب..." : "تأكيد الطلب"}
            </button>
          </div>
          <p className="hint">يتم تسجيل الطلب في قاعدة البيانات مباشرة مع خصم المخزون تلقائياً.</p>
        </div>
      </div>

      <ReceiptModal open={receiptOpen} receipt={receipt} onClose={() => setReceiptOpen(false)} />
    </section>
  );
}
