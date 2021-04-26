import React, {
  ReactElement,
  ReactNode,
} from 'react';
import {Module} from '@github1/redux-modules';
import {
  Action,
  Store
} from 'redux';
import {Scrollbars} from '../scrollbars';
import {ColumnGroup} from './column-group';
import {HeaderRow} from './header-row';
import {DataRow} from './data-row';

// Constants

export const GroupingHeadingDataType = 'GroupingHeadingData';
export const GroupingSummaryDataType = 'GroupingSummaryData';

// Common interfaces

export interface ColumnProps {
  label? : string;
  field? : string;
  width? : number;
  sortField? : string;
  hideSmall? : boolean;
  className? : string;
  sortable? : boolean;
  selectable? : boolean;
  onHeaderClick? : (column? : ColumnProps) => void;
  sortIcons? : ReactElement[];
  href? : ((record? : any, column? : ColumnProps) => string) | string;
  labelFunction? : (record? : any, field? : string) => string;
  renderer? : (record? : any, column? : ColumnProps) => ReactElement | string;
  // private-ish
  index? : number;
  isGroupColumn? : boolean;
  sortDirection? : string;
  isNotResizable? : boolean;
}

export interface GroupingProps {
  by : string;
  summaryFields? : string[];
  labelFunction? : (record? : any) => string;
  idFunction? : (record? : any) => string;
  summarize? : string[];
}

export interface GroupingHeadingData {
  type : typeof GroupingHeadingDataType
  label : string;
}

export interface GroupingSummaryData {
  type : typeof GroupingSummaryDataType
  record : any;
  includeColumnIndices : number[];
}

export interface DataTableProps {
  scrollable? : boolean;
  children? : ReactNode;
  data? : any[];
  sortField? : string;
  sortDirection? : string;
  rowClassName? : (record? : any, rowIndex? : number) => string;
}

export interface DataTableModuleState {
  scrollable : boolean;
  columns : ColumnProps[];
  grouping : GroupingProps;
  data : any[];
  sortField? : string;
  sortDirection? : string;
  draggingColumnIndexActual? : number;
  draggingColumnIndex? : number;
  draggingColumnStartWidth? : number;
  draggingColumnPosXStart? : number;
  draggingColumnPosX? : number;
}

export interface DataTableModuleStoreState {
  dataTable : DataTableModuleState;
}

// Action creators

const SYNC_STORE_STATE = '@DATATABLE/SYNC_STORE_STATE';

export interface SyncStoreStateAction extends Action<typeof SYNC_STORE_STATE> {
  state : DataTableModuleState
}

export function syncStoreState(state : DataTableModuleState) : SyncStoreStateAction {
  return {type: SYNC_STORE_STATE, state};
}

const DRAG_COLUMN = '@DATATABLE/DRAG_COLUMN';

export interface DragColumnAction extends Action<typeof DRAG_COLUMN> {
  index : number;
  posX : number;
}

export function dragColumn(index : number, posX : number) : DragColumnAction {
  return {type: DRAG_COLUMN, index, posX};
}

const DRAG_COLUMN_END = '@DATATABLE/DRAG_COLUMN_END';

export interface DragColumnEndAction extends Action<typeof DRAG_COLUMN_END> {
}

export function dragColumnEnd() : DragColumnEndAction {
  return {type: DRAG_COLUMN_END};
}

const HEADER_CELL_CLICKED = '@DATATABLE/HEADER_CELL_CLICKED';

export interface HeaderCellClickedAction extends Action<typeof HEADER_CELL_CLICKED> {
  index : number;
}

export function headerCellClicked(index : number) : HeaderCellClickedAction {
  return {type: HEADER_CELL_CLICKED, index};
}

const DATA_CELL_CLICKED = '@DATATABLE/DATA_CELL_CLICKED';

export interface DataCellClickedAction extends Action<typeof DATA_CELL_CLICKED> {
  columnIndex : number;
  rowIndex : number;
}

export function dataCellClicked(columnIndex : number, rowIndex : number) : DataCellClickedAction {
  return {type: DATA_CELL_CLICKED, columnIndex, rowIndex};
}

// Utils

function getColumnIndexToResize(columns : ColumnProps[], columnIndex : number) {
  let indexOfWidthless = columns.findIndex(column => isNaN(column.width));
  if (columnIndex <= indexOfWidthless) {
    return columnIndex - 1;
  }
  return columnIndex;
}

function getColumnComparisonKey(column : ColumnProps) : string {
  return column.field + column.sortField + column.selectable + column.hideSmall + column.href;
}

// Component

function createDataTableModule(state : DataTableModuleState) : Module {
  return Module.create({
    name: 'dataTable',
    reducer: (state : DataTableModuleState, action) : DataTableModuleState => {
      switch (action.type) {
        case SYNC_STORE_STATE: {
          const syncStoreStateAction : SyncStoreStateAction = action as SyncStoreStateAction;
          // Sync prop changes with store state
          let columns = state.columns;
          if (columns) {
            // Keep the column widths from the store
            // @todo Should just store the widths outside of the columns array
            syncStoreStateAction.state.columns.forEach((column, idx) => {
              column.width = columns[idx].width;
            });
          }
          const currentColumnsComparisonKey = state.columns.map(getColumnComparisonKey).join(',');
          const newColumnsComparisonKey = syncStoreStateAction.state.columns.map(getColumnComparisonKey).join(',');
          let newState = state;
          if (state.sortDirection !== syncStoreStateAction.state.sortDirection
            || state.sortField !== syncStoreStateAction.state.sortField) {
            newState = {
              ...newState,
              sortDirection: syncStoreStateAction.state.sortDirection,
              sortField: syncStoreStateAction.state.sortField
            };
          }
          if (currentColumnsComparisonKey !== newColumnsComparisonKey) {
            newState = {
              ...newState,
              columns: [...syncStoreStateAction.state.columns]
            };
          }
          if (state.data !== syncStoreStateAction.state.data) {
            newState = {
              ...newState,
              data: syncStoreStateAction.state.data
            };
          }
          return newState;
        }
        case DRAG_COLUMN:
          let newState = state;
          const columnIndexToResize = getColumnIndexToResize(newState.columns, action.index);
          const reverse = columnIndexToResize < action.index;
          if (newState.draggingColumnIndex != columnIndexToResize) {
            // Set the initial pos
            newState = {
              ...newState,
              draggingColumnPosXStart: action.posX,
              draggingColumnStartWidth: newState.columns[columnIndexToResize].width
            };
          }
          newState = {
            ...newState,
            draggingColumnIndexActual: action.index,
            draggingColumnIndex: columnIndexToResize,
            draggingColumnPosX: action.posX
          }
          if (newState.draggingColumnIndex === columnIndexToResize) {
            const posDX = reverse ? action.posX - state.draggingColumnPosXStart : state.draggingColumnPosXStart - action.posX;
            if (!isNaN(posDX)) {
              const newWidth = posDX + state.draggingColumnStartWidth;
              if (newWidth > 0) {
                const newColumns = [...newState.columns];
                newColumns[columnIndexToResize].width = posDX + state.draggingColumnStartWidth;
                newState = {...newState, columns: newColumns};
              }
            }
          }
          return newState;
        case DRAG_COLUMN_END:
          return {
            ...state,
            draggingColumnIndexActual: undefined,
            draggingColumnIndex: undefined,
            draggingColumnPosXStart: undefined,
            draggingColumnPosX: undefined
          };
      }
      return state;
    },
    middleware: store => next => action => {
      if (action.type === HEADER_CELL_CLICKED) {
        const storeState : DataTableModuleStoreState = store.getState();
        const column : ColumnProps = storeState.dataTable.columns[action.index];
        if (column.onHeaderClick) {
          column.onHeaderClick({
            ...column,
            sortDirection: storeState.dataTable.sortField === column.field ? storeState.dataTable.sortDirection : null
          });
        }
      } else {
        next(action);
      }
    },
    preloadedState: state
  });
}

export class DataTable extends React.Component<DataTableProps, any> {
  private readonly store : Store<DataTableModuleStoreState>;

