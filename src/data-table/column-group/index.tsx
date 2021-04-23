import React from 'react';
import {connect} from 'react-redux';
import {
  ColumnProps,
  DataTableModuleStoreState
} from '../';

const SCROLL_BAR_WIDTH : number = 8;

interface ColumnGroupProps {
  scrollable: boolean,
  columns: ColumnProps[]
}

const _ColumnGroup : React.FC<ColumnGroupProps> = ({scrollable, columns}) => {
  return <colgroup>
    {
      columns.map((column, index) => {
        const colProps = {
          'data-column-label': column.label,
          className: column.hideSmall || column.isGroupColumn ? 'hide-small' : null,
          width: undefined
        };
        if (!isNaN(column.width) && column.width) {
          colProps.width = column.width;
        }
        return <col key={`col${index}`} {...colProps}/>;
      })
    }
    {
      scrollable ? <col className="scroll-bar-col"
                                    width={SCROLL_BAR_WIDTH}/> : null
    }
  </colgroup>;
}

export const ColumnGroup = connect((state : DataTableModuleStoreState): ColumnGroupProps => {
  return {
    scrollable: state.dataTable.scrollable,
    columns: state.dataTable.columns
  };
})(_ColumnGroup);
