import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable, DataTableStateEvent } from "primereact/datatable";
import { InputText } from "primereact/inputtext";
import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  IColumn,
  IColumnSort,
  IGenericDataTableProps,
} from "./dataTable.model";
import { FilterMatchMode, FilterOperator, FilterService } from "primereact/api";
import autoTable from "jspdf-autotable";
import AppButton from "../button/AppButton";
import { MultiSelectChangeEvent } from "primereact/multiselect";
import { AutoComplete } from "primereact/autocomplete";
import { Skeleton } from "primereact/skeleton";
import _ from "lodash";
import { useTranslation } from "react-i18next";
import Fuse from "fuse.js";
import { classNames as conditionClassNames } from "primereact/utils";
import noResultFoundImage from "./no-result-found.png";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { capitalizeFirstLetter } from "../../../library/utilities/helperFunction";
import { ColumnsIcon, SlidersHorizontalIcon } from "@phosphor-icons/react";
const FILTER_LEVELS = {
  NORMAL_SEARCH: 0.05,
  WILD_SEARCH: 0.3,
};

// Helper function to apply column filters to data manually
const applyColumnFilters = (data: any[], filters: any, filterFields: string[]): any[] => {
  try {
    if (!data || data.length === 0) return data || [];
    if (!filters || !filterFields || filterFields.length === 0) return data;
    
    return data.filter((item) => {
      if (!item) return false;
      
      return filterFields.every((field) => {
        try {
          const filter = filters[field];
          if (!filter) return true;
          
          const itemValue = _.get(item, field);
          
          // Handle constraints-based filters
          if (filter.constraints && Array.isArray(filter.constraints)) {
            return filter.constraints.every((constraint: any) => {
              try {
                if (constraint.value === null || constraint.value === undefined || constraint.value === '') {
                  return true;
                }
                const matchMode = constraint.matchMode as keyof typeof FilterService.filters;
                const filterFn = FilterService.filters[matchMode];
                if (typeof filterFn !== 'function') return true;
                return filterFn(itemValue, constraint.value) ?? true;
              } catch {
                return true; // Don't filter out on error
              }
            });
          }
          
          if (filter.value !== null && filter.value !== undefined) {
            if (filter.matchMode === 'treeColumnFilter') {
              return true; // Custom filter handled elsewhere
            }
            try {
              const matchMode = (filter.matchMode || FilterMatchMode.CONTAINS) as keyof typeof FilterService.filters;
              const filterFn = FilterService.filters[matchMode];
              if (typeof filterFn !== 'function') return true;
              return filterFn(itemValue, filter.value) ?? true;
            } catch {
              return true;
            }
          }
          
          return true;
        } catch {
          return true; 
        }
      });
    });
  } catch (error) {
    return data || []; 
  }
};
import { BsReceiptCutoff } from "react-icons/bs";
import { OverlayPanel } from "primereact/overlaypanel";
import { Checkbox } from "primereact/checkbox";
const SORT_MODE_MULTIPLE = "multiple";

