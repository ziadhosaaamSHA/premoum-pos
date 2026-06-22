import { EntityModal, ModalForm } from "@/components/ui";
import { money } from "@/lib/format";
import { FinancePageState } from "../../hooks/useFinancePage";

type ExpenseModalProps = Pick<
  FinancePageState,
  "expenseForm" | "expenseModal" | "selectedExpense" | "setExpenseForm" | "setExpenseModal" | "submitExpense" | "submitting"
>;

export default function ExpenseModal({
  expenseForm,
  expenseModal,
  selectedExpense,
  setExpenseForm,
  setExpenseModal,
  submitExpense,
  submitting,
}: ExpenseModalProps) {
  const title =
    expenseModal?.mode === "create" ? "إضافة مصروف" : expenseModal?.mode === "edit" ? "تعديل مصروف" : "تفاصيل المصروف";

  return (
    <EntityModal
      open={Boolean(expenseModal)}
      title={title}
      onClose={() => setExpenseModal(null)}
      isView={expenseModal?.mode === "view" && Boolean(selectedExpense)}
      details={
        selectedExpense
          ? [
              { label: "التاريخ", value: selectedExpense.date },
              { label: "البند", value: selectedExpense.title },
              { label: "الجهة", value: selectedExpense.vendor },
              { label: "القيمة", value: money(selectedExpense.amount) },
              { label: "ملاحظات", value: selectedExpense.notes || "—" },
            ]
          : []
      }
    >
      <ModalForm
        onSubmit={submitExpense}
        submitting={submitting}
        submitLabel={expenseModal?.mode === "create" ? "حفظ المصروف" : "حفظ التغييرات"}
      >
        <label>التاريخ</label>
        <input type="date" value={expenseForm.date} onChange={(event) => setExpenseForm((prev) => ({ ...prev, date: event.target.value }))} required />
        <label>البند</label>
        <input type="text" value={expenseForm.title} onChange={(event) => setExpenseForm((prev) => ({ ...prev, title: event.target.value }))} required />
        <label>الجهة</label>
        <input type="text" value={expenseForm.vendor} onChange={(event) => setExpenseForm((prev) => ({ ...prev, vendor: event.target.value }))} />
        <label>القيمة</label>
        <input type="number" min={0} step="0.01" value={expenseForm.amount} onChange={(event) => setExpenseForm((prev) => ({ ...prev, amount: Number(event.target.value || 0) }))} required />
        <label>ملاحظات</label>
        <textarea rows={3} value={expenseForm.notes} onChange={(event) => setExpenseForm((prev) => ({ ...prev, notes: event.target.value }))} />
      </ModalForm>
    </EntityModal>
  );
}
