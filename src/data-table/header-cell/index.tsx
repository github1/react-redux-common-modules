import React from 'react';
import {connect} from 'react-redux';
import {
  ColumnProps,
  DataTableModuleStoreState,
  dragColumn,
  dragColumnEnd,
  headerCellClicked
} from '../';

const getPageXY = (evt) => {
  evt = evt || window['event'];
  return {x: evt.pageX, y: evt.pageY};
};

interface HeaderCellProps {
  columnIndex : number;
}

interface HeaderCellPrivateProps {
  column? : ColumnProps,
  isResizing? : boolean;
  sortDirection? : string;
  onHeaderCellClicked? : () => void;
  onHeaderCellDragged? : (posX : number) => void,
  onHeaderCellDragEnd? : () => void;
}

const _HeaderCell : React.FC<HeaderCellPrivateProps> = (props : HeaderCellPrivateProps) => {
  const {column} = props;
  const thProps : React.DetailedHTMLProps<React.ThHTMLAttributes<HTMLTableHeaderCellElement>, HTMLTableHeaderCellElement> = {};
  const thClassNames = [column.className];
  let icon = null;
  if (column.sortable) {
    if (!props.isResizing) {
      thClassNames.push('sortable');
    }
    if (props.sortDirection) {
      thClassNames.push('sorted');
      icon = column.sortIcons ? column.sortIcons[0] : null;
      // overlayProps.sortDirection = sortDirection;
      if (props.sortDirection === 'desc') {
        thClassNames.push('sorted-desc');
        icon = column.sortIcons ? column.sortIcons[1] : null;
      }
    }
  }
  thProps.className = thClassNames.join(' ');

  if (!props.isResizing) {
    thProps.onClick = (evt) => {
      const element : HTMLElement = evt.target as HTMLElement;
      if ((element.getAttribute('class') || '').trim() !== 'th-resize') {
        props.onHeaderCellClicked();
      }
    };
  }

  const dragOverHandler = function (evt) {
    const {x} = getPageXY(evt);
    props.onHeaderCellDragged(x);
  };

  const mouseUpHandler = function () {
    props.onHeaderCellDragEnd();
    if (typeof window !== 'undefined') {
      window.removeEventListener('mouseup', mouseUpHandler);
      window.removeEventListener('blur', mouseUpHandler);
      window.removeEventListener('mousemove', dragOverHandler);
    }
  };

  const onResizeStartHandler = (event) => {
    if (column.index === 0) {
      return;
    }
    const {x} = getPageXY(event);
    props.onHeaderCellDragged(x);
    if (typeof window !== 'undefined') {
      window.addEventListener('mousemove', dragOverHandler);
      window.addEventListener('mouseup', mouseUpHandler);
      window.addEventListener('blur', mouseUpHandler);
    }
  };

  return <th key={`th${column.index}`} {...thProps}>
    <div className="th-content-holder">
      <span
        className={`th-resize ${props.isResizing ? 'resizing' : ''}`}
        draggable={false}
        onMouseDown={onResizeStartHandler}/>
      <div className="th-content-wrapper">
                            <span
                              className="th-content">{column.label}{icon}</span>
      </div>
    </div>
  </th>;
}

export const HeaderCell : React.FC<HeaderCellProps> = connect(
  (state : DataTableModuleStoreState, ownProps : HeaderCellProps) : HeaderCellPrivateProps => {
    const column : ColumnProps = {...state.dataTable.columns[ownProps.columnIndex]};
    return {
      column,
      isResizing: state.dataTable.draggingColumnIndexActual === ownProps.columnIndex,
      sortDirection: state.dataTable.sortField === column.field ? state.dataTable.sortDirection : null,
    };
  },
  (dispatch, {columnIndex}) : HeaderCellPrivateProps => {
    return {
      onHeaderCellClicked: () => dispatch(headerCellClicked(columnIndex)),
      onHeaderCellDragged: (posX : number) => dispatch(dragColumn(columnIndex, posX)),
      onHeaderCellDragEnd: () => dispatch(dragColumnEnd()),
    };
  })(_HeaderCell);