const GenericDataTable = (props: IGenericDataTableProps) => {
  const { t } = useTranslation();
  const {
    setCustomFilter,
    classNames,
    columns,
    value,
    displayCheckBoxesColumn,
    handleRowClickEvent,
    actionBodyTemplate,
    displayHeaderSection,
    dataLoading,
    dataKey,
    exportButtons = true,
    globalSearchOption,
    clearFilterButton = true,
    globalFilterFields,
    rowHover,
    rows,
    paginator,
    currentPageReportTemplate,
    selectionMode,
    selectedRecords,
    handleCheckBoxSelectionEvent,
    isRowSelectable,
    scrollable,
    scrollHeight,
    rowGroupMode,
    groupRowsBy,
    sortMode,
    sortField,
    sortOrder,
    responsiveLayout,
    rowExpansion,
    rowExpansionTemplate,
    headerText,
    expandableRowGroups,
    editMode,
    onRowEditComplete,
    onRowEditValidator,
    tableStyle,
    openNew,
    rowClassName,
    expandedRows,
    onRowToggle,
    headerDropdown,
    handleDropdownChange,
    globalSearchValue,
    onRowDoubleClick,
    onRowEditInit,
    onRowExpand,
    onRowCollapse,
    onClickIcon,
    reorderableColumns,
    reorderableRows,
    onRowReorder,
    visibleColumn,
    printPdf,
    entityName,
    setDocumentCount,
    setFilterSearch,
    onPageChange,
    totalCount,
    page,
    transformPrimeNgFilterObjectToArray,
    onClickReadingReceipt,
    rowGroupHeaderTemplate,
    rowGroupFooterTemplate,
    paginatorPosition,
    onClickFilter,
    showFilterButton,
    customClassName,
    isShowTotalRecordCountInHeader = true,
    headerColumnGroup,
  } = props;

  const {
    printedDate,
    currentUser,
    leftCornerDataPrint,
    companyLogoBase64,
    tableName,
    tableHeaderBackgroundColor,
  } = printPdf || {};

  if (setCustomFilter) {
    FilterService.register("treeColumnFilter", (value: any, filter: any) => {
      const isMatchFilter = Boolean(setCustomFilter(value, filter));
      return isMatchFilter;
    });
  }
  const {
    componentNameForSelectingColumns,
    filterService,
    isStoreSorting = false,
  } = visibleColumn || {};

  const [filters, setFilters] = useState({
    global: {
      operator: FilterOperator.OR,
      constraints: [
        { value: null, matchMode: FilterMatchMode.CONTAINS, filterFields: [] },
      ],
    },
  });
  const dt = useRef<any>(null);
  const manageColumnsPanelRef = useRef<OverlayPanel | null>(null);
  const [rowsExpanded, setRowsExpanded] = useState<any>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [suggestionsList, setSuggestionsList] = useState<any>(null);
  const [visibleColumns, setVisibleColumns] = useState<IColumn[]>([]);
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [isManageColumnsOpen, setIsManageColumnsOpen] = useState(false);
  const [columnFilterData, setColumnFilterData] = useState([])
  const [globalSearchThreshold, setGlobalSearchThreshold] = useState(
    FILTER_LEVELS.NORMAL_SEARCH,
  );
  // State for column search and select all
  const [columnSearchValue, setColumnSearchValue] = useState("");
  const allColumnsSelected = columns
    .filter((col) => col.hidden !== true)
    .every((col) => visibleColumns.some((vc: any) => vc.field === col.field));

  const toggleSelectAllColumns = () => {
    const filteredColumns = columns.filter((col) => col.hidden !== true);
    if (allColumnsSelected) {
      setVisibleColumns([]);
      onColumnToggle({ value: [] } as unknown as MultiSelectChangeEvent);
    } else {
      setVisibleColumns(filteredColumns);
      onColumnToggle({
        value: filteredColumns,
      } as unknown as MultiSelectChangeEvent);
    }
  };
  const [selectedSortData, setSelectedSortData] = useState<IColumnSort>({
    field: sortField ?? columns[0]?.field,
    order: sortOrder ?? 1,
  });
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [multiSortMeta, setMultiSortMeta] = useState<IColumnSort[]>([]);
  const [first, setFirst] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(rows ?? 30);
  const [selectedRecordId, setSelectedRecordId] = useState<number | null>(null);
  useEffect(() => {
    if (rows !== undefined && rows !== null) {
      setRowsPerPage(rows);
    }
  }, [rows]);

  useEffect(() => {
    if (page !== undefined && page !== null && rowsPerPage) {
      setFirst(page * rowsPerPage);
    }
  }, [page, rowsPerPage]);

  const setDataTableValueBouncing = useRef<any>(
    _.debounce((componentName, columns) => {
      filterService?.getComponentValue(componentName).then((res: any) => {
        if (res && res.length > 0) {
          updateVisibleColumns(res, columns);

          const selectedSortField = res.find((col: IColumn) => col?.sortOrder);
          if (selectedSortField) {
            setSelectedSortData({
              field: selectedSortField?.field,
              order: selectedSortField?.sortOrder,
            });
          }
        } else {
          setVisibleColumns(columns);
        }
      });
    }, 250),
  );
  const updateVisibleColumns = (res: IColumn[], columns: IColumn[]) => {
    let cols = columns.filter((col: IColumn) =>
      res.some((resCol: IColumn) => resCol.field === col.field),
    );
    setVisibleColumns(cols);
  };
  const customGlobalFilter = (data: any[], value: string) => {
    try {
      if (!data || !Array.isArray(data)) return [];
      if (!value || typeof value !== 'string') return data;
      
      const distance = 2000 / globalSearchThreshold;
      const fuseOptionsForGlobalFilter = {
        keys:
          globalFilterFields || dynamicColumns?.map((col) => col?.props?.field).filter(Boolean) || [],
        includeScore: true,
        threshold: globalSearchThreshold,
        distance: distance,
      };

      const fuse = new Fuse(data, fuseOptionsForGlobalFilter);
      const searchData = fuse.search(value).map((data) => data.item);
      setDocumentCount && setDocumentCount(searchData.length);
      return searchData;
    } catch (error) {
      return data || []; 
    }
  };

  const bodyTemplate = () => {
    return <Skeleton className="my-2"></Skeleton>;
  };

  //Columns filter
  const columnsFilter = useMemo(() => {
    const filters: any = {};
    visibleColumns.forEach((col) => {
      if (col.filter && col.field) {
        filters[col.field] =
          typeof col.filter === "object"
            ? col.filter
            : {
                operator: FilterOperator.AND,
                constraints: [
                  { value: null, matchMode: FilterMatchMode.CONTAINS },
                ],
              };
      }
    });
    return filters;
  }, [visibleColumns]);

  // Update filters state with Columns filter
  useEffect(() => {
    setFilters((prev: any) => {
      return {
        ...prev,
        ...columnsFilter,
      };
    });
  }, [columnsFilter]);

  const dynamicColumns = useMemo(() => {
    if (visibleColumns) {
      const dynamicColumn = visibleColumns?.map((col) => {
        const isActiveSort = selectedSortData.field === col.field;
        return (
          <Column
            key={col.field}
            className={`${col.className} `}
            selectionMode={col?.selectionMode}
            style={col.style}
            field={col.field}
            header={col.header}
            sortable={col.sortable !== false}
            filter={col.filter !== false}
            filterField={col.field}
            body={dataLoading ? bodyTemplate : col.template}
            editor={col.editor}
            hidden={col.hidden}
            filterElement={col?.filterElement}
            filterMatchMode={col?.filterMatchMode}
            showFilterMatchModes={col.showFilterMatchModes}
            maxConstraints={col.maxConstraints}
            onCellEditComplete={col?.onCellEditComplete}
            headerStyle={
              isActiveSort ? { color: "#EC1241", fontWeight: 600 } : {}
            }
            pt={{
              sortIcon: {
                style: isActiveSort ? { color: "#EC1241" } : {},
              },
            }}
          />
        );
      });
      return dynamicColumn;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleColumns, selectedSortData, dataLoading]);

  const isColumnDefined = !!(dynamicColumns && dynamicColumns.length > 0);

  useEffect(() => {
    if (columns) {
      if (
        componentNameForSelectingColumns &&
        componentNameForSelectingColumns !== undefined &&
        filterService
      ) {
        setDataTableValueBouncing.current(
          componentNameForSelectingColumns,
          columns,
        );
      } else {
        setVisibleColumns(columns);
      }
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns, componentNameForSelectingColumns]);

  useEffect(() => {
    initFilters();
    if (sortField && sortMode === SORT_MODE_MULTIPLE) {
      setMultiSortMeta([
        {
          field: sortField,
          order: sortOrder,
        },
      ]);
    }
  }, []);

  useEffect(() => {
    setGlobalFilterValue(globalSearchValue?.value ?? "");

    if (globalSearchValue?.globalSearchThreshold) {
      setGlobalSearchThreshold(globalSearchValue?.globalSearchThreshold);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globalSearchValue?.value, globalSearchValue?.globalSearchThreshold]);

  const initFilters = () => {
    const generateFilters: any = {};
    columns.forEach((f) => {
      generateFilters[f.field] =
        typeof f.filter === "object"
          ? f.filter
          : {
              operator: FilterOperator.AND,
              constraints: [
                { value: null, matchMode: FilterMatchMode.CONTAINS },
              ],
            };
    });
    setFilters((prev: any) => {
      return {
        ...prev,
        ...generateFilters,
      };
    });
  };
  const createFilterObject = (filter: any) => {
    return typeof filter === "object"
      ? filter
      : {
          operator: FilterOperator.AND,
          constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }],
        };
  };

  const clearAllFilter = () => {
    const generateFilters: any = {};

    columns.forEach((f) => {
      generateFilters[f.field] = createFilterObject(f.filter);
    });
    setFilters((prev: any) => {
      return {
        ...prev,
        ...generateFilters,
      };
    });
    setFilterSearch && setFilterSearch([]);
  };

  const clearFilter = () => {
    clearAllFilter();
  };

  const resetFilter = () => {
    clearAllFilter();
    setGlobalFilterValue("");
  };

  const getFilterValue = (filters: any) => {
    const filterValue: any = [];
    visibleColumns.forEach((col) => {
      if (col.field) {
        filters[col.field]?.constraints?.forEach((constraint: any) => {
          if (constraint.value !== null) {
            filterValue.push(`${col.header}: ${constraint.value}`);
          }
        });
        if (filters[col.field].matchMode === "treeColumnFilter") {
          filters[col.field]?.value?.forEach((key: any) => {
            filterValue.push(`${col.header}: ${key.name}`);
          });
        }
      }
    });
    if (globalFilterValue) {
      filterValue.push(
        `${t("components.genericDataTable.globalSearch")}: ${globalFilterValue}`,
      );
    }
    return filterValue.length > 0 ? filterValue.join(", ") : null;
  };
  let top = 0;
  const addMetaData = (
    doc: any,
    tableName: string,
    pageNumber: number,
    pageCount: number,
    img: HTMLImageElement | null,
    imgWidth: number,
    imgHeight: number,
  ) => {
    if (leftCornerDataPrint && Object.entries(leftCornerDataPrint).length > 0) {
      doc.setFontSize(10);
      doc.text(tableName, 280, top, {
        align: "right",
      });
      top += 5;
      Object.entries(leftCornerDataPrint).forEach(([key, value]) => {
        doc.text(`${key}: ${value}`, 280, top, { align: "right" });
        top += 5;
      });
    } else {
      const date = new Date().toLocaleString();
      doc.setFontSize(10);
      doc.text(tableName, 280, top, {
        align: "right",
      });
      top += 5;
      doc.text(
        `${t("components.genericDataTable.printed")}: ${date}`,
        280,
        top,
        {
          align: "right",
        },
      );
      top += 5;
    }
    if (img) {
      addCompanyLogoToDocument(doc, img, imgWidth, imgHeight);
    }
    doc.setFontSize(10);
    doc.setPage(pageNumber);
    const str = `${t("components.genericDataTable.pages", {
      page: String(pageNumber),
      pages: String(pageCount),
    })}`;
    doc.text(str, 280, top, {
      align: "right",
    });
  };
  const addCompanyLogoToDocument = (
    doc: any,
    img: any,
    scaledWidth: any,
    scaledHeight: any,
  ) => {
    doc.addImage(img, "PNG", 15, 6, scaledWidth, scaledHeight);
  };
  const findMarginTop = () => {
    let marginTop = 22;
    if (leftCornerDataPrint) {
      Object.values(leftCornerDataPrint).forEach(() => {
        marginTop += 5;
      });
    }
    return leftCornerDataPrint ? marginTop : 27;
  };
  const imageDimensions = (image: any) => {
    const MAX_LOGO_WIDTH = 50;
    const MAX_LOGO_HEIGHT = 20;
    if (image) {
      const imageWidth = image?.width;
      const imageHeight = image?.height;
      // Calculate the aspect ratio of the image
      const aspectRatio = imageWidth / imageHeight;
      // Calculate the scaled dimensions to fit within the given height and width
      let scaledWidth, scaledHeight;
      if (MAX_LOGO_WIDTH / MAX_LOGO_HEIGHT > aspectRatio) {
        scaledWidth = MAX_LOGO_HEIGHT * aspectRatio;
        scaledHeight = MAX_LOGO_HEIGHT;
      } else {
        scaledWidth = MAX_LOGO_WIDTH;
        scaledHeight = MAX_LOGO_WIDTH / aspectRatio;
      }
      return { scaledWidth, scaledHeight };
    }
  };

  const savePdf = (parsedColumns: any, data: any, logo?: string) => {
    import("jspdf").then((jsPDF) => {
      import("jspdf-autotable").then(async () => {
        const doc = new jsPDF.default("l", "mm", "a4");
        const img = new Image();
        let imgWidth: number = 0;
        let imgHeight: number = 0;
        if (logo) {
          img.src = logo;
        }
        await new Promise((resolve) => {
          if (logo) {
            img.onload = () => {
              const dimensions: any = imageDimensions(img);
              imgWidth = dimensions?.scaledWidth ?? 0;
              imgHeight = dimensions?.scaledHeight ?? 0;
              resolve(dimensions);
            };
          } else {
            resolve({ scaledWidth: 0, scaledHeight: 0 });
          }
        });
        let marginTop: number = findMarginTop();
        const filterValue = getFilterValue(filters);
        if (filterValue) {
          doc.setFontSize(10);
          marginTop += 3;
          doc.text(filterValue, 15, marginTop);
          marginTop += 5;
        }

        autoTable(doc, {
          head: [parsedColumns?.map((col: any) => col?.title)],
          body: data,
          margin: { top: marginTop },
          headStyles: { fillColor: tableHeaderBackgroundColor || "#2980b9" },
        });

        // ✅ Now total pages are known
        const totalPages = doc.getNumberOfPages();

        for (let page = 1; page <= totalPages; page++) {
          top = 15;
          addMetaData(
            doc,
            headerText ?? "",
            page, // current page
            totalPages, // total pages
            logo ? img : null,
            imgWidth,
            imgHeight,
          );
        }

        doc.save(`${tableName ?? "dataTable"}.pdf`);
      });
    });
  };

  const exportPdf = (filteredData: any) => {
    try {
      const parsedColumns = visibleColumns.map((column: IColumn) => ({
        title: capitalizeFirstLetter(column?.header),
        dataKey: column.field,
      }));
      const visibleColumnsData = getVisibleColumnsListData(filteredData || []);
      if (companyLogoBase64) {
        savePdf(parsedColumns, visibleColumnsData, companyLogoBase64);
      } else {
        savePdf(parsedColumns, visibleColumnsData);
      }
    } catch (error) {
      console.error('Error in exportPdf:', error);
    }
  };
  const exportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(tableName || "Data");
    const headers = visibleColumns.map((col) => col.header);
    const printCreatedBy = `${currentUser?.first_name} ${currentUser?.last_name}`;
    const visibleColumnsData = getVisibleColumnsListData(filteredData);
    const filterValue = getFilterValue(filters);
    let insertionIndex = 1;
    if (leftCornerDataPrint) {
      for (const [key, value] of Object.entries(leftCornerDataPrint)) {
        worksheet.addRow([`${key}:`, `${value}`]);
        insertionIndex++;
      }
    } else {
      worksheet.addRow([
        `${t("components.genericDataTable.printed")}:`,
        `${printedDate}`,
      ]);
      insertionIndex++;
      worksheet.addRow([
        `${t("components.genericDataTable.printedBy")}:`,
        ` ${printCreatedBy}`,
      ]);
      insertionIndex++;
    }
    if (filterValue) {
      worksheet.insertRow(insertionIndex + 1, [filterValue]);
      insertionIndex++;
    }
    if (tableName) {
      worksheet.insertRow(1, [tableName]);
      insertionIndex++;
    }
    worksheet.addRow([]); // empty row before headers
    worksheet.addRow(headers);
    visibleColumnsData.forEach((row: any) => {
      worksheet.addRow(row);
    });
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `${tableName ?? "dataTable"}.xlsx`);
  };

  const getVisibleColumnsListData = (columns: IColumn[]) => {
    const data: any = [];
    if (columns) {
      columns?.forEach((row: any) => {
        const rowData: any = [];
        visibleColumns.forEach((column) => {
          const title = column.field;
          const data = _.get(row, title);
          if (data && typeof data === "object" && data !== null) {
            rowData.push(Array.isArray(data) ? data.join(", ") : "");
          } else {
            rowData.push(data);
          }
        });
        data.push(rowData);
      });
    }
    return data;
  };

  const updateSortOrder = (columns: IColumn[], sortData: IColumnSort) => {
    return columns.map((col) => {
      if (col.field === sortData.field) {
        return {
          field: col.field,
          header: col.header,
          sortOrder: sortData.order,
        };
      }
      return col;
    });
  };

  const onColumnToggle = (event: MultiSelectChangeEvent) => {
    const selectedColumns = event.value;

    let orderedSelectedColumns = columns.filter((col) =>
      selectedColumns.some((sCol: any) => sCol.field === col.field),
    );
    setVisibleColumns(orderedSelectedColumns);

    if (
      orderedSelectedColumns.some((col) => col.field !== selectedSortData.field)
    ) {
      setSelectedSortData({
        field: sortField ?? orderedSelectedColumns[0]?.field,
        order: sortOrder ?? 1,
      });
    }

    // Update the sort order of the selected columns for the store in database
    if (isStoreSorting) {
      orderedSelectedColumns = updateSortOrder(
        orderedSelectedColumns,
        selectedSortData,
      );
    }

    componentNameForSelectingColumns &&
      filterService?.setComponentValue(
        componentNameForSelectingColumns,
        orderedSelectedColumns,
      );
  };

  function applySingleSortFilter(
    filters: any[] = [],
    sort: { field: string; order: "ASC" | "DESC" | number },
  ): any[] {
    const sortField = sort.field;
    const sortOrder = sort.order;

    const updated = filters.map((item) => {
      if (item.field === sortField) {
        return { ...item, order: sortOrder };
      }
      const { order, ...rest } = item;
      return rest;
    });
    const exists = updated.some((item) => item.field === sortField);
    if (!exists) {
      updated.push({
        field: sortField,
        order: sortOrder,
      });
    }
    return updated;
  }

  const buildUpdatedFilters = (
    filters: any,
    sortField: string | undefined,
    sortOrder: 1 | 0 | -1 | null | undefined,
    globalFilterValue: string,
    visibleColumns: { field: string }[],
  ) => {
    const transformedFilters =
      transformPrimeNgFilterObjectToArray?.(filters) || [];

    const updatedFilters = applySingleSortFilter(transformedFilters, {
      field: sortField ?? "id",
      order: sortOrder === 1 ? "ASC" : "DESC",
    });

    if (globalFilterValue) {
      updatedFilters.push({
        field: "global",
        operator: FilterOperator.AND,
        constraints: [
          {
            value: globalFilterValue,
            matchMode: FilterMatchMode.CONTAINS,
            filterFields: visibleColumns.map((col) => col.field),
          },
        ],
      });
    }

    return updatedFilters;
  };

  const onSort = (e: DataTableStateEvent) => {
    if (e.multiSortMeta) {
      setMultiSortMeta(e.multiSortMeta);
    }
    setSelectedSortData({ field: e.sortField, order: e.sortOrder });

    const updatedFilters = buildUpdatedFilters(
      filters,
      e.sortField,
      e.sortOrder,
      globalFilterValue,
      visibleColumns,
    );

    setFilterSearch?.(updatedFilters);

    if (isStoreSorting) {
      const columnsWithUpdatedSortOrder = updateSortOrder(visibleColumns, {
        field: e.sortField,
        order: e.sortOrder,
      });
      componentNameForSelectingColumns &&
        filterService?.setComponentValue(
          componentNameForSelectingColumns,
          columnsWithUpdatedSortOrder,
        );
    }
  };

  const onFilter = (e: DataTableStateEvent) => {
    const updatedFilters = buildUpdatedFilters(
      e.filters,
      selectedSortData?.field,
      selectedSortData?.order,
      globalFilterValue,
      visibleColumns,
    );

    setFilterSearch?.(updatedFilters);
    
    setFilters((prev) => {
      return {
        ...prev,
        ...e.filters,
      };
    });
  };

  const searchList = (event: { query: string }) => {
    setTimeout(() => {
      let _suggestionsList: any;

      if (!event.query.trim().length) {
        if (headerDropdown?.options) {
          _suggestionsList = [...(headerDropdown?.options ?? [])];
        }
      } else {
        // eslint-disable-next-line
        _suggestionsList = headerDropdown?.options?.filter((list: any) => {
          if (list?.label.toLowerCase().startsWith(event.query.toLowerCase())) {
            return list?.label
              .toLowerCase()
              .startsWith(event.query.toLowerCase());
          }
        });
      }
      setSuggestionsList(_suggestionsList);
    }, 250);
  };
  const tooltipOptions: any = {
    position: "bottom",
    style: {
      fontSize: "0.8rem",
    },
  };

  const isNormalIntensity = () => {
    return globalSearchThreshold === FILTER_LEVELS.NORMAL_SEARCH;
  };
  const debounceTimeoutRef = useRef<any>(null);
  const handleGlobalSearch = (value: string) => {
    const transformed = transformPrimeNgFilterObjectToArray?.(filters);
    // Remove duplicate 'global' field if already present in transformed
    if (transformed) {
      const filteredTransformed = transformed?.filter(
        (item: any) => item.field !== "global",
      );
      const updatedFilters = applySingleSortFilter(filteredTransformed || [], {
        field: selectedSortData?.field,
        order: selectedSortData?.order === 1 ? "ASC" : "DESC",
      });

      setFilterSearch?.([
        {
          field: "global",
          operator: FilterOperator.AND,
          constraints: [
            {
              value: value,
              matchMode: FilterMatchMode.CONTAINS,
              filterFields: visibleColumns.map((col) => col.field),
            },
          ],
        },
        ...updatedFilters,
      ]);
    }
  };
  const handleColumnSwitchToggle = (column: IColumn, isVisible: boolean) => {
    let selectedColumns: IColumn[];

    if (isVisible) {
      // hide this column
      selectedColumns = visibleColumns.filter((c) => c.field !== column.field);
    } else {
      // show this column; keep original order from `columns`
      const visibleSet = new Set(visibleColumns.map((c) => c.field));
      visibleSet.add(column.field);

      selectedColumns = columns.filter((c) => visibleSet.has(c.field));
    }

    if (!selectedColumns.length) return;

    onColumnToggle({
      value: selectedColumns,
    } as unknown as MultiSelectChangeEvent);
  };

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    try {
      return Object.keys(filters || {}).some(key => {
        if (key === 'global') return false;
        const filter = (filters as any)?.[key];
        if (!filter) return false;
        return filter?.constraints?.some((c: any) => c?.value !== null && c?.value !== undefined && c?.value !== '') || 
               (filter?.value && (Array.isArray(filter.value) ? filter.value.length > 0 : true));
      });
    } catch {
      return false;
    }
  }, [filters]);

  // Use filtered data length when filters are active, otherwise use totalCount prop
  const totalRecordCount = (!totalCount  ? filteredData?.length : totalCount);
    
  const header = (
    <div className="flex flex-row flex-wrap align-items-center justify-content-between px-3 py-2">
      {/* LEFT: TITLE + COUNT PILL */}
      {headerText !== undefined && (
        <div className="flex align-items-center gap-2 mb-2 md:mb-0">
          <span className="font-bold text-lg capitalize-first">
            {headerText}
          </span>

          {isShowTotalRecordCountInHeader &&
            typeof totalRecordCount === "number" && (
              <span
                className="
              inline-flex
              align-items-center
              px-2
              py-1
              border-round-lg
              text-xs
              font-medium
            "
                style={{
                  backgroundColor: "var(--primary-color)",
                  color: "var(--primary-color-text)",
                }}>
                {`${totalRecordCount.toLocaleString()} ${
                  entityName ?? "Items"
                }`}
              </span>
            )}
        </div>
      )}
      <div className="flex justify-content-between">
        {headerDropdown && handleDropdownChange && (
          <AutoComplete
            value={selectedItem ?? headerDropdown?.initialValue}
            suggestions={suggestionsList}
            completeMethod={searchList}
            field="label"
            dropdown
            dropdownAriaLabel="Select Item"
            placeholder={headerDropdown?.placeholder ?? "Select Item"}
            onChange={(e) => {
              setSelectedItem(e.value);
            }}
            onSelect={(e) => {
              setSelectedItem(e.value);
              handleDropdownChange(e.value);
            }}
            onBlur={(e) => {
              if (e.target.value !== "") {
                setSelectedItem(null);
              }
            }}
            className="m-2"
          />
        )}
      </div>
      {/* RIGHT: ACTIONS + SEARCH */}
      <div className="flex flex-wrap align-items-center justify-content-end gap-2">
        {/* MANAGE COLUMNS (Figma-style red button + overlay with switches) */}
        {/* CLEAR FILTER */}
        {clearFilterButton !== false && (
          <Button
            type="button"
            icon="pi pi-filter-slash"
            tooltip="Clear filter"
            tooltipOptions={tooltipOptions}
            className="p-button-outlined p-button-secondary"
            onClick={clearFilter}
          />
        )}
        {/* EXPORT BUTTONS */}
        {exportButtons !== false && (
          <>
            <Button
              type="button"
              icon="pi pi-file-excel"
              onClick={exportExcel}
              className="p-button-outlined p-button-secondary"
              tooltip="XLS"
              tooltipOptions={tooltipOptions}
            />
            <Button
              type="button"
              icon="pi pi-file-pdf"
              onClick={() => exportPdf(filteredData)}
              className="p-button-outlined p-button-secondary"
              tooltip="PDF"
              tooltipOptions={tooltipOptions}
            />
          </>
        )}
        {/* READING RECEIPT (only if passed) */}
        {onClickReadingReceipt && (
          <Button
            type="button"
            tooltip="Reading receipt"
            icon={<BsReceiptCutoff />}
            tooltipOptions={tooltipOptions}
            className="p-button-outlined p-button-secondary"
            onClick={() =>
              onClickReadingReceipt((filteredData || []).map((item) => item?.id).filter(Boolean))
            }
          />
        )}
        {/* ADD BUTTON (plus icon) */}
        {openNew && (
          <div>
            <AppButton type="Add" onClick={openNew} />
          </div>
        )}
        {/* SEARCH BOX (matches Figma layout you showed) */}

        {globalSearchOption !== false && (
          <div className="w-full lg:max-w-26rem lg:w-auto md:w-auto sm:w-auto mt-2 md:mt-0 md:ml-2">
            <div
              className={`flex align-items-center w-full border-1 border-round-lg surface-0 border-gray-300 md:my-2 ${customClassName?.searchField ?? ""}`}>
              <span className="p-input-icon-left flex-1 ">
                <i className="pi pi-search text-sm md:text-base" />
                <InputText
                  value={globalFilterValue}
                  placeholder={t("components.genericDataTable.placeholder")}
                  className="p-inputtext-md md:p-inputtext-lg w-full border-none shadow-none text-lg"
                  onChange={(e) => {
                    try {
                      const newValue = e.target.value;
                      setGlobalFilterValue(newValue);

                      if (debounceTimeoutRef.current) {
                        clearTimeout(debounceTimeoutRef.current);
                      }
                      debounceTimeoutRef.current = setTimeout(() => {
                        handleGlobalSearch(newValue);
                      }, 1000);             
                      
                      if(newValue) {
                        // Apply global search to data (use columnFilterData if column filters are active)
                        const dataToFilter = (columnFilterData && columnFilterData.length > 0) ? columnFilterData : (value || []);
                        setFilteredData(customGlobalFilter(dataToFilter, newValue));
                      } else if (hasActiveFilters) {
                        // Global search cleared but column filters are active
                        // Manually apply column filters to original data
                        const filterFields = visibleColumns.map(col => col.field).filter(Boolean);
                        const columnFiltered = applyColumnFilters(value || [], filters, filterFields);
                        setFilteredData(columnFiltered);
                        setColumnFilterData(columnFiltered as any);
                      } else {
                        // No column filters, no global search - show all data
                        setFilteredData(value || []);
                      }
                    } catch (error) {
                      console.error('Error in global search onChange:', error);
                      // Reset to safe state on error
                      setFilteredData(value || []);
                    }
                  }}
                />
              </span>

              {/* RIGHT: SQUARE ASTERISK BOX */}
              <div
                className={conditionClassNames(
                  "flex align-items-center justify-content-center m-1",
                )}
                style={{ height: "100%" }}>
                <Button
                  type="button"
                  icon="pi pi-asterisk"
                  className={conditionClassNames("p-button-sm", {
                    // normal mode: subtle, text-style
                    "p-button-outlined shadow-none text-sm":
                      isNormalIntensity(),
                  })}
                  tooltip={
                    !isNormalIntensity()
                      ? `Wildcard search OFF
                    Matches partial keywords (e.g., "Joh" → "Johnson")`
                      : `Wildcard search ON 
                    Matches partial keywords (e.g., "Joh" → "Johnson")`
                  }
                  tooltipOptions={{ position: "bottom" }}
                  onClick={() => {
                    setGlobalSearchThreshold(
                      isNormalIntensity()
                        ? FILTER_LEVELS.WILD_SEARCH
                        : FILTER_LEVELS.NORMAL_SEARCH,
                    );
                  }}></Button>
              </div>
            </div>
          </div>
        )}
        {componentNameForSelectingColumns && filterService && (
          <>
            {/* Figma-style red Manage Columns button */}
            <Button
              type="button"
              label="Manage Columns"
              icon={<ColumnsIcon size={16} weight="bold" />}
              iconPos="left"
              className={conditionClassNames("p-button-lg text-base py-2", {
                "p-button-outlined": !isManageColumnsOpen,
              })}
              onClick={(e) => {
                manageColumnsPanelRef.current?.toggle(e);
                setIsManageColumnsOpen(true);
              }}
            />

            {/* Overlay with switches, but using MultiSelect logic under the hood */}
            <OverlayPanel
              ref={manageColumnsPanelRef}
              dismissable
              onHide={() => setIsManageColumnsOpen(false)}>
              <div className="p-divider p-component p-divider-horizontal mb-1" />

              <div
                className="flex flex-column gap-2"
                style={{
                  minWidth: "220px",
                  maxHeight: "260px",
                  overflowY: "auto",
                  paddingRight: "0.5rem",
                }}>
                {/* Search bar for columns */}
                <div className="my-2">
                  <InputText
                    value={columnSearchValue}
                    onChange={(e) => setColumnSearchValue(e.target.value)}
                    placeholder="Search columns..."
                    className="w-full p-inputtext-sm"
                  />
                </div>
                <div className="flex align-items-center mb-2 px-1 py-1">
                  <Checkbox
                    inputId="selectAllColumns"
                    checked={allColumnsSelected}
                    onChange={toggleSelectAllColumns}
                  />
                  <label htmlFor="selectAllColumns" className="ml-2 font-bold">
                    All
                  </label>
                </div>
                {columns
                  .filter((col) => col.hidden !== true)
                  .filter((col) =>
                    col.header
                      ?.toLowerCase()
                      .includes(columnSearchValue.toLowerCase()),
                  )
                  .map((col) => {
                    const isVisible = visibleColumns.some(
                      (vc) => vc.field === col.field,
                    );
                    return (
                      <div
                        key={col.field}
                        className="
                      px-1            
                      py-1
                      flex
                      align-items-start
                      justify-content-between
                      border-round
                      cursor-pointer
                      transition-colors
                      surface-overlay
                      hover:surface-hover
                    ">
                        <Checkbox
                          checked={isVisible}
                          onChange={() =>
                            handleColumnSwitchToggle(col, isVisible)
                          }
                        />
                        <span
                          className="white-space-normal ml-2"
                          style={{ flex: 1 }}>
                          {col.header}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </OverlayPanel>
            {(showFilterButton ?? true) && onClickFilter && (
              <Button
                type="button"
                label="Filter"
                icon={<SlidersHorizontalIcon size={14} weight="bold" />}
                iconPos="left"
                className={conditionClassNames(
                  "p-button-lg text-base border-round-lg py-2",
                  {
                    "p-button-outlined": !isManageColumnsOpen,
                  },
                )}
                onClick={onClickFilter}
              />
            )}
          </>
        )}
      </div>
    </div>
  );

  //this is use for Skeleton loading
  const initialValue = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }];

  /*

    This event listener is used to open a new window when the icon is clicked.
    The new window is opened with the same URL as the current window.
    The data is sent to the new window using postMessage.
    The new window is focused and the data is received in the new window using the message event.
    The data is then passed to the onClickIcon function.

    */
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (
        typeof event.data === "object" &&
        typeof event.data?.id === "number"
      ) {
        if (onClickIcon) {
          event.stopPropagation();
          onClickIcon(event.data);
        }
      }
    };
    window.addEventListener("message", handleMessage);
    // Cleanup: remove event listener when the component unmounts
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  const handleClickIcon = (
    rowData: any,
    event: React.MouseEvent<HTMLElement, MouseEvent>,
  ) => {
    const keyField = dataKey ?? "id";
    setSelectedRecordId(rowData[keyField]);
    if (onClickIcon) {
      const withCtrl = event.ctrlKey;
      if (withCtrl) {
        const newWindow = window.open(window.location.pathname, "_blank");
        if (newWindow) {
          newWindow.onload = function () {
            newWindow.postMessage(rowData, window.location.origin);
          };
          newWindow.focus();
        }
      } else {
        event.stopPropagation();
        onClickIcon(rowData);
      }
    }
  };

  const iconColumnTemplate = (rowData: any) => {
    const isSelected = rowData?.id === selectedRecordId;
    return (
      <Button
        icon="pi pi-desktop"
        outlined
        className={`p-button-sm ${customClassName?.desktopIcon ?? ""}`}
        severity={isSelected ? "danger" : "secondary"}
        style={{
          width: "2rem",
          height: "2.1rem",
          padding: "0rem",
          backgroundColor: isSelected
            ? "color-mix(in srgb, var(--primary-color) 15%, transparent)"
            : "transparent",
        }}
        pt={{
          icon: {
            style: { fontSize: "1rem" },
          },
        }}
        onClick={(event) => handleClickIcon(rowData, event)}
      />
    );
  };

  const emptyMessageTemplate = () => (
    <div
      className="flex flex-column align-items-center justify-content-center py-6 px-4 text-center"
      style={{ color: "#6c757d" }}>
      <img
        src={noResultFoundImage}
        alt="No Results Found"
        className="w-16rem md:min-w-10 mb-2"
      />
      <h2 className="text-xl md:text-2xl font-semibold mb-2">
        {t("components.genericDataTable.noResultFound")}
      </h2>
      <p className="text-md text-gray-500 mb-3">
        {t("components.genericDataTable.noResultsMessage")}
      </p>
      <div className="flex gap-3">
        <Button
          label="Reset Filters"
          icon="pi pi-refresh"
          className="p-button-outlined p-button-secondary hover:bg-secondary-100"
          onClick={resetFilter}
        />
        {openNew && (
          <Button
            label={`Create New ${entityName ?? ""}`}
            icon="pi pi-plus-circle"
            className="p-button-outlined p-button-primary hover:bg-primary-100"
            onClick={openNew}
          />
        )}
      </div>
    </div>
  );

  const finalValues =
    dataLoading && isColumnDefined
      ? initialValue
      : totalCount
        ? value
        : customGlobalFilter(value, globalFilterValue);

  useEffect(() => {
    try {
      // Only set filteredData when no column filters are active
      // When column filters ARE active, let onValueChange handle it (it will fire after DataTable re-filters)
      if (hasActiveFilters) {
        // Don't set filteredData here - onValueChange handles column-filtered data
        return;
      }
      
      // No column filters active - set filteredData based on global search
      if (globalFilterValue) {
        setFilteredData(customGlobalFilter(value || [], globalFilterValue));
      } else if (value?.length > 0) {
        setFilteredData(value);
      } else {
        setFilteredData([]);
      }
    } catch (error) {
      console.error('Error in filteredData useEffect:', error);
      setFilteredData(value || []);
    }
  
  }, [value, hasActiveFilters, globalFilterValue])
  
  
  const total = totalCount ?? filteredData?.length ?? 0;

  const startRecord = total === 0 ? 0 : first + 1;
  const endRecord = total === 0 ? 0 : Math.min(first + rowsPerPage, total);

  const handlePage = (e: any) => {
    setFirst(e.first);
    setRowsPerPage(e.rows);

    if (onPageChange) {
      onPageChange(e);
    }
  };

  const paginatorCssClass = "var(--primary-color)";
  return (
    <div
      className="surface-card border-1 border-gray-300 border-round-2xl"
      style={{
        padding: "3px",
        borderRadius: "12px",
        overflow: "hidden",
      }}>
      <DataTable
        className={`${classNames}`}
        pt={{
          paginator: {
            prevPageButton: {
              style: {
                color: paginatorCssClass,
              },
            },
            nextPageButton: {
              style: {
                color: paginatorCssClass,
              },
            },
            firstPageButton: {
              style: {
                color: paginatorCssClass,
              },
            },
            lastPageButton: {
              style: {
                color: paginatorCssClass,
              },
            },
          },
          header: {
            style: {
              borderBottom: "none",
              borderTop: "none",
              borderRadius: "12px 12px 0 0",
            },
          },
        }}
        style={handleRowClickEvent && { cursor: "pointer" }}
        tableStyle={tableStyle}
        stripedRows
        size="small"
        ref={dt}
        value={finalValues}
        first={first}
        rows={rowsPerPage}
        header={displayHeaderSection !== false && header}
        totalRecords={totalRecordCount ?? undefined}
        onPage={handlePage}
        dataKey={dataKey ?? "id"}
        rowHover={rowHover ?? true}
        paginator={paginator ?? !!(value && value.length > 0)}
        currentPageReportTemplate={currentPageReportTemplate}
        globalFilterFields={globalFilterFields}
        filters={filters}
        onRowClick={handleRowClickEvent}
        onRowDoubleClick={onRowDoubleClick}
        onRowEditInit={onRowEditInit}
        selectionMode={selectionMode ?? null}
        selection={selectedRecords}
        onSelectionChange={handleCheckBoxSelectionEvent}
        scrollable={scrollable}
        scrollHeight={scrollHeight}
        rowGroupMode={rowGroupMode}
        groupRowsBy={groupRowsBy}
        sortMode={sortMode ?? "single"}
        paginatorLeft={
          <span className="text-sm text-gray-600">
            Showing {startRecord}–{endRecord} of {total} Items
          </span>
        }
        sortField={selectedSortData.field}
        sortOrder={selectedSortData.order}
        breakpoint={responsiveLayout}
        expandableRowGroups={expandableRowGroups}
        isDataSelectable={isRowSelectable}
        paginatorPosition={paginatorPosition || "bottom"}
        expandedRows={expandedRows || rowsExpanded}
        onRowToggle={
          onRowToggle ||
          ((e: any) => {
            setRowsExpanded(e?.data);
          })
        }
        rowExpansionTemplate={rowExpansionTemplate}
        editMode={editMode}
        onRowEditComplete={onRowEditComplete}
        rowEditValidator={onRowEditValidator}
        rowClassName={rowClassName}
        emptyMessage={
          isColumnDefined && !dataLoading ? emptyMessageTemplate : bodyTemplate
        }
        onRowExpand={onRowExpand}
        onRowCollapse={onRowCollapse}
        reorderableColumns={reorderableColumns}
        reorderableRows={reorderableRows}
        onValueChange={(value) => {
          try {
            setFilteredData((value as any) || []);
            
            // Also update columnFilterData for reference
            if(value && value.length > 0){
              if (typeof value[0] === "object" && value[0] !== null) {
                if(Object.keys(value[0]).length > 1){
                  setColumnFilterData(value as any);
                }
              }
            } else {
              setColumnFilterData((value as any) || []); 
            }
          } catch (error) {
            setFilteredData([]);
          }
        }}
        onRowReorder={(e) => {
          onRowReorder && onRowReorder(e);
        }}
        
        onFilter={onFilter}
        onSort={onSort}
        multiSortMeta={multiSortMeta}
        rowGroupFooterTemplate={rowGroupFooterTemplate}
        rowGroupHeaderTemplate={rowGroupHeaderTemplate}>
        headerColumnGroup={headerColumnGroup}
      >
        {isColumnDefined && displayCheckBoxesColumn && !dataLoading && (
          <Column selectionMode="multiple" style={{ width: "2.5rem" }} />
        )}
        {isColumnDefined && rowExpansionTemplate && !dataLoading && (
          <Column expander={rowExpansion || true} style={{ width: "2.5rem" }} />
        )}
        {isColumnDefined && !dataLoading && onClickIcon && (
          <Column
            body={iconColumnTemplate}
            className="cursor-pointer"
            style={{ width: "2rem" }}
            pt={{
              bodyCell: { style: { paddingRight: "0.75rem" } },
              headerCell: { style: { paddingRight: "0.75rem" } },
            }}
          />
        )}
        {isColumnDefined &&
          reorderableColumns &&
          reorderableRows &&
          !dataLoading && (
            <Column rowReorder style={{ width: "3rem" }}></Column>
          )}
        {isColumnDefined && dynamicColumns}
        {isColumnDefined && editMode && !dataLoading && (
          <Column
            rowEditor
            headerStyle={{ width: "10%", minWidth: "6rem" }}
            bodyStyle={{ textAlign: "center" }}></Column>
        )}
        {isColumnDefined && actionBodyTemplate && !dataLoading && (
          <Column className="action-column" body={actionBodyTemplate}></Column>
        )}
      </DataTable>
    </div>
  );
};

export default GenericDataTable;
