import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { InputText } from "primereact/inputtext";
import React, { useState, useRef, useEffect, useMemo } from "react";
import { IColumn, IGenericDataTableProps } from "./dataTable.model";
import { FilterMatchMode, FilterOperator } from "primereact/api";
import autoTable from "jspdf-autotable";
import AppButton from "../button/AppButton";
import { MultiSelect } from "primereact/multiselect";
import { AutoComplete } from "primereact/autocomplete";
import { Skeleton } from "primereact/skeleton";
import _ from "lodash";
import { useTranslation } from "react-i18next";
import Fuse from "fuse.js";
import { VscRegex } from "react-icons/vsc";
import { classNames as conditionClassNames } from "primereact/utils";

const FILTER_LEVELS = {
  NORMAL_SEARCH: 0.05,
  WILD_SEARCH: 0.3,
};

const GenericDataTable = (props: IGenericDataTableProps) => {
  const { t } = useTranslation();
  const {
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
    onRowExpand,
    onRowCollapse,
    onClickIcon,
    reorderableColumns,
    reorderableRows,
    onRowReorder,
    visibleColumn
  } = props;
  const {componentNameForSelectingColumns, filterService} = visibleColumn || {};
  const [filters, setFilters] = useState({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
  });
  const dt = useRef(null);
  const [rowsExpanded, setRowsExpanded] = useState<any>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [suggestionsList, setSuggestionsList] = useState<any>(null);
  const [visibleColumns, setVisibleColumns] = useState<IColumn[]>([]);
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [globalSearchThreshold, setGlobalSearchThreshold] = useState(
    FILTER_LEVELS.NORMAL_SEARCH
  );
  const setDataTableValueBouncing = useRef<any>(
    _.debounce((componentName, columns) => {
      filterService &&
        filterService.getComponentValue(componentName).then((res: any) => {
          if (res && res.length > 0) {
            let cols = columns.filter((col: IColumn) =>
              res.some((resCol: IColumn) => resCol.field === col.field)
            );
            setVisibleColumns(cols);
          } else {
            setVisibleColumns(columns);
          }
        });
    }, 250)
  );

  const customGlobalFilter = (data: any[], value: string) => {
    if (data && value) {
      const fuseOptionsForGlobalFilter = {
        keys:
          globalFilterFields || dynamicColumns?.map((col) => col.props.field),
        includeScore: true,
        threshold: globalSearchThreshold,
      };
      const fuse = new Fuse(data, fuseOptionsForGlobalFilter);
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
      const dynamicColumn = visibleColumns?.map((col, index) => (
        <Column
          key={index}
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
        />
      ));
      return dynamicColumn;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleColumns]);

  const isColumnDefined =
    dynamicColumns && dynamicColumns.length > 0 ? true : false;

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
  }, []);

  useEffect(() => {
    if (globalSearchValue) {
      setGlobalFilterValue(globalSearchValue.value);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globalSearchValue]);

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

  const clearAllFilter = () => {
    const generateFilters: any = {};
    columns.forEach((f) => {
      generateFilters[f.field] = {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }],
      };
    });
    setFilters((prev: any) => {
      return {
        ...prev,
        ...generateFilters,
      };
    });
  };

  const clearFilter = () => {
    clearAllFilter();
  };

  const exportPdf = () => {
    const parsedColumns = columns.map((column: any) => {
      return column.header;
    });

    const parsedValues = value.map((row: any) => {
      return Object.values(row);
    });

    import("jspdf").then((jsPDF) => {
      const doc = new jsPDF.default("p");
      autoTable(doc, {
        head: [parsedColumns],
        body: parsedValues,
      });
      doc.save("table_export_" + new Date().getTime() + ".pdf");
    });
  };

  const exportExcel = () => {
    import("xlsx").then((xlsx) => {
      const worksheet = xlsx.utils.json_to_sheet(value);
      const workbook = { Sheets: { data: worksheet }, SheetNames: ["data"] };
      const excelBuffer = xlsx.write(workbook, {
        bookType: "xlsx",
        type: "array",
      });
      saveAsExcelFile(excelBuffer, "table");
    });
  };

  const saveAsExcelFile = (buffer: any, fileName: string) => {
    import("file-saver").then((module) => {
      if (module && module.default) {
        let EXCEL_TYPE =
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8";
        let EXCEL_EXTENSION = ".xlsx";
        const data = new Blob([buffer], {
          type: EXCEL_TYPE,
        });

        module.default.saveAs(
          data,
          fileName + "_export_" + new Date().getTime() + EXCEL_EXTENSION
        );
      }
    });
  };

  const onColumnToggle = (event: any) => {
    let selectedColumns = event.value;
    let orderedSelectedColumns = columns.filter(
      (col) =>
        selectedColumns.some((sCol: any) => sCol.field === col.field) ||
        col.filter
    );
    componentNameForSelectingColumns &&
      filterService &&
      filterService.setComponentValue(
        componentNameForSelectingColumns,
        orderedSelectedColumns
      );
    setVisibleColumns(orderedSelectedColumns);
  };

  const searchList = (event: { query: string }) => {
    setTimeout(() => {
      let _suggestionsList: any;

      if (!event.query.trim().length) {
        if (headerDropdown?.options) {
          _suggestionsList = [...headerDropdown?.options];
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

  const header = (
    <div className="flex flex-row flex-wrap justify-content-between">
      {headerText !== undefined && (
        <div className="flex align-items-center justify-content-center font-bold m-2">
          {headerText}
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
            placeholder={headerDropdown?.placeholder || "Select Item"}
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
          <>
            <div>
              <MultiSelect
                className="w-3rem m-2 border-gray-600 font-semibold bg-gray-100"
                selectedItemsLabel="select"
                value={visibleColumns}
                options={columns}
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
          </>
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
              onClick={exportPdf}
              className="m-2 p-button-outlined p-button-secondary"
              tooltip="PDF"
              tooltipOptions={tooltipOptions}
            />
          </>
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
                onClick={() => {
                  setGlobalSearchThreshold(
                    isNormalIntensity()
                      ? FILTER_LEVELS.WILD_SEARCH
                      : FILTER_LEVELS.NORMAL_SEARCH
                  );
                }}
              >
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
        onClickIcon(rowData);
      }
    }
  };

  const iconColumnTemplate = (rowData: any) => {
    return (
      <i
        className="pi pi-desktop"
        onClick={(event) => {
          handleClickIcon(rowData, event);
        }}
      ></i>
    );
  };

  return (
    <>
      <DataTable
        className={`${classNames}`}
        style={handleRowClickEvent && { cursor: "pointer" }}
        tableStyle={tableStyle}
        stripedRows
        size="small"
        ref={dt}
        value={
          dataLoading && isColumnDefined
            ? initialValue
            : customGlobalFilter(value, globalFilterValue)
        }
        header={displayHeaderSection !== false && header}
        rows={rows || 30}
        dataKey={dataKey || "id"}
        rowHover={rowHover}
        paginator={paginator ?? (value && value.length > 0) ? true : false}
        currentPageReportTemplate={currentPageReportTemplate}
        globalFilterFields={globalFilterFields}
        filters={filters}
        onRowClick={handleRowClickEvent}
        onRowDoubleClick={onRowDoubleClick}
        selectionMode={selectionMode || null}
        selection={selectedRecords}
        onSelectionChange={handleCheckBoxSelectionEvent}
        scrollable={scrollable}
        scrollHeight={scrollHeight}
        rowGroupMode={rowGroupMode}
        groupRowsBy={groupRowsBy}
        sortMode={sortMode || "single"}
        sortField={sortField || sortField === "" ? sortField : "id"}
        sortOrder={sortOrder || 1}
        responsiveLayout={responsiveLayout}
        expandableRowGroups={expandableRowGroups}
        expandedRows={expandedRows ? expandedRows : rowsExpanded}
        onRowToggle={
          onRowToggle
            ? onRowToggle
            : (e: any) => {
                setRowsExpanded(e?.data);
              }
        }
        rowExpansionTemplate={rowExpansionTemplate}
        editMode={editMode}
        onRowEditComplete={onRowEditComplete}
        rowEditValidator={onRowEditValidator}
        rowClassName={rowClassName}
        emptyMessage={
          isColumnDefined && !dataLoading ? (
            <div>
              <img
                src="/images/no-result-found.png"
                alt="No Result Found"
                style={{
                  minWidth: "100px",
                  width: "12vw",
                  display: "flex",
                  margin: "auto",
                }}
                className="pt-3"
              />
              <p className="text-center text-lg md:text-3xl pt-3 text-600 pb-3">
                {t("components.genericDataTable.noResultFound")}
              </p>
            </div>
          ) : (
            bodyTemplate
          )
        }
        onRowExpand={onRowExpand}
        onRowCollapse={onRowCollapse}
        reorderableColumns={reorderableColumns}
        reorderableRows={reorderableRows}
        onRowReorder={(e) => {
          onRowReorder && onRowReorder(e);
        }}
        onFilter={(e) => {
          setFilters((prev) => {
            return {
              ...prev,
              ...e.filters,
            };
          });
        }}
      >
        {isColumnDefined && displayCheckBoxesColumn && !dataLoading && (
          <Column selectionMode="multiple" style={{ width: "2.5rem" }} />
        )}
        {isColumnDefined && rowExpansionTemplate && !dataLoading && (
          <Column expander={rowExpansion || true} style={{ width: "2.5rem" }} />
        )}
        {isColumnDefined &&
          !dataLoading &&
          onClickIcon && (
            <Column
              body={iconColumnTemplate}
              className="cursor-pointer"
              style={{ width: "2rem" }}
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
            bodyStyle={{ textAlign: "center" }}
          ></Column>
        )}
        {isColumnDefined && actionBodyTemplate && !dataLoading && (
          <Column className="action-column" body={actionBodyTemplate}></Column>
        )}
      </DataTable>
    </>
  );
};

export default GenericDataTable;
