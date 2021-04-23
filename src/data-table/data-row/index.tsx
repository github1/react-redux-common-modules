import React from 'react';
import {connect} from 'react-redux';
import {
  ColumnProps,
  DataTableModuleStoreState
} from '../';
import {DataCell} from '../data-cell';

export interface DataRowProps {
  data?: any[];
  rowClassName?: (record?: any) => string;
}

interface DataRowPrivateProps {
  scrollable : boolean;
  columns : ColumnProps[];
  data: any[];
  dataProvided: boolean;
  rowClassName: (record?: any) => string;
}

const _DataRow : React.FC<DataRowPrivateProps> = ({scrollable, columns, data, dataProvided, rowClassName}) => {
  return <tbody className="thead-light">
  {
    data.map((record, rowIdx) => {
      const className = rowClassName ? rowClassName(record) : null;
      return <tr key={`tr-${rowIdx}`} className={className}>
        {
          columns.map((column, idx) => <DataCell key={`col${idx}-${rowIdx}`}
                                                 columnIndex={idx}
                                                 rowIndex={rowIdx}
                                                 data={ dataProvided ? data : null }/>)
        }
        {
          scrollable ? <td className="header-only"/> : null
        }
      </tr>
    })
  }
  </tbody>;
}

export const DataRow = connect((state : DataTableModuleStoreState, ownProps : DataRowProps) : DataRowPrivateProps => {
  return {
    scrollable: state.dataTable.scrollable,
    columns: state.dataTable.columns,
    data: ownProps.data || state.dataTable.data,
    dataProvided: !!ownProps.data,
    rowClassName: ownProps.rowClassName
  };
})(_DataRow);