  constructor(props : DataTableProps) {
    super(props);
    // Initialize module with state from component props
    this.store = Module.createStore(createDataTableModule(this.prepareStoreProps()));
  }

  public componentDidUpdate(prevProps, prevState) {
    this.store.dispatch(syncStoreState(this.prepareStoreProps()));
  }

  public render() {
    return <div
      className={`data-table${this.props.scrollable ? ' data-table-scrollable' : ''}`}>
      <table className="table table-header table-bordered">
        <ColumnGroup store={this.store}/>
        <HeaderRow store={this.store}/>
        {!this.props.scrollable ? <DataRow store={this.store}
                                           rowClassName={this.props.rowClassName}/> : null}
      </table>
      {this.props.scrollable ? <Scrollbars universal={true}
                                           autoHide={true}
                                           className="table-scroll-container">
        <table className="table table-content table-bordered">
          <ColumnGroup store={this.store}/>
          <DataRow rowClassName={this.props.rowClassName} store={this.store}/>
        </table>
      </Scrollbars> : null}
    </div>;
  }

  private prepareStoreProps() : DataTableModuleState {
    const reactNodes : ReactElement[] = React.Children
      .toArray(this.props.children) as any as ReactElement[];
    let columnDefaultProps : ColumnProps = {
      label: '',
      field: ''
    };
    let columns : ColumnProps[] = [];
    let groupings : GroupingProps[] = [];
    reactNodes.forEach(child => {
      if (child.type === ColumnDefaults) {
        // Prepare column defaults
        columnDefaultProps = {...columnDefaultProps, ...child.props};
      } else if (child.type === ColumnSet) {
        // Add all column set children
        columns
          .push(...React.Children.toArray(child.props.children)
            .map(columnSetChild => (columnSetChild as ReactElement).props));
      } else if (child.type === Column) {
        columns
          .push(child.props);
      } else if (child.type === Grouping) {
        groupings.push(child.props);
      }
    });
    let hasColumnsWithoutWidth = false;
    // Merge column default props
    columns = columns.map((column : ColumnProps, idx : number) => {
      let classNames = column.field.replace(/\\./g, '-');
      if (column.className) {
        classNames = `${classNames} ${column.className}`;
      }
      if (column.hideSmall || column.isGroupColumn) {
        classNames = `${classNames} hide-small`;
      }
      if (isNaN(column.width)) {
        hasColumnsWithoutWidth = true;
      }
      return {
        ...columnDefaultProps, ...column,
        index: idx,
        className: classNames
      };
    });
    if (!hasColumnsWithoutWidth) {
      // Add width-less column
      columns.push({
        label: ''
      });
    }
    if (this.props.scrollable) {
      // Add fake column for scrollbar
      columns.push({
        label: '',
        width: 8,
        isNotResizable: true
      });
    }

    let data = [...(this.props.data || [])];
    const grouping = groupings[0];
    if (grouping) {
      let includeSummaryColumnIndices = [];
      if (grouping.summaryFields && grouping.summaryFields.length > 0) {
        includeSummaryColumnIndices = columns.reduce((indices, column, idx) => {
          if (grouping.summaryFields.indexOf(column.field) > -1) {
            indices.push(idx);
          }
          return indices;
        }, []);
      }
      data = data.reduce((d, record) => {
        d.push({
          type: GroupingHeadingDataType,
          label: grouping.labelFunction(record)
        });
        d.push(...record[grouping.by]);
        if (grouping.summaryFields && grouping.summaryFields.length > 0) {
          d.push({
            type: GroupingSummaryDataType,
            record,
            includeColumnIndices: includeSummaryColumnIndices
          });
        }
        return d;
      }, []);
    }

    return {
      scrollable: this.props.scrollable,
      columns,
      grouping: groupings[0],
      data,
      sortDirection: this.props.sortDirection,
      sortField: this.props.sortField
    };
  }
}

export const ColumnDefaults : React.FC<ColumnProps> = () => {
  return <div/>;
};

export const Column : React.FC<ColumnProps> = () => {
  return <div/>;
};

export const ColumnSet : React.FC<any> = () => {
  return <div/>;
}

export const Grouping : React.FC<GroupingProps> = () => {
  return <div/>;
}
