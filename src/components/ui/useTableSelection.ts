import { useCallback, useMemo, useState } from "react";

export function useTableSelection<T>(
  rows: T[],
  getRowKey: (row: T, index: number) => string
) {
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

  const selectedKeySet = useMemo(() => new Set(selectedKeys), [selectedKeys]);

  const selectedRows = useMemo(
    () => rows.filter((row, index) => selectedKeySet.has(getRowKey(row, index))),
    [getRowKey, rows, selectedKeySet]
  );

  const clearSelection = useCallback(() => {
    setSelectedKeys([]);
  }, []);

  return {
    selectedKeys,
    selectedRows,
    selectedCount: selectedRows.length,
    setSelectedKeys,
    clearSelection,
  };
}
