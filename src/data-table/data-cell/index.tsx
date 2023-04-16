import React from 'react';
import {connect} from 'react-redux';
import {
  ColumnProps,
  dataCellClicked,
  DataTableModuleStoreState,
  GroupingSummaryDataType
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
  let applyHref = true;
  if (column.renderer) {
    content = column.renderer(record, column);
    applyHref = false;
  } else if (column.labelFunction) {
    content = column.labelFunction(record, column.field);
  } else {
    content = propByString.get(column.field, record) || '';
  }
  if (column.href && applyHref) {
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
    let record = ownProps.data ? ownProps.data[ownProps.rowIndex] : state.dataTable.data[ownProps.rowIndex];
    if (record && record.type === GroupingSummaryDataType) {
      // Get actual summary data record
      record = record.record;
    }
    return {
      column: state.dataTable.columns[ownProps.columnIndex],
      record,
      rowIndex: ownProps.rowIndex
    };
  },
  (dispatch, {columnIndex, rowIndex}) : DataCellPrivateProps => {
    return {
      onDataCellClicked: () => dispatch(dataCellClicked(columnIndex, rowIndex))
    };
  })(_DataCell);