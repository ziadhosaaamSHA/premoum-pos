import { PosTable } from "../types";

type BusyTablesDrawerProps = {
  open: boolean;
  busyTables: PosTable[];
  selectedTableId: string;
  onClose: () => void;
  onSelect: (tableId: string) => void;
};

export default function BusyTablesDrawer({
  open,
  busyTables,
  selectedTableId,
  onClose,
  onSelect,
}: BusyTablesDrawerProps) {
  return (
    <div className={`busy-tables-drawer ${open ? "open" : ""}`}>
      <div className="busy-drawer-header">
        <h3>الطاولات المشغولة ({busyTables.length})</h3>
        <button className="ghost small" type="button" onClick={onClose}>
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
              className={`busy-table-item ${selectedTableId === table.id ? "active" : ""}`}
              onClick={() => onSelect(table.id)}
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
  );
}
