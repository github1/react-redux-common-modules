import React, { ChangeEvent } from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import {
  alerts,
  api,
  datasource,
  Alerts as AlertsContainer,
  useModuleLifecycle,
  useModuleActions,
  useModuleInterceptor,
  useModuleSelector,
} from '.';
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
        for (let i = 0; i < 100; i++) {
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

const RecordList: React.FC = () => {
  const records = useModuleSelector(
    datasourceModule,
    (state) => state.datasource.records
  );
  const actions = useModuleActions(datasourceModule);
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
      <ul>
        {records.data.map((record, idx) => {
          return (
            <li
              key={idx}
              onClick={() => {
                console.log('reverse');
                actions.datasource.sortDataSource({
                  id: 'records',
                  sortDirection: 'reverse',
                  sortField: 'id',
                });
              }}
            >
              {record.id} | {record.foo} | {record.category.id} |{' '}
              {record.category.name} | {record.count}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

const Main: React.FC = () => {
  useModuleLifecycle(demo, (phase, context) => {
    console.log('phase', phase, context);
  });
  useModuleInterceptor(demo, (action) => {
    if (action.type === '@ALERT/HIDE') {
      console.log('alert hidden');
    }
  });
  const actions = useModuleActions(demo);
  return (
    <div>
      <button
        onClick={() => {
          actions.alerts.hideAllAlerts();
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
        <RecordList />
      </div>
    </div>
  );
};

ReactDOM.render(
  <Provider store={store}>
    <Main />
  </Provider>,
  root
);
