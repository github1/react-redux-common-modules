import React from 'react';
import {connect} from 'react-redux';
import {DataTableModuleStoreState} from '../';
import {HeaderCell} from '../header-cell';
import { Store } from 'redux';

interface HeaderRowPrivateProps {
  scrollable : boolean,
  numColumns : number
  store : Store<DataTableModuleStoreState>;
}

const _HeaderRow : React.FC<HeaderRowPrivateProps> = ({scrollable, numColumns, store}) => {
  return <thead className="thead-light">
  <tr>
    {
      new Array(numColumns).fill(null).map((nothing, idx) => <HeaderCell
        key={`col${idx}`}
        columnIndex={idx}
        store={store}/>)
    }
    {
      scrollable ? <th className="header-only"/> : null
    }
  </tr>
  </thead>;
}

export const HeaderRow = connect((state : DataTableModuleStoreState, ownProps: any) : HeaderRowPrivateProps => {
  return {
    scrollable: state.dataTable.scrollable,
    numColumns: state.dataTable.columns.length,
    store: ownProps.store
  };
})(_HeaderRow);
