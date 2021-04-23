import React from 'react';
import {connect} from 'react-redux';
import {DataTableModuleStoreState} from '../';
import {HeaderCell} from '../header-cell';

interface HeaderRowPrivateProps {
  scrollable : boolean,
  numColumns : number
}

const _HeaderRow : React.FC<HeaderRowPrivateProps> = ({scrollable, numColumns}) => {
  return <thead className="thead-light">
  <tr>
    {
      new Array(numColumns).fill(null).map((nothing, idx) => <HeaderCell
        key={`col${idx}`}
        columnIndex={idx}/>)
    }
    {
      scrollable ? <th className="header-only"/> : null
    }
  </tr>
  </thead>;
}

export const HeaderRow = connect((state : DataTableModuleStoreState) : HeaderRowPrivateProps => {
  return {
    scrollable: state.dataTable.scrollable,
    numColumns: state.dataTable.columns.length
  };
})(_HeaderRow);
