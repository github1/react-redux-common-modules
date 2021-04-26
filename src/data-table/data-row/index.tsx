import React from 'react';
import {connect} from 'react-redux';
import {
  ColumnProps,
  DataTableModuleStoreState,
  GroupingHeadingDataType,
  GroupingSummaryDataType
} from '../';
import {DataCell} from '../data-cell';
import {Store} from 'redux';

export interface DataRowProps {
  data? : any[];
  rowClassName? : (record? : any, rowIndex?: number) => string;
  store : Store<DataTableModuleStoreState>;
}

interface DataRowPrivateProps {
  scrollable : boolean;
  columns : ColumnProps[];
  data : any[];
  dataProvided : boolean;
  rowClassName : (record? : any, rowIndex?: number) => string;
  store : Store<DataTableModuleStoreState>;
}

const _DataRow : React.FC<DataRowPrivateProps> = ({
                                                    scrollable,
                                                    columns,
                                                    data,
                                                    dataProvided,
                                                    rowClassName,
                                                    store
                                                  }) => {
  return <tbody className="thead-light">
  {
    data.map((record, rowIdx) => {
      let className = rowClassName ? rowClassName(record, rowIdx) : null;
      if (record.type === GroupingHeadingDataType) {
        const colSpan = scrollable ? columns.length + 1 : columns.length;
        return <tr key={`tr-${rowIdx}`} className={className}>
          <td colSpan={colSpan} className='data-table-group-heading'>{record.label}</td>
        </tr>;
      }
      let includeColumnIndices = null;
      if (record.type === GroupingSummaryDataType) {
        className = (className + ' data-table-summary').trim();
        includeColumnIndices = record.includeColumnIndices;
      }
      return <tr key={`tr-${rowIdx}`} className={className}>
        {
          columns.map((column, idx) => {
            if (includeColumnIndices !== null && includeColumnIndices.indexOf(idx) === -1) {
              return <td key={`col${idx}-${rowIdx}`} className="data-table-empty-cell"/>;
            }
            return <DataCell key={`col${idx}-${rowIdx}`}
                             columnIndex={idx}
                             rowIndex={rowIdx}
                             data={dataProvided ? data : null}
                             store={store}/>;
          })
        }
        {
          scrollable ? <td className="header-only"/> : null
        }
      </tr>
    })
  }
  </tbody>;
}

export const DataRow = connect((state : DataTableModuleStoreState,
                                ownProps : DataRowProps) : DataRowPrivateProps => {
  return {
    scrollable: state.dataTable.scrollable,
    columns: state.dataTable.columns,
    data: ownProps.data || state.dataTable.data,
    dataProvided: !!ownProps.data,
    rowClassName: ownProps.rowClassName,
    store: ownProps.store
  };
})(_DataRow);
