import React, {
  ReactElement,
  ReactNode
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
}

export interface GroupingProps {
  by : string;
  summaryFields? : string[];
  labelFunction? : (record? : any, field? : string) => string;
  idFunction? : (record? : any) => string;
}

export interface DataTableProps {
  scrollable? : boolean;
  children? : ReactNode;
  data? : any[];
  sortField? : string;
  sortDirection? : string;
  rowClassName? : (record? : any) => string;
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
  const column = columns[columnIndex];
  if (isNaN(column.width)) {
    return getColumnIndexToResize(columns, columnIndex - 1);
  }
  return columnIndex;
}

// Component

function createDataTableModule(state : DataTableModuleState) : Module {
  return Module.create({
    name: 'dataTable',
    reducer: (state : DataTableModuleState, action) : DataTableModuleState => {
      switch (action.type) {
        case SYNC_STORE_STATE:
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
          return {
            ...state, ...action.state,
            columns: [...syncStoreStateAction.state.columns]
          };
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
    let content;
    const storeState : DataTableModuleStoreState = this.store.getState();
    const grouping : GroupingProps = storeState.dataTable.grouping;
    const data : any[] = storeState.dataTable.data;
    if (grouping) {
      const groupedContent = data
        .map((groupRecord, idx) => {
          return (
            <div key={`group-tab-${idx}`}>
              <div
                className="data-table-group-heading">{grouping.labelFunction ? grouping.labelFunction(groupRecord) : grouping.by}</div>
              <table
                className="table table-header table-bordered">
                <ColumnGroup store={this.store}/>
                <DataRow data={groupRecord[grouping.by] || []}
                         rowClassName={this.props.rowClassName}
                         store={this.store}/>
              </table>
            </div>
          )
        });
      content = <div className="data-table data-table-grouped">
        <table
          className="table table-header table-bordered">
          <ColumnGroup store={this.store}/>
          <HeaderRow store={this.store}/>
          {!this.props.scrollable ? groupedContent : null}
        </table>
        {this.props.scrollable ?
          <Scrollbars universal={true}
                      autoHide={true}
                      className="table-scroll-container">
            {groupedContent}
          </Scrollbars> : null}
      </div>;
    } else {
      content = <div
        className={`data-table${this.props.scrollable ? ' data-table-scrollable' : ''}`}>
        <table className="table table-header table-bordered">
          <ColumnGroup store={this.store}/>
          <HeaderRow store={this.store}/>
          {!this.props.scrollable ? <DataRow store={this.store} rowClassName={this.props.rowClassName}/> : null}
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
    return content;
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
    // Merge column default props
    columns = columns.map((column : ColumnProps, idx : number) => {
      let classNames = column.field;
      if (column.className) {
        classNames = `${classNames} ${column.className}`;
      }
      if (column.hideSmall || column.isGroupColumn) {
        classNames = `${classNames} hide-small`;
      }
      return {
        ...columnDefaultProps, ...column,
        index: idx,
        className: classNames
      };
    });

    return {
      scrollable: this.props.scrollable,
      columns,
      grouping: groupings[0],
      data: this.props.data || [],
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

export const Grouping : React.FC<any> = () => {
  return <div/>;
}
