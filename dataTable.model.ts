import { ColumnBodyOptions } from "primereact/column";
import {
  DataTableRowClassNameOptions,
  DataTableRowClickEvent,
  DataTableRowData,
  DataTableRowEvent,
  DataTableSelectionMultipleChangeEvent,
  SortOrder,
} from "primereact/datatable";

export interface IGenericDataTableProps {
  classNames?: string;
  columns: IColumn[];
  value?: any;
  actionBodyTemplate?:
    | React.ReactNode
    | ((data: any, options: ColumnBodyOptions) => React.ReactNode);
  displayCheckBoxesColumn?: boolean;
  handleRowClickEvent?: (e: any) => void;
  displayHeaderSection?: any;
  dataLoading?: boolean;
  dataKey?: string;
  exportButtons?: boolean;
  globalSearchOption?: boolean;
  globalFilterFields?: string[];
  rowHover?: boolean;
  rows?: number;
  paginator?: boolean;
  paginatorTemplate?: string;
  currentPageReportTemplate?: string;
  selectionMode?: null | "multiple" | "checkbox";
  selectedRecords?: any;
  handleCheckBoxSelectionEvent?: (
    e: DataTableSelectionMultipleChangeEvent<any>
  ) => void;
  clearFilterButton?: boolean;
  scrollable?: boolean;
  rowGroupMode?: string;
  groupRowsBy?: string;
  sortMode?: "multiple" | "single";
  sortField?: string;
  sortOrder?: undefined | null | 0 | 1 | -1;
  responsiveLayout?: "scroll" | "stack";
  rowExpansion?: any;
  rowExpansionTemplate?: any;
  scrollHeight?: string;
  headerText?: string;
  expandableRowGroups?: boolean;
  editMode?: string;
  onRowEditComplete?: any;
  onRowEditValidator?: any;
  tableStyle?: any;
  openNew?: () => void;
  headerDropdown?: {
    options: any[];
    placeholder?: string;
    initialValue?: { label: string; value: string };
  };
  handleDropdownChange?: (e: { label: string; value: any }) => void;
  rowClassName?: (
    data: DataTableRowData<any>,
    options: DataTableRowClassNameOptions<any>
  ) => object | string;
  expandedRows?: any;
  onRowToggle?: any;
  globalSearchValue?: { value: string };
  onRowExpand?: (e: DataTableRowEvent) => void;
  onRowCollapse?: (e: DataTableRowEvent) => void;
  onRowDoubleClick?: (e: DataTableRowClickEvent) => void;
  onClickIcon?: (e: any) => void;
  reorderableColumns?: boolean;
  reorderableRows?: boolean;
  onRowReorder?: (e: any) => void;
  visibleColumn?: IvisibleColumnsProps;
}
interface IvisibleColumnsProps {
  componentNameForSelectingColumns: string;
  filterService: any;
  isStoreSorting?: boolean;
}
export interface IColumn {
  field: string;
  header: string;
  sortable?: boolean;
  filter?: boolean | {};
  template?: any;
  editor?: any;
  className?: string;
  style?: any;
  hidden?: boolean;
  selectionMode?: "multiple" | "single" | undefined;
  sortOrder?: SortOrder;
}

export interface IColumnSort {
  field: string;
  order: SortOrder;
}
