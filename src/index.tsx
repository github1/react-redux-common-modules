import React, {useState} from 'react';
import ReactDOM from 'react-dom';
import {Store} from 'redux';
import Alerts, {
  displayAlert,
  hideAllAlerts,
  requestConfirmation
} from './alerts';
import {Alerts as AlertsContainer} from './alerts/components/alert';
import {
  Column,
  ColumnDefaults,
  ColumnSet,
  DataTable,
  Grouping
} from './data-table';
import {Module} from '@github1/redux-modules';
import {Provider} from 'react-redux'
import './index.scss';

const store : Store = Module.createStore(Alerts);

store.dispatch(displayAlert({
  title: 'hi',
  message: 'asdas',
  timeout: 5000
}));

store.dispatch(requestConfirmation({
  title: 'Hello',
  message: 'Test message',
  actions: [{
    label: 'some action'
  }]
}));

const root : HTMLDivElement = document.createElement('div');
document.body.appendChild(root);

const records = [];
for (let i = 0; i < 20; i++) {
  records.push({
    id: `${i}`,
    name: 'NIGHT VISION DEVICES',
    category: {name: 'CORPORATE'},
    foo: 'Lorem ipsum dolor sit amet.',
    bar: 'Eprehenderit in voluptate velit esse cillum dolore.'
  });
}

const groupedRecords = [];
for (let i = 0; i < 20; i++) {
  groupedRecords.push({
    id: `${i}`,
    name: 'NIGHT VISION DEVICES',
    children: records.slice(0, 2)
  });
}

const Main : React.FC<any> = () => {
  const [sortState, setSortState] = useState({
    sortField: undefined,
    sortDirection: undefined
  });
  const handleHeaderClick = (column) => {
    setSortState({
      sortField: column.field,
      sortDirection: column.sortDirection === 'asc' ? 'desc' : 'asc'
    });
  };
  return <div>
    <button onClick={() => {
      store.dispatch(hideAllAlerts())
    }}>Hide
      Alerts
    </button>
    <AlertsContainer alertRenderer={(alert, index) => <div key={index}>
      <button onClick={() => {
        alert.dismiss();
      }}>dismiss
      </button>
      <div>{alert.message}</div>
      {
        alert.actions.map((action, index) => {
          return <button key={index}
                         onClick={() => action.trigger()}>k{action.label}</button>
        })
      }
    </div>}/>
    <div onClick={() => {
      handleHeaderClick({field: 'name'});
    }}>Click
    </div>
    <div className="table-container">
      <DataTable
        scrollable={true}
        rowClassName={(record) => record.id === '3' ? 'row-three' : null}
        sortField={sortState.sortField}
        sortDirection={sortState.sortDirection}
        data={records}>
        <ColumnDefaults
          sortable={true}
          sortIcons={[<b>Asc</b>, <b>Desc</b>]}
          onHeaderClick={handleHeaderClick}/>
        <Column label="Id" field="id" width={50} className="blah"/>
        <Column label="Name" field="name"
                href={(record, column) => `#${record.id}-${column.field}`}/>
        <Column label="Category" field="category.name" width={100} className="row-three"/>
        <ColumnSet>
          <Column label="Foo"
                  field="foo"
                  width={100}
                  renderer={(record, column) => {
                    return <b>{record[column.field]}</b>;
                  }}/>
          <Column label="Bar" field="bar" width={150}
                  labelFunction={(record, field) => `${field}: ${record[field]}`}/>
        </ColumnSet>
      </DataTable>
      <DataTable
        scrollable={true}
        sortField={sortState.sortField}
        sortDirection={sortState.sortDirection}
        data={groupedRecords}>
        <Grouping by="children" labelFunction={(record) => `${record.id} - ${record.name}` }/>
        <Column label="Id" field="id" width={50} className="blah"/>
        <Column label="Name" field="name"
                href={(record, column) => `#${record.id}-${column.field}`}/>
        <Column label="Bar" field="bar" width={100}
                labelFunction={(record, field) => `${field}: ${record[field]}`}/>
      </DataTable>
    </div>
  </div>;
};

ReactDOM.render(<Provider store={store}><Main/></Provider>, root);

