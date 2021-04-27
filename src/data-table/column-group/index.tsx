import React from 'react';
import {connect} from 'react-redux';
import {
  ColumnProps,
  DataTableModuleStoreState
} from '../';

interface ColumnGroupProps {
  columns: ColumnProps[]
}

const _ColumnGroup : React.FC<ColumnGroupProps> = ({columns}) => {
  return <colgroup>
    {
      columns.map((column, index) => {
        const colProps = {
          'data-column-label': column.label,
          className: column.hideSmall ? 'hide-small' : '',
          width: undefined
        };
        if (!isNaN(column.width) && column.width) {
          colProps.width = column.width;
        }
        return <col key={`col${index}`} {...colProps}/>;
      })
    }
  </colgroup>;
}

export const ColumnGroup = connect((state : DataTableModuleStoreState): ColumnGroupProps => {
  return {
    columns: state.dataTable.columns
  };
})(_ColumnGroup);
