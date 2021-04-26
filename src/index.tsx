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

const defaultRecords = [];
for (let i = 0; i < 20; i++) {
  defaultRecords.push({
    id: `${i}`,
    name: 'NIGHT VISION DEVICES',
    category: {name: 'CORPORATE'},
    foo: 'Lorem ipsum dolor sit amet.',
    bar: 'Eprehenderit in voluptate velit esse cillum dolore.',
    count: Math.floor(Math.random() * 99) + 1
  });
}

const groupedRecords = [];
for (let i = 0; i < 20; i++) {
  const children = defaultRecords.slice(0, Math.floor(Math.random() * 4) + 1);
  groupedRecords.push({
    id: `g${i}`,
    name: 'NIGHT VISION DEVICES',
    count: children.reduce((sum, child) => sum + child.count, 0),
    children
  });
}

const Main : React.FC<any> = () => {
  const includeGroupedTable = true;
  const [sortState, setSortState] = useState({
    sortField: undefined,
    sortDirection: undefined
  });
  const [inputValue, setInputValue] = useState('');
  const [records, setRecords] = useState(defaultRecords);

  const handleHeaderClick = (column) => {
    setSortState({
      sortField: column.field,
      sortDirection: column.sortDirection === 'asc' ? 'desc' : 'asc'
    });
  };
  const handleInputChange = (evt) => {
    setInputValue(evt.target.value);
    setRecords(defaultRecords.filter(record => {
      return JSON.stringify(record).toLowerCase().indexOf(evt.target.value.toLowerCase()) > -1;
    }))
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
    <input type="text" onChange={handleInputChange} value={inputValue}/>
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
        <Column label="Category" field="category.name" width={100}
                className="row-three"/>
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
      { includeGroupedTable ?
      <DataTable
        scrollable={true}
        sortField={sortState.sortField}
        sortDirection={sortState.sortDirection}
        data={groupedRecords}>
        <Grouping by="children"
                  labelFunction={(record) => `${record.id} - ${record.name}`}
                  summaryFields={['count']}/>
        <Column label="Id" field="id" width={50} className="blah"/>
        <Column label="Name" field="name"
                href={(record, column) => `#${record.id}-${column.field}`}/>
        <Column label="Bar" field="bar" width={100}
                labelFunction={(record, field) => `${field}: ${record[field]}`}/>
        <Column label="Count" field="count" width={100}/>
      </DataTable> : null }
    </div>
  </div>;
};

ReactDOM.render(<Provider store={store}><Main/></Provider>, root);

