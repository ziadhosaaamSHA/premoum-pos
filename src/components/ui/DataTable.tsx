"use client";

import { ReactNode, useState } from "react";
import { useToast } from "@/context/ToastContext";
import Button from "@/components/ui/Button";
import ConfirmModal from "@/components/ui/ConfirmModal";
import RowActions, { RowActionsProps } from "@/components/ui/RowActions";
import { TableDataColumn } from "@/components/ui/TableDataActions";

export type DataTableColumn<T> = {
  header: string;
  cell: (row: T) => ReactNode;
  exportValue?: (row: T) => string | number | null | undefined;
};

export function getExportColumns<T>(columns: DataTableColumn<T>[]): TableDataColumn<T>[] {
  return columns
    .filter((column) => column.exportValue)
    .map((column) => ({
      label: column.header,
      value: column.exportValue as (row: T) => string | number | null | undefined,
    }));
}

export type DataTableProps<T> = {
  id?: string;
  rows: T[];
  columns: DataTableColumn<T>[];
  getRowKey: (row: T, index: number) => string;
  emptyMessage?: ReactNode;
  getRowProps?: (row: T, index: number) => Record<string, string | number | boolean | undefined>;
  selectable?: boolean;
  selection?: {
    selectedKeys: string[];
    onChange: (selectedKeys: string[]) => void;
    getRowDisabled?: (row: T, index: number) => boolean;
    label?: string;
  };
  actions?: (row: T) => RowActionsProps | null | undefined;
  actionsHeader?: ReactNode;
  batchDelete?: {
    enabled?: boolean;
    label?: string;
    confirmText?: (count: number) => string;
    successMessage?: (count: number) => string;
    onDeleteSelected?: (rows: T[]) => void | Promise<void>;
  };
};

