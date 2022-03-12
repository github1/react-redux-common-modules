import React, { ReactElement } from 'react';
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
  rowKey?: (record?: any, rowIndex?: number) => string | string;
  childRowRenderer?: (record?: any, rowIndex?: number) => ReactElement | string;
  store: Store<DataTableModuleStoreState>;
}

interface DataRowPrivateProps {
  columns: ColumnProps[];
  data: any[];
  dataProvided: boolean;
  rowClassName: (record?: any, rowIndex?: number) => string;
  rowKey: (record?: any, rowIndex?: number) => string | string;
  childRowRenderer?: (record?: any, rowIndex?: number) => ReactElement | string;
  store: Store<DataTableModuleStoreState>;
}

const _DataRow: React.FC<DataRowPrivateProps> = ({
  columns,
  data,
  dataProvided,
  rowClassName,
  rowKey,
  childRowRenderer,
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
          let rowKeyToUse: string = `${rowIdx}`;
          if (rowKey) {
            rowKeyToUse = `${
              typeof rowKey === 'function'
                ? rowKey(record, rowIdx)
                : record[rowKey]
            }`;
          }
          let includeColumnIndices = null;
          if (record.type === GroupingSummaryDataType) {
            className = (className + ' data-table-summary').trim();
            includeColumnIndices = record.includeColumnIndices;
          }
          rows.push(
            <tr key={`tr-${rowKeyToUse}`} className={className}>
              {columns.map((column, idx) => {
                if (column.isNotResizable) {
                  return (
                    <td
                      key={`col${idx}-${rowKeyToUse}`}
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
                      key={`col${idx}-${rowKeyToUse}`}
                      className={`data-table-empty-cell ${
                        column.hideSmall ? ' hide-small' : ''
                      }`}
                    />
                  );
                }
                return (
                  <DataCell
                    key={`col${idx}-${rowKeyToUse}-${record._version || ''}`}
                    column={column}
                    record={record}
                  />
                );
              })}
            </tr>
          );
          if (childRowRenderer) {
            const childRowContent = childRowRenderer(record);
            if (childRowContent) {
              rows.push(
                <tr
                  key={`tr-${rowKeyToUse}-child`}
                  className={[className, 'data-table-child-row'].join(' ')}
                >
                  <td
                    colSpan={columns.length}
                    className="data-table-child-row-content"
                  >
                    {childRowContent}
                  </td>
                </tr>
              );
            }
          }
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
      rowKey: ownProps.rowKey,
      childRowRenderer: ownProps.childRowRenderer,
      store: ownProps.store,
    };
  }
)(_DataRow);
