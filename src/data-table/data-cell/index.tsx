import React from 'react';
import { ColumnProps, GroupingSummaryDataType } from '../';
import propByString from 'prop-by-string';

export interface DataCellProps {
  column: ColumnProps;
  record: any;
}

export const DataCell: React.FC<DataCellProps> = (props: DataCellProps) => {
  const { column } = props;
  let record = props.record;
  if (record && record.type === GroupingSummaryDataType) {
    // Get actual summary data record
    record = record.record;
  }
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
    content = (
      <a href={href} className="table-link">
        {content}
      </a>
    );
  }
  return (
    <td key={`td${column.index}`} className={column.className}>
      {content}
    </td>
  );
};
