import { ReactNode } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import PrimaryToolbarAction from "@/components/ui/PrimaryToolbarAction";
import SearchInput from "@/components/ui/SearchInput";
import SelectFilter from "@/components/ui/SelectFilter";
import TableDataActions from "@/components/ui/TableDataActions";

type FilterConfig = {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
};

type SearchConfig = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
};

type PrimaryActionConfig = {
  label: string;
  icon?: string;
  onClick: () => void;
};

type ExportConfig<T> = {
  rows: T[];
  columns: Array<{ label: string; value: (row: T) => string | number | null | undefined }>;
  fileName: string;
  printTitle: string;
  tableId: string;
};

export type BatchActionConfig = {
  label: string;
  icon?: string;
  variant?: "primary" | "ghost" | "danger" | "primary-green";
  disabled?: boolean;
  onClick: () => void;
};

type BatchActionsConfig = {
  selectedCount: number;
  onClear: () => void;
  actions: BatchActionConfig[];
};

type TableSectionProps<T> = {
  title: ReactNode;
  children: ReactNode;
  search?: SearchConfig;
  filters?: FilterConfig[];
  primaryAction?: PrimaryActionConfig;
  exportActions?: ExportConfig<T>;
  batchActions?: BatchActionsConfig;
};

export default function TableSection<T>({
  title,
  children,
  search,
  filters = [],
  primaryAction,
  exportActions,
  batchActions,
}: TableSectionProps<T>) {
  const showBatchActions = Boolean(batchActions && batchActions.selectedCount > 0);

  return (
    <div className="subtab-panel active">
      <Card wide>
        <div className="section-header-actions">
          <h2>{title}</h2>
          <div className="table-toolbar">
            {search ? <SearchInput {...search} /> : null}
            {filters.map((filter, index) => (
              <SelectFilter key={index} {...filter} />
            ))}
            {primaryAction ? <PrimaryToolbarAction {...primaryAction} /> : null}
            {exportActions ? <TableDataActions {...exportActions} /> : null}
          </div>
        </div>
        {showBatchActions ? (
          <div className="table-batch-toolbar">
            <span>{batchActions?.selectedCount} محدد</span>
            <div className="table-batch-actions">
              {batchActions?.actions.map((action, index) => (
                <Button
                  key={`${action.label}-${index}`}
                  variant={action.variant || "ghost"}
                  icon={action.icon}
                  disabled={action.disabled}
                  onClick={action.onClick}
                >
                  {action.label}
                </Button>
              ))}
              <Button variant="ghost" icon="bx bx-x" onClick={batchActions?.onClear}>
                إلغاء التحديد
              </Button>
            </div>
          </div>
        ) : null}
        {children}
      </Card>
    </div>
  );
}
