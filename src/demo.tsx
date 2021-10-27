import React, { ChangeEvent } from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import {
  alerts,
  api,
  connectModule,
  datasource,
  Alerts as AlertsContainer,
} from '.';
import { Column, ColumnDefaults, ColumnSet, DataTable, Grouping } from '.';
import { createModule } from '@github1/redux-modules';
import './demo.scss';

type DataRecord = {
  id: string;
  name: string;
  category: {
    id: number;
    name: string;
  };
  foo: string;
  bar: string;
  count: number;
};

type GroupedDataRecord = {
  id: string;
  name: string;
  count: number;
  children: DataRecord[];
};

const datasourceModule = datasource<{
  records: DataRecord;
  groupedRecords: GroupedDataRecord;
}>();

const demo = createModule('demo', {
  actionCreators: {
    loadData(filter?: string): { type: 'LOAD_DATA'; filter: string } {
      return { type: 'LOAD_DATA', filter: filter || '' };
    },
  },
})
  .with(alerts)
  .with(datasourceModule)
  .with(api)
  .intercept((action, { actions, state }) => {
    if (action.type === 'LOAD_DATA') {
      if (!state.datasource.records) {
        const defaultRecords: DataRecord[] = [];
        for (let i = 0; i < 20; i++) {
          defaultRecords.push({
            id: `${i}`,
            name: 'NIGHT VISION DEVICES',
            category: { id: i, name: `C-${i}` },
            foo: 'Lorem ipsum dolor sit amet.',
            bar: 'Eprehenderit in voluptate velit esse cillum dolore.',
            count: Math.floor(Math.random() * 99) + 1,
          });
        }

        const groupedRecords: GroupedDataRecord[] = [];
        for (let i = 0; i < 20; i++) {
          const children = defaultRecords.slice(
            0,
            Math.floor(Math.random() * 4) + 1
          );
          groupedRecords.push({
            id: `g${i}`,
            name: 'NIGHT VISION DEVICES',
            count: children.reduce((sum, child) => sum + child.count, 0),
            children,
          });
        }

        return [
          actions.datasource.initDataSource({
            id: 'records',
            source: defaultRecords,
          }),
          actions.datasource.initDataSource({
            id: 'groupedRecords',
            source: groupedRecords,
          }),
        ];
      } else {
        return [
          actions.datasource.filterDataSource({
            id: 'records',
            textFilter: action.filter,
            field: 'category.name',
            operator: 'contains',
          }),
        ];
      }
    }
  });

const store = demo.asStore({
  enforceImmutableState: true,
  enableReduxDevTools: true,
});

store.dispatch(
  store.actions.alerts.displayAlert({
    title: 'hi',
    message: 'asdas',
    timeout: 1000,
  })
);

store.dispatch(
  store.actions.alerts.requestConfirmation({
    title: 'Hello',
    message: 'Test message',
    options: [
      {
        label: 'some action',
        action: { type: 'SOME_ACTION' },
      },
    ],
  })
);

const root: HTMLDivElement = document.createElement('div');
document.body.appendChild(root);

const handleInputChange = (evt: ChangeEvent<HTMLInputElement>) => {
  console.log(evt.target.value);
  store.dispatch(store.actions.demo.loadData(evt.target.value));
};

store.dispatch(store.actions.demo.loadData());

const DataRecordTable = connectModule(
  datasourceModule,
  ({ records, actions }) => {
    if (!records) {
      return <div></div>;
    }
    return (
      <div>
        <input
          type="text"
          onChange={handleInputChange}
          value={
            records.textFilters
              ? `${records.textFilters['category.name'].value}`
              : ''
          }
        />
        <DataTable
          scrollable={true}
          rowClassName={(record) => (record.id === '3' ? 'row-three' : null)}
          sortField={records.sortField}
          sortDirection={records.sortDirection}
          data={records.data}
        >
          <ColumnDefaults
            sortable={true}
            sortIcons={[<b>Asc</b>, <b>Desc</b>]}
            onHeaderClick={(column) => {
              actions.datasource.sortDataSource({
                id: 'records',
                sortDirection: 'reverse',
                sortField: column.sortField as any,
              });
            }}
          />
          <Column label="Id" field="id" width={50} className="blah" />
          <Column
            label="Name"
            field="name"
            href={(record, column) => `#${record.id}-${column.field}`}
          />
          <Column
            label="Category"
            field="category.name"
            sortField="category.id"
            width={100}
            className="row-three"
            hideSmall={true}
          />
          <ColumnSet>
            <Column
              label="Foo"
              field="foo"
              width={100}
              renderer={(record, column) => {
                return <b>{record[column.field]}</b>;
              }}
              hideSmall={true}
            />
            <Column
              label="Bar"
              field="bar"
              width={150}
              labelFunction={(record, field) => `${field}: ${record[field]}`}
              hideSmall={true}
            />
          </ColumnSet>
        </DataTable>
      </div>
    );
  }
);

const GroupedDataRecordTable = connectModule(
  datasourceModule,
  ({ groupedRecords }) => {
    if (!groupedRecords) {
      return <div></div>;
    }
    return (
      <DataTable
        scrollable={true}
        sortField={groupedRecords.sortField}
        sortDirection={groupedRecords.sortDirection}
        data={groupedRecords.data}
      >
        <Grouping
          by="children"
          labelFunction={(record) => `${record.id} - ${record.name}`}
          summaryFields={['count']}
        />
        <Column label="Id" field="id" width={50} className="blah" />
        <Column
          label="Name"
          field="name"
          href={(record, column) => `#${record.id}-${column.field}`}
          width={200}
        />
        <Column
          label="Bar"
          field="bar"
          width={100}
          labelFunction={(record, field) => `${field}: ${record[field]}`}
        />
        <Column label="Count" field="count" width={100} />
      </DataTable>
    );
  }
);

const Main = connectModule(demo, ({ actions }) => {
  return (
    <div>
      <button
        onClick={() => {
          store.dispatch(actions.alerts.hideAllAlerts());
        }}
      >
        Hide Alerts
      </button>
      <AlertsContainer
        alertRenderer={(alert, index) => (
          <div key={index}>
            <button
              onClick={() => {
                alert.dismiss();
              }}
            >
              dismiss
            </button>
            <div>{alert.message}</div>
            {alert.actions.map((action, index) => {
              return (
                <button key={index} onClick={() => action.trigger()}>
                  k{action.label}
                </button>
              );
            })}
          </div>
        )}
      />
      <div className="table-container">
        <DataRecordTable />
        <GroupedDataRecordTable />
      </div>
    </div>
  );
});

ReactDOM.render(
  <Provider store={store}>
    <Main />
  </Provider>,
  root
);
