type QuickActionsProps = {
  onToggleBusyTables: () => void;
  onNewOrder: () => void;
  onUndo: () => void;
  onExpense: () => void;
};

export default function QuickActions({ onToggleBusyTables, onNewOrder, onUndo, onExpense }: QuickActionsProps) {
  return (
    <div className="pos-quick-options">
      <div className="quick-actions-grid">
        <button type="button" className="quick-action qa-busy" onClick={onToggleBusyTables}>
          <span className="quick-action-icon">
            <i className="bx bx-table"></i>
          </span>
          <span className="quick-action-label">الطاولات المشغولة</span>
        </button>
        <button type="button" className="quick-action qa-new" onClick={onNewOrder}>
          <span className="quick-action-icon">
            <i className="bx bx-plus-circle"></i>
          </span>
          <span className="quick-action-label">طلب جديد</span>
        </button>
        <button type="button" className="quick-action qa-undo" onClick={onUndo}>
          <span className="quick-action-icon">
            <i className="bx bx-undo"></i>
          </span>
          <span className="quick-action-label">تراجع</span>
        </button>
        <button type="button" className="quick-action qa-expense" onClick={onExpense}>
          <span className="quick-action-icon">
            <i className="bx bx-money-withdraw"></i>
          </span>
          <span className="quick-action-label">إضافة مصروف</span>
        </button>
      </div>
    </div>
  );
}
