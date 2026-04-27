import { useRef } from "react";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { Plus, Trash2, X } from "lucide-react";
import type { KnowledgeTableData } from "../types";

export const createEmptyTable = (): KnowledgeTableData => ({
  columns: ["Column 1", "Column 2"],
  rows: [["", ""]],
});

export const getColumnLabel = (index: number) => {
  let label = "";
  let value = index + 1;

  while (value > 0) {
    const remainder = (value - 1) % 26;
    label = String.fromCharCode(65 + remainder) + label;
    value = Math.floor((value - 1) / 26);
  }

  return label;
};

interface SpreadsheetEditorProps {
  data: KnowledgeTableData;
  onChange?: (data: KnowledgeTableData) => void;
  readonly?: boolean;
}

export function SpreadsheetEditor({
  data,
  onChange,
  readonly = false,
}: SpreadsheetEditorProps) {
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const updateColumnName = (index: number, value: string) => {
    if (readonly || !onChange) return;
    const columns = [...data.columns];
    columns[index] = value;
    onChange({ ...data, columns });
  };

  const updateCellValue = (rowIndex: number, colIndex: number, value: string) => {
    if (readonly || !onChange) return;
    const rows = data.rows.map((row, rIndex) =>
      rIndex === rowIndex
        ? row.map((cell, cIndex) => (cIndex === colIndex ? value : cell))
        : row,
    );
    onChange({ ...data, rows });
  };

  const addTableRow = () => {
    if (readonly || !onChange) return;
    onChange({
      ...data,
      rows: [...data.rows, Array(data.columns.length).fill("")],
    });
  };

  const addTableColumn = () => {
    if (readonly || !onChange) return;
    onChange({
      columns: [...data.columns, `Column ${data.columns.length + 1}`],
      rows: data.rows.map((row) => [...row, ""]),
    });
    setTimeout(() => {
      if (tableContainerRef.current) {
        tableContainerRef.current.scrollTo({
          left: tableContainerRef.current.scrollWidth,
          behavior: "smooth",
        });
      }
    }, 10);
  };

  const removeTableRow = (rowIndex: number) => {
    if (readonly || !onChange) return;
    onChange({
      ...data,
      rows: data.rows.length <= 1 ? data.rows : data.rows.filter((_, idx) => idx !== rowIndex),
    });
  };

  const removeTableColumn = (colIndex: number) => {
    if (readonly || !onChange) return;
    onChange({
      columns: data.columns.length <= 1 ? data.columns : data.columns.filter((_, idx) => idx !== colIndex),
      rows: data.columns.length <= 1 ? data.rows : data.rows.map((row) => row.filter((_, idx) => idx !== colIndex)),
    });
  };

  return (
    <div className="space-y-4 min-w-0 max-w-full">
      {!readonly && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-foreground">Spreadsheet editor</p>
            <p className="text-xs text-muted-foreground">Click any cell to edit like a sheet</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addTableColumn}
              className="cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              Add column
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addTableRow}
              className="cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              Add row
            </Button>
          </div>
        </div>
      )}

      <div className="border border-border rounded-lg bg-background min-w-0 max-w-full overflow-hidden">
        <div
          ref={tableContainerRef}
          className="max-h-[360px] w-full overflow-x-auto overflow-y-auto pb-2"
        >
          <table className="w-full min-w-[720px] text-sm border-collapse bg-background">
            <thead className="bg-muted/40">
              <tr>
                <th className="w-12 min-w-[48px] max-w-[48px] border border-border text-[11px] font-medium text-muted-foreground">
                  <div className="flex items-center justify-center">#</div>
                </th>
                {data.columns.map((column, colIndex) => (
                  <th
                    key={`column-${colIndex}`}
                    className="min-w-[160px] border border-border p-2"
                  >
                    <div className="flex items-center gap-2">
                      <div className="text-[10px] font-semibold text-muted-foreground">
                        {getColumnLabel(colIndex)}
                      </div>
                      <Input
                        value={column}
                        readOnly={readonly}
                        onChange={(e) => updateColumnName(colIndex, e.target.value)}
                        className={`h-8 text-xs bg-transparent border-0 rounded-none px-2 shadow-none focus-visible:ring-1 focus-visible:ring-ring ${readonly ? 'cursor-default pointer-events-none' : ''}`}
                        placeholder={`Column ${colIndex + 1}`}
                      />
                      {!readonly && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => removeTableColumn(colIndex)}
                          disabled={data.columns.length <= 1}
                          className="cursor-pointer"
                          aria-label="Remove column"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </th>
                ))}
                {!readonly && <th className="w-12 min-w-[48px] max-w-[48px] border border-border" />}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row, rowIndex) => (
                <tr key={`row-${rowIndex}`}>
                  <td className="w-12 min-w-[48px] max-w-[48px] border border-border bg-muted/30 text-center text-[11px] text-muted-foreground">
                    {rowIndex + 1}
                  </td>
                  {data.columns.map((_, colIndex) => (
                    <td
                      key={`cell-${rowIndex}-${colIndex}`}
                      className="border border-border p-0"
                    >
                      <Input
                        value={row[colIndex] ?? ""}
                        readOnly={readonly}
                        onChange={(e) => updateCellValue(rowIndex, colIndex, e.target.value)}
                        className={`h-9 text-xs bg-transparent border-0 rounded-none px-2 shadow-none focus-visible:ring-1 focus-visible:ring-ring ${readonly ? 'cursor-default pointer-events-none' : ''}`}
                        placeholder=""
                      />
                    </td>
                  ))}
                  {!readonly && (
                    <td className="w-12 min-w-[48px] max-w-[48px] border border-border p-1 text-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => removeTableRow(rowIndex)}
                        disabled={data.rows.length <= 1}
                        className="cursor-pointer"
                        aria-label="Remove row"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {!readonly && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {data.rows.length} rows • {data.columns.length} columns
          </span>
          <span>Values will be saved as JSON</span>
        </div>
      )}
    </div>
  );
}
