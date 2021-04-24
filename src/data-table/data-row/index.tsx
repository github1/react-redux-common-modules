import React from 'react';
import {connect} from 'react-redux';
import {
  ColumnProps,
  DataTableModuleStoreState
} from '../';
import {DataCell} from '../data-cell';
import {Store} from 'redux';

export interface DataRowProps {
  data? : any[];
  rowClassName? : (record? : any, rowIndex?: number) => string;
  skipRenderingCoordinates?: {row: number, column: number}[];
  store : Store<DataTableModuleStoreState>;
}

interface DataRowPrivateProps {
  scrollable : boolean;
  columns : ColumnProps[];
  data : any[];
  dataProvided : boolean;
  rowClassName : (record? : any, rowIndex?: number) => string;
  skipRenderingCoordinates?: {row: number, column: number}[];
  store : Store<DataTableModuleStoreState>;
}

const _DataRow : React.FC<DataRowPrivateProps> = ({
                                                    scrollable,
                                                    columns,
                                                    data,
                                                    dataProvided,
                                                    rowClassName,
                                                    skipRenderingCoordinates,
                                                    store
                                                  }) => {
  return <tbody className="thead-light">
  {
    data.map((record, rowIdx) => {
      const className = rowClassName ? rowClassName(record, rowIdx) : null;
      return <tr key={`tr-${rowIdx}`} className={className}>
        {
          columns.map((column, idx) => {
            if (skipRenderingCoordinates) {
              // Check if this column/row should be skipped
              const shouldSkip = skipRenderingCoordinates
                .filter(skipRenderingCoordinate => skipRenderingCoordinate.column === idx
                  && skipRenderingCoordinate.row === rowIdx)[0];
              if (shouldSkip) {
                return <td key={`col${idx}-${rowIdx}`} className="data-table-empty-cell"/>;
              }
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
    skipRenderingCoordinates: ownProps.skipRenderingCoordinates,
    store: ownProps.store
  };
})(_DataRow);
