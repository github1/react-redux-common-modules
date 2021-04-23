import React from 'react';
import {connect} from 'react-redux';
import {
  ColumnProps,
  dataCellClicked,
  DataTableModuleStoreState
} from '../';
import propByString from 'prop-by-string';
import { Store } from 'redux';

export interface DataCellProps {
  columnIndex : number;
  rowIndex : number;
  data : any[];
  store: Store<DataTableModuleStoreState>;
}

interface DataCellPrivateProps {
  column? : ColumnProps,
  rowIndex? : number;
  record? : any;
  onDataCellClicked? : () => void;
}

const _DataCell : React.FC<DataCellPrivateProps> = (props : DataCellPrivateProps) => {
  const {column, record, rowIndex} = props;
  let content;
  if (column.renderer) {
    content = column.renderer(record, column);
  } else if (column.labelFunction) {
    content = column.labelFunction(record, column.field);
  } else {
    content = propByString.get(column.field, record) || '';
  }
  if (column.href) {
    let href;
    if (typeof column.href === 'function') {
      href = column.href(record, column);
    } else {
      href = column.href;
    }
    content = <a href={href}
                 className="table-link">{content}</a>;
  }
  return <td key={`td${column.index}-${rowIndex}`} className={column.className}>
    {content}
  </td>;
}

export const DataCell : React.FC<DataCellProps> = connect(
  (state : DataTableModuleStoreState, ownProps : DataCellProps) : DataCellPrivateProps => {
    return {
      column: state.dataTable.columns[ownProps.columnIndex],
      record: ownProps.data ? ownProps.data[ownProps.rowIndex] : state.dataTable.data[ownProps.rowIndex],
      rowIndex: ownProps.rowIndex
    };
  },
  (dispatch, {columnIndex, rowIndex}) : DataCellPrivateProps => {
    return {
      onDataCellClicked: () => dispatch(dataCellClicked(columnIndex, rowIndex))
    };
  })(_DataCell);
