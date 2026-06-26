"use client";

import { money } from "@/lib/format";
import ConfirmModal from "@/components/ui/ConfirmModal";
import ReceiptModal from "@/components/ui/ReceiptModal";
import BusyTablesDrawer from "./BusyTablesDrawer";
import CustomOrderModal from "./CustomOrderModal";
import FinishOrderModal from "./FinishOrderModal";
import OrderTypeSwitcher from "./OrderTypeSwitcher";
import ProductGrid from "./ProductGrid";
import QuickActions from "./QuickActions";
import type { PaymentUi } from "../types";
import { usePosPage } from "../hooks/usePosPage";

export default function PosPageClient() {
  const {
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
    paymentPlanDownPayment,
    paymentPlanEnabled,
    paymentPlanFirstDueDate,
    paymentPlanInstallmentCount,
    paymentPlanNotes,
    paymentPlanPreview,
    products,
    projectedActiveOrder,
    receipt,
    receiptOpen,
    retailCustomerName,
    retailCustomerPhone,
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
    setPaymentPlanDownPayment,
    setPaymentPlanEnabled,
    setPaymentPlanFirstDueDate,
    setPaymentPlanInstallmentCount,
    setPaymentPlanNotes,
    setReceiptOpen,
    setRetailCustomerName,
    setRetailCustomerPhone,
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
    toggleGiftItem,
    undoLastItem,
    unlockOrderPricing,
    zoneId,
  } = usePosPage();

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
            <button className="pos-custom-order-btn" type="button" onClick={() => setCustomOrderModalOpen(true)}>
              <i className="bx bx-edit-alt"></i>
              طلب خاص
            </button>
            {retailMode ? (
              <div className="retail-mode-pill">
                <i className="bx bx-shopping-bag"></i>
                بيع مباشر
              </div>
            ) : (
              <OrderTypeSwitcher orderType={orderType} onChange={setOrderType} />
            )}
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
            <ProductGrid
              products={filteredProducts}
              getProductAvailability={getProductAvailability}
              onAdd={addToCart}
            />

            {!retailMode ? (
              <BusyTablesDrawer
                open={busyDrawerOpen}
                busyTables={busyTables}
                selectedTableId={tableId}
                onClose={() => setBusyDrawerOpen(false)}
                onSelect={(nextTableId) => {
                  setOrderType("dine_in");
                  setTableId(nextTableId);
                  setBusyDrawerOpen(false);
                }}
              />
            ) : null}
          </div>

          {!retailMode ? (
            <QuickActions
              onToggleBusyTables={() => setBusyDrawerOpen((prev) => !prev)}
              onNewOrder={startNewOrder}
              onUndo={undoLastItem}
              onExpense={goToFinance}
            />
          ) : null}
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
                  const product = item.type === "product" ? products.find((entry) => entry.id === item.productId) : null;
                  const name = item.type === "custom" ? item.name : product?.name || "—";
                  const unitPrice = item.type === "custom" ? item.unitPrice : product?.price || 0;
                  return (
                    <div key={item.id} className="cart-item">
                      <div className="cart-item-info">
                        <div className="cart-item-name">{name}</div>
                        <div className="cart-item-meta">
                          {item.isGift ? "هدية بدون سعر" : `سعر ${money(unitPrice)}`}
                          {item.type === "custom" ? " · طلب خاص" : ""}
                        </div>
                      </div>
                      <div className="cart-item-actions">
                        {retailMode ? (
                          <button
                            className={`gift-toggle ${item.isGift ? "active" : ""}`}
                            type="button"
                            onClick={() => toggleGiftItem(item.id)}
                            title="تحديد كهدية"
                            aria-label="تحديد كهدية"
                          >
                            <i className="bx bx-gift"></i>
                          </button>
                        ) : null}
                        <div className="qty-control">
                          <button className="qty-btn" type="button" onClick={() => changeCartQty(item.id, -1)}>
                            -
                          </button>
                          <span className="qty-value">{item.qty}</span>
                          <button className="qty-btn" type="button" onClick={() => changeCartQty(item.id, 1)}>
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="cart-options">
              {retailMode ? (
                <>
                  <div className="retail-invoice-fields">
                    <div className="field">
                      <label>رقم العميل / الهاتف</label>
                      <input
                        type="text"
                        value={retailCustomerPhone}
                        onChange={(event) => setRetailCustomerPhone(event.target.value)}
                        placeholder="مثال: 01000000000"
                        required
                      />
                    </div>
                    <div className="field">
                      <label>اسم العميل (اختياري)</label>
                      <input
                        type="text"
                        value={retailCustomerName}
                        onChange={(event) => setRetailCustomerName(event.target.value)}
                        placeholder="اسم العميل"
                      />
                    </div>
                  </div>

                  <div className="field retail-payment-plan">
                    <label className="checkbox-line">
                      <input
                        type="checkbox"
                        checked={paymentPlanEnabled}
                        onChange={(event) => {
                          const checked = event.target.checked;
                          setPaymentPlanEnabled(checked);
                          if (checked) setPayment("mixed");
                        }}
                      />
                      تقسيط / خطة دفع
                    </label>
                    {paymentPlanEnabled ? (
                      <div className="retail-payment-plan-grid">
                        <label>
                          دفعة مقدمة
                          <input
                            type="number"
                            value={paymentPlanDownPayment}
                            min={0}
                            max={total}
                            step={1}
                            onChange={(event) => setPaymentPlanDownPayment(Number(event.target.value || 0))}
                          />
                        </label>
                        <label>
                          عدد الأقساط
                          <input
                            type="number"
                            value={paymentPlanInstallmentCount}
                            min={1}
                            max={120}
                            step={1}
                            onChange={(event) =>
                              setPaymentPlanInstallmentCount(Number(event.target.value || 1))
                            }
                          />
                        </label>
                        <label>
                          أول استحقاق
                          <input
                            type="date"
                            value={paymentPlanFirstDueDate}
                            onChange={(event) => setPaymentPlanFirstDueDate(event.target.value)}
                          />
                        </label>
                        <label>
                          ملاحظات
                          <input
                            type="text"
                            value={paymentPlanNotes}
                            onChange={(event) => setPaymentPlanNotes(event.target.value)}
                            placeholder="اختياري"
                          />
                        </label>
                        <div className="retail-payment-plan-preview">
                          <span>المتبقي {money(paymentPlanPreview.remainingAmount)}</span>
                          <strong>القسط {money(paymentPlanPreview.installmentAmount)}</strong>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </>
              ) : null}

              {!retailMode && orderType === "delivery" && (
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

              {!retailMode && orderType === "dine_in" && (
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
                  {!retailMode ? (
                    <div className="summary-row">
                      <span>رسوم التوصيل</span>
                      <strong>{money(deliveryFee)}</strong>
                    </div>
                  ) : null}
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
                  className="primary-green"
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
                {submitting ? "جارٍ التأكيد..." : retailMode ? "إنهاء البيع" : "تأكيد الطلب"}
              </button>
            )}
          </div>

          <p className="hint">
            {retailMode
              ? "تأكيد البيع يحفظ الفاتورة مباشرة ويطبع الإيصال تلقائياً."
              : appendToOrderId
              ? "يمكنك إضافة عناصر جديدة أو إنهاء الطاولة لإخراج الفاتورة النهائية."
              : "تأكيد الطلب يحفظه على الطاولة ويحوّلها لمشغولة."}
          </p>
        </div>
      </div>

      {!retailMode ? (
        <FinishOrderModal
          open={finishModalOpen}
          activeTableOrder={activeTableOrder}
          finishAdjustments={finishAdjustments}
          finishPreview={finishPreview}
          discountRate={discountRate}
          finishSubmitting={finishSubmitting}
          onClose={() => setFinishModalOpen(false)}
          onChangeDeduction={changeFinishDeduction}
          onFinish={() => void finishOrder()}
        />
      ) : null}

      <CustomOrderModal
        open={customOrderModalOpen}
        products={products}
        materials={materials}
        showRecipeOptions={!retailMode}
        onClose={() => setCustomOrderModalOpen(false)}
        onAdd={addCustomOrder}
      />

      <ConfirmModal
        open={submitConfirmOpen}
        title={submitConfirmContent.title}
        message={submitConfirmContent.message}
        confirmLabel={submitting ? "جارٍ التأكيد..." : submitConfirmContent.confirmLabel}
        onClose={() => setSubmitConfirmOpen(false)}
        onConfirm={() => void submitOrder()}
      />

      <ReceiptModal open={receiptOpen} receipt={receipt} onClose={() => setReceiptOpen(false)} autoPrint />
    </section>
  );
}
