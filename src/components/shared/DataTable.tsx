import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Filter, Plus } from "lucide-react";

interface DataTableProps<T> {
  data: T[];
  columns: {
    header: string;
    accessor: keyof T | ((row: T) => React.ReactNode);
  }[];
  onSearch?: (term: string) => void;
  onAdd?: () => void;
  title?: string;
  emptyMessage?: string;
}

export function DataTable<T>({ data, columns, onSearch, onAdd, title, emptyMessage }: DataTableProps<T>) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        {title && <h2 className="text-lg font-bold text-slate-900">{title}</h2>}
        <div className="flex items-center gap-2">
          {onSearch && (
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Buscar..." 
                className="pl-8" 
                onChange={(e) => onSearch(e.target.value)} 
              />
            </div>
          )}
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
          {onAdd && (
            <Button className="bg-teal-900 hover:bg-teal-950 text-white gap-2" onClick={onAdd}>
              <Plus className="h-4 w-4" /> Novo
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              {columns.map((col, i) => (
                <TableHead key={i} className="font-bold text-slate-700">
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-slate-500">
                  {emptyMessage ?? "Nenhum registro encontrado."}
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, i) => (
                <TableRow key={i}>
                  {columns.map((col, j) => (
                    <TableCell key={j}>
                      {typeof col.accessor === "function" 
                        ? col.accessor(row) 
                        : (row[col.accessor] as React.ReactNode)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
