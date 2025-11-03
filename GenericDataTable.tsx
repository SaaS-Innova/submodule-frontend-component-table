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
import { MultiSelect, MultiSelectChangeEvent } from "primereact/multiselect";
import { AutoComplete } from "primereact/autocomplete";
import { Skeleton } from "primereact/skeleton";
import _ from "lodash";
import { useTranslation } from "react-i18next";
import Fuse from "fuse.js";
import { VscRegex } from "react-icons/vsc";
import { classNames as conditionClassNames } from "primereact/utils";
import noResultFoundImage from "./no-result-found.png";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { capitalizeFirstLetter } from "../../../library/utilities/helperFunction";
const FILTER_LEVELS = {
  NORMAL_SEARCH: 0.05,
  WILD_SEARCH: 0.3,
};
import { BsReceiptCutoff } from "react-icons/bs";
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
    exportButtons,
    globalSearchOption,
    clearFilterButton,
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
    paginatorPosition,
    paginatorRight,
    paginatorLeft,
    paginatorLeftTemplate,
    paginatorRightTemplate,
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
  const [rowsExpanded, setRowsExpanded] = useState<any>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [suggestionsList, setSuggestionsList] = useState<any>(null);
  const [visibleColumns, setVisibleColumns] = useState<IColumn[]>([]);
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [globalSearchThreshold, setGlobalSearchThreshold] = useState(
    FILTER_LEVELS.NORMAL_SEARCH
  );
  const [selectedSortData, setSelectedSortData] = useState<IColumnSort>({
    field: sortField ?? columns[0]?.field,
    order: sortOrder ?? 1,
  });
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [multiSortMeta, setMultiSortMeta] = useState<IColumnSort[]>([]);

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
    }, 250)
  );
  const updateVisibleColumns = (res: IColumn[], columns: IColumn[]) => {
    let cols = columns.filter((col: IColumn) =>
      res.some((resCol: IColumn) => resCol.field === col.field)
    );
    setVisibleColumns(cols);
  };
  const customGlobalFilter = (data: any[], value: string) => {
    if (data && value) {
      const distance = 2000 / globalSearchThreshold;
      const fuseOptionsForGlobalFilter = {
        keys:
          globalFilterFields || dynamicColumns?.map((col) => col.props.field),
        includeScore: true,
        threshold: globalSearchThreshold,
        distance: distance,
      };

      const fuse = new Fuse(data, fuseOptionsForGlobalFilter);
      const searchData = fuse.search(value).map((data) => data.item);
      setDocumentCount && setDocumentCount(searchData.length);
      return fuse.search(value).map((data) => data.item);
    }
    return data;
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
      const dynamicColumn = visibleColumns?.map((col) => (
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
        />
      ));
      return dynamicColumn;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleColumns]);

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
          columns
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
        `${t("components.genericDataTable.globalSearch")}: ${globalFilterValue}`
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
    imgHeight: number
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
        }
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
    scaledHeight: any
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
            imgHeight
          );
        }

        doc.save(`${tableName ?? "dataTable"}.pdf`);
      });
    });
  };

  const exportPdf = (filteredData: any) => {
    const parsedColumns = visibleColumns.map((column: IColumn) => ({
      title: capitalizeFirstLetter(column?.header),
      dataKey: column.field,
    }));
    const visibleColumnsData = getVisibleColumnsListData(filteredData);
    if (companyLogoBase64) {
      savePdf(parsedColumns, visibleColumnsData, companyLogoBase64);
    } else {
      savePdf(parsedColumns, visibleColumnsData);
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
      selectedColumns.some((sCol: any) => sCol.field === col.field)
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
        selectedSortData
      );
    }

    componentNameForSelectingColumns &&
      filterService?.setComponentValue(
        componentNameForSelectingColumns,
        orderedSelectedColumns
      );
  };

  function applySingleSortFilter(
    filters: any[] = [],
    sort: { field: string; order: "ASC" | "DESC" | number }
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
    visibleColumns: { field: string }[]
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
      visibleColumns
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
          columnsWithUpdatedSortOrder
        );
    }
  };

  const onFilter = (e: DataTableStateEvent) => {
    const updatedFilters = buildUpdatedFilters(
      e.filters,
      selectedSortData?.field,
      selectedSortData?.order,
      globalFilterValue,
      visibleColumns
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
        (item: any) => item.field !== "global"
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

  const header = (
    <div className="flex flex-row flex-wrap justify-content-between">
      {headerText !== undefined && (
        <div className="flex align-items-center justify-content-center font-bold m-2">
          <span className="capitalize-first">{headerText}</span>
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
      <div className="flex flex-wrap ">
        {componentNameForSelectingColumns && filterService && (
          <div>
            <MultiSelect
              className="w-3rem m-2 border-gray-600 font-semibold bg-gray-100"
              selectedItemsLabel="select"
              value={visibleColumns}
              options={columns.filter((col) => col.hidden !== true)}
              optionLabel="header"
              onChange={(e) => onColumnToggle(e)}
              dropdownIcon={() => {
                return (
                  <i className="pi pi-bars text-gray-800 bg-gray-100 "></i>
                );
              }}
              tooltip="Show/Hide columns"
              tooltipOptions={tooltipOptions}
            />
          </div>
        )}

        {clearFilterButton !== false && (
          <Button
            type="button"
            icon="pi pi-filter-slash"
            tooltip="clear filter"
            tooltipOptions={tooltipOptions}
            className="p-button-outlined p-button-secondary m-2"
            onClick={clearFilter}
          />
        )}
        {exportButtons !== false && (
          <>
            <Button
              type="button"
              icon="pi pi-file-excel"
              onClick={exportExcel}
              className="m-2 p-button-outlined p-button-secondary"
              tooltip="XLS"
              tooltipOptions={tooltipOptions}
            />
            <Button
              type="button"
              icon="pi pi-file-pdf"
              onClick={() => exportPdf(filteredData)}
              className="m-2 p-button-outlined p-button-secondary"
              tooltip="PDF"
              tooltipOptions={tooltipOptions}
            />
          </>
        )}

        {onClickReadingReceipt && (
          <Button
            type="button"
            tooltip="Reading receipt"
            icon={<BsReceiptCutoff />}
            tooltipOptions={tooltipOptions}
            className="p-button-outlined p-button-secondary m-2"
            onClick={() =>
              onClickReadingReceipt(filteredData.map((item) => item.id))
            }
          />
        )}
        <div className="m-2">
          {" "}
          {openNew && <AppButton type="Add" onClick={openNew} />}
        </div>

        <div className="flex">
          {globalSearchOption !== false && (
            <span className="md:mt-0 p-input-icon-left text-center">
              <i className="pi pi-search ml-2" />
              <InputText
                onChange={(e) => {
                  setGlobalFilterValue(e.target.value);
                  if (debounceTimeoutRef.current) {
                    clearTimeout(debounceTimeoutRef.current);
                  }
                  debounceTimeoutRef.current = setTimeout(() => {
                    handleGlobalSearch(e.target.value);
                  }, 1000);
                  setFilteredData(customGlobalFilter(value, e.target.value));
                }}
                className="w-full md:w-20rem m-2 pr-6"
                placeholder={`${t("components.genericDataTable.placeholder")}`}
                value={globalFilterValue}
              />
              <Button
                type="button"
                className={conditionClassNames(
                  "-ml-6 mb-2 p-button-outlined p-button-secondary py-2 px-2",
                  {
                    "bg-gray-200 text-gray-800": !isNormalIntensity(),
                  }
                )}
                tooltip={
                  !isNormalIntensity()
                    ? "Turnoff wild search"
                    : "Turnon wild search"
                }
                tooltipOptions={{ position: "bottom" }}
                onClick={() => {
                  setGlobalSearchThreshold(
                    isNormalIntensity()
                      ? FILTER_LEVELS.WILD_SEARCH
                      : FILTER_LEVELS.NORMAL_SEARCH
                  );
                }}>
                <VscRegex size={20} />
              </Button>
            </span>
          )}
        </div>
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
    event: React.MouseEvent<HTMLElement, MouseEvent>
  ) => {
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
    return (
      <i
        className="pi pi-desktop flex justify-content-center hover:surface-200 border-circle w-2rem h-2rem align-items-center"
        onClick={(event) => {
          handleClickIcon(rowData, event);
        }}></i>
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

  const totalRecordCount = !totalCount ? filteredData?.length : totalCount;

  const renderPaginatorContent = (
    enabled: boolean | undefined,
    template: React.ReactNode,
    fallback: React.ReactNode = null
  ) => {
    if (!enabled) return null;
    return template ?? fallback;
  };
  return (
    <DataTable
      className={`${classNames}`}
      style={handleRowClickEvent && { cursor: "pointer" }}
      tableStyle={tableStyle}
      stripedRows
      size="small"
      ref={dt}
      value={finalValues}
      first={page && rows ? page * rows : 0}
      header={displayHeaderSection !== false && header}
      rows={rows ?? 30}
      totalRecords={totalRecordCount ?? undefined}
      lazy={totalCount ? true : false} //TODO : If we provide totalRecordCount , then pagination and sort not working so need to look into it
      onPage={onPageChange}
      dataKey={dataKey ?? "id"}
      rowHover={rowHover}
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
      paginatorRight={renderPaginatorContent(
        paginatorRight,
        paginatorRightTemplate,
        <div>Total records : {totalRecordCount}</div>
      )}
      paginatorLeft={renderPaginatorContent(
        paginatorLeft,
        paginatorLeftTemplate,
        <div />
      )}
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
        setFilteredData(value as any);
      }}
      onRowReorder={(e) => {
        onRowReorder && onRowReorder(e);
      }}
      onFilter={onFilter}
      onSort={onSort}
      multiSortMeta={multiSortMeta}
      rowGroupHeaderTemplate={rowGroupHeaderTemplate}>
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
        />
      )}
      {isColumnDefined &&
        reorderableColumns &&
        reorderableRows &&
        !dataLoading && <Column rowReorder style={{ width: "3rem" }}></Column>}
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
  );
};

export default GenericDataTable;
