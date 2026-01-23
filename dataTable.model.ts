import { FilterMatchMode } from "primereact/api";
import {
  ColumnBodyOptions,
  ColumnFilterElementTemplateOptions,
  ColumnEvent,
} from "primereact/column";

import {
  DataTablePageEvent,
  DataTableRowClassNameOptions,
  DataTableRowClickEvent,
  DataTableRowData,
  DataTableRowEvent,
  DataTableSelectionMultipleChangeEvent,
  SortOrder,
  DataTableDataSelectableEvent,
} from "primereact/datatable";

export interface IGenericDataTableProps {
  classNames?: string;
  columns: IColumn[];
  value?: any;
  setCustomFilter?: (value: string, filter: any) => Boolean;
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
  printPdf?: {
    leftCornerDataPrint?: any;
    companyLogoBase64?: string | null;
    currentUser?: any;
    printedDate?: string;
    tableName?: string;
    tableHeaderBackgroundColor?: string;
  };
  paginator?: boolean;
  paginatorTemplate?: string;
  currentPageReportTemplate?: string;
  selectionMode?: null | "multiple" | "checkbox";
  selectedRecords?: any;
  handleCheckBoxSelectionEvent?: (
    e: DataTableSelectionMultipleChangeEvent<any>,
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
    options: DataTableRowClassNameOptions<any>,
  ) => object | string;
  expandedRows?: any;
  onRowToggle?: any;
  globalSearchValue?: { value: string; globalSearchThreshold?: number };
  onRowExpand?: (e: DataTableRowEvent) => void;
  onRowCollapse?: (e: DataTableRowEvent) => void;
  onRowDoubleClick?: (e: DataTableRowClickEvent) => void;
  onClickIcon?: (e: any) => void;
  onRowEditInit?: (e: DataTableRowEvent) => void;
  reorderableColumns?: boolean;
  reorderableRows?: boolean;
  onRowReorder?: (e: any) => void;
  visibleColumn?: IvisibleColumnsProps;
  entityName?: string;
  setDocumentCount?: (count: number) => void;
  isRowSelectable?: (e: DataTableDataSelectableEvent) => boolean;
  setFilterSearch?: (filterSearch: any) => void;
  onPageChange?: (event: DataTablePageEvent) => void;
  totalCount?: number;
  page?: number;
  transformPrimeNgFilterObjectToArray?: (filters: any) => any[];
  onClickReadingReceipt?: (data: any) => void;
  rowGroupHeaderTemplate?: (data: any) => React.ReactNode;
  rowGroupFooterTemplate?: (data: any) => React.ReactNode;
  paginatorPosition?: "top" | "bottom" | "both";
  onClickFilter?: () => void;
  showFilterButton?: boolean;
  customClassName?: any;
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
  filterMatchMode?: FilterMatchMode | undefined;
  hidden?: boolean;
  selectionMode?: "multiple" | "single" | undefined;
  sortOrder?: SortOrder;
  showFilterMenu?: boolean;
  showFilterMatchModes?: boolean;
  maxConstraints?: number;
  filterElement?:
    | React.ReactNode
    | ((options: ColumnFilterElementTemplateOptions) => React.ReactNode);
  onCellEditComplete?: (e: ColumnEvent) => void;
}

export interface IColumnSort {
  field: string;
  order: SortOrder;
}
