import React from 'react';
import { connect } from 'react-redux';
import {
  ColumnProps,
  DataTableModuleStoreState,
  GroupingHeadingDataType,
  GroupingSummaryDataType,
} from '../';
import { DataCell } from '../data-cell';
import { Store } from 'redux';

export interface DataRowProps {
  data?: any[];
  rowClassName?: (record?: any, rowIndex?: number) => string;
  store: Store<DataTableModuleStoreState>;
}

interface DataRowPrivateProps {
  columns: ColumnProps[];
  data: any[];
  dataProvided: boolean;
  rowClassName: (record?: any, rowIndex?: number) => string;
  store: Store<DataTableModuleStoreState>;
}

const _DataRow: React.FC<DataRowPrivateProps> = ({
  columns,
  data,
  dataProvided,
  rowClassName,
  store,
}) => {
  return (
    <tbody className="thead-light">
      {data.reduce((rows, record, rowIdx) => {
        let className = rowClassName ? rowClassName(record, rowIdx) : '';
        if (record.type === GroupingHeadingDataType) {
          const colSpan = columns.length;
          // Number of cols visible when small
          const colSpanHideSmall = columns.filter(
            (column) => !column.hideSmall
          ).length;
          rows.push(
            <tr key={`tr-${rowIdx}-lg`} className={className + ' hide-small'}>
              <td colSpan={colSpan} className="data-table-group-heading">
                {record.label}
              </td>
            </tr>
          );
          rows.push(
            <tr key={`tr-${rowIdx}-sm`} className={className + ' hide-large'}>
              <td
                colSpan={colSpanHideSmall}
                className="data-table-group-heading"
              >
                {record.label}
              </td>
            </tr>
          );
        } else {
          let includeColumnIndices = null;
          if (record.type === GroupingSummaryDataType) {
            className = (className + ' data-table-summary').trim();
            includeColumnIndices = record.includeColumnIndices;
          }
          rows.push(
            <tr key={`tr-${rowIdx}`} className={className}>
              {columns.map((column, idx) => {
                if (column.isNotResizable) {
                  return (
                    <td
                      key={`col${idx}-${rowIdx}`}
                      className="data-table-borderless-cell"
                    />
                  );
                }
                if (
                  (includeColumnIndices !== null &&
                    includeColumnIndices.indexOf(idx) === -1) ||
                  !column.field
                ) {
                  return (
                    <td
                      key={`col${idx}-${rowIdx}`}
                      className={`data-table-empty-cell ${
                        column.hideSmall ? ' hide-small' : ''
                      }`}
                    />
                  );
                }
                return (
                  <DataCell
                    key={`col${idx}-${rowIdx}-${record._version || ''}`}
                    columnIndex={idx}
                    rowIndex={rowIdx}
                    data={dataProvided ? data : null}
                    store={store}
                  />
                );
              })}
            </tr>
          );
        }
        return rows;
      }, [])}
    </tbody>
  );
};

export const DataRow = connect(
  (
    state: DataTableModuleStoreState,
    ownProps: DataRowProps
  ): DataRowPrivateProps => {
    return {
      columns: state.dataTable.columns,
      data: ownProps.data || state.dataTable.data,
      dataProvided: !!ownProps.data,
      rowClassName: ownProps.rowClassName,
      store: ownProps.store,
    };
  }
)(_DataRow);