export default function DataTable<T>({
  id,
  rows,
  columns,
  getRowKey,
  emptyMessage = "لا توجد بيانات",
  getRowProps,
  selectable = true,
  selection,
  actions,
  actionsHeader = "الإجراءات",
  batchDelete,
}: DataTableProps<T>) {
  const { pushToast } = useToast();
  const [internalSelectedKeys, setInternalSelectedKeys] = useState<string[]>([]);
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);
  const [batchDeleting, setBatchDeleting] = useState(false);
  const activeSelection = selection || selectable
    ? {
        selectedKeys: selection?.selectedKeys || internalSelectedKeys,
        onChange: selection?.onChange || setInternalSelectedKeys,
        getRowDisabled: selection?.getRowDisabled,
        label: selection?.label,
      }
    : null;

  const selectableRows = activeSelection
    ? rows
        .map((row, index) => ({
          row,
          index,
          key: getRowKey(row, index),
          disabled: activeSelection.getRowDisabled?.(row, index) || false,
        }))
        .filter((item) => !item.disabled)
    : [];
  const selectableKeys = selectableRows.map((item) => item.key);
  const selectedSelectableKeys = activeSelection
    ? activeSelection.selectedKeys.filter((key) => selectableKeys.includes(key))
    : [];
  const selectedRows = activeSelection
    ? rows
        .map((row, index) => ({ row, index, key: getRowKey(row, index) }))
        .filter((item) => activeSelection.selectedKeys.includes(item.key))
    : [];
  const selectedDeletableRows =
    actions && batchDelete?.enabled !== false
      ? selectedRows
          .map((item) => ({ ...item, rowActions: actions(item.row) }))
          .filter((item) => item.rowActions?.onDelete && !item.rowActions.disableDelete && item.rowActions.confirmDelete !== false)
      : [];
  const canBatchDelete = Boolean(batchDelete?.onDeleteSelected)
    ? selectedRows.length > 0 && batchDelete?.enabled !== false
    : selectedDeletableRows.length > 0;
  const batchDeleteCount = batchDelete?.onDeleteSelected ? selectedRows.length : selectedDeletableRows.length;
  const allVisibleSelected =
    Boolean(activeSelection) && selectableKeys.length > 0 && selectedSelectableKeys.length === selectableKeys.length;
  const partiallySelected =
    Boolean(activeSelection) && selectedSelectableKeys.length > 0 && selectedSelectableKeys.length < selectableKeys.length;

  const updateSelection = (nextKeys: string[]) => {
    activeSelection?.onChange(Array.from(new Set(nextKeys)));
  };

  const toggleAllVisibleRows = () => {
    if (!activeSelection) return;
    const selectedSet = new Set(activeSelection.selectedKeys);
    if (allVisibleSelected) {
      selectableKeys.forEach((key) => selectedSet.delete(key));
    } else {
      selectableKeys.forEach((key) => selectedSet.add(key));
    }
    updateSelection(Array.from(selectedSet));
  };

  const toggleRow = (rowKey: string) => {
    if (!activeSelection) return;
    const selectedSet = new Set(activeSelection.selectedKeys);
    if (selectedSet.has(rowKey)) {
      selectedSet.delete(rowKey);
    } else {
      selectedSet.add(rowKey);
    }
    updateSelection(Array.from(selectedSet));
  };

  const clearSelection = () => {
    updateSelection([]);
  };

  const errorMessage = (error: unknown, fallback: string) =>
    error instanceof Error && error.message ? error.message : fallback;

  const handleBatchDelete = async () => {
    if (!canBatchDelete) return;
    setBatchDeleting(true);
    try {
      if (batchDelete?.onDeleteSelected) {
        await batchDelete.onDeleteSelected(selectedRows.map((item) => item.row));
      } else {
        for (const item of selectedDeletableRows) {
          await item.rowActions?.onDelete?.();
        }
      }
      setBatchDeleteOpen(false);
      clearSelection();
      pushToast(
        batchDelete?.successMessage?.(batchDeleteCount) ||
          `تم حذف ${batchDeleteCount} سجل`,
        "success"
      );
    } catch (error) {
      pushToast(errorMessage(error, "تعذر حذف السجلات المحددة"), "error");
    } finally {
      setBatchDeleting(false);
    }
  };

  const dataColumns = actions
    ? [
        ...columns,
        {
          header: actionsHeader,
          cell: (row: T) => {
            const rowActions = actions(row);
            return rowActions ? <RowActions {...rowActions} /> : null;
          },
        },
      ]
    : columns;
  const visibleColumnCount = dataColumns.length + (activeSelection ? 1 : 0);

  return (
    <>
      {activeSelection && selectedRows.length > 0 ? (
        <div className="table-batch-toolbar">
          <span>{selectedRows.length} محدد</span>
          <div className="table-batch-actions">
            {actions || batchDelete?.onDeleteSelected ? (
              <Button
                variant="danger"
                icon="bx bx-trash"
                disabled={!canBatchDelete}
                onClick={() => setBatchDeleteOpen(true)}
              >
                {batchDelete?.label || "حذف المحدد"}
              </Button>
            ) : null}
            <Button variant="ghost" icon="bx bx-x" onClick={clearSelection}>
              إلغاء التحديد
            </Button>
          </div>
        </div>
      ) : null}

      <table id={id}>
        <thead>
          <tr>
            {activeSelection ? (
              <th className="table-select-cell">
                <input
                  aria-label={activeSelection.label || "تحديد كل الصفوف"}
                  checked={allVisibleSelected}
                  disabled={selectableKeys.length === 0}
                  ref={(input) => {
                    if (input) input.indeterminate = partiallySelected;
                  }}
                  type="checkbox"
                  onChange={toggleAllVisibleRows}
                />
              </th>
            ) : null}
            {dataColumns.map((column, index) => (
              <th key={index}>{column.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={visibleColumnCount}>{emptyMessage}</td>
            </tr>
          ) : (
            rows.map((row, rowIndex) => {
              const rowKey = getRowKey(row, rowIndex);
              const rowDisabled = activeSelection?.getRowDisabled?.(row, rowIndex) || false;
              const rowSelected = Boolean(activeSelection?.selectedKeys.includes(rowKey));

              return (
                <tr
                  key={rowKey}
                  data-selected={rowSelected || undefined}
                  {...getRowProps?.(row, rowIndex)}
                >
                  {activeSelection ? (
                    <td className="table-select-cell">
                      <input
                        aria-label="تحديد الصف"
                        checked={rowSelected}
                        disabled={rowDisabled}
                        type="checkbox"
                        onChange={() => toggleRow(rowKey)}
                      />
                    </td>
                  ) : null}
                  {dataColumns.map((column, index) => (
                    <td key={index}>{column.cell(row)}</td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      <ConfirmModal
        open={batchDeleteOpen}
        title="تأكيد حذف المحدد"
        message={
          batchDelete?.confirmText?.(batchDeleteCount) ||
          `سيتم حذف ${batchDeleteCount} سجل محدد. هل تريد المتابعة؟`
        }
        confirmLabel={batchDeleting ? "جارٍ الحذف..." : "حذف المحدد"}
        destructive
        onClose={() => {
          if (!batchDeleting) setBatchDeleteOpen(false);
        }}
        onConfirm={() => {
          void handleBatchDelete();
        }}
      />
    </>
  );
}
