import { datasource, DataSourceModuleState, sortFunc } from './index';
import { createModule } from '@github1/redux-modules';
import { expectType, TypeEqual } from 'ts-expect';

const fakeDataModule = createModule('someData').preloadedState({
  value: [
    { id: 0, name: 'a' },
    { id: 1, name: 'b' },
    {
      id: 2,
      name: 'c',
    },
  ],
});

describe('datasource', () => {
  describe('it can be defined with typed data', () => {
    const store = datasource<{
      foo: {
        something: string;
      };
      bar: {
        somethingElse: number;
      };
    }>().asStore();
    store.dispatch(
      store.actions.datasource.initDataSource({
        id: 'foo',
        sortField: 'something',
        source: [{ something: 'abc' }],
      })
    );
    const state = store.getState();
    store.dispatch(
      store.actions.datasource.mapDataSource('bar', (item) => {
        expectType<typeof item>({ somethingElse: 123 });
        return item;
      })
    );
    store.dispatch(
      store.actions.datasource.sortDataSource({
        id: 'bar',
        sortField: 'somethingElse',
      })
    );
    expectType<typeof state.datasource.foo.data[0]>({ something: 'abc' });
    expectType<typeof state.datasource.bar.data[0]>({ somethingElse: 123 });
  });
  describe('when it is initialized with an array', () => {
    const store = datasource<{ someDataSource: { id: string } }>()
      .with(fakeDataModule)
      .asStore({ deferred: true, record: true, enforceImmutableState: true });
    let sourceData: { id: string }[];
    beforeAll(() => {
      sourceData = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
      store.reload();
      store.dispatch(
        store.actions.datasource.initDataSource({
          id: 'someDataSource',
          source: sourceData,
        })
      );
    });
    describe('when it is sorted', () => {
      it('has a sort independent from the source data', () => {
        store.dispatch(
          store.actions.datasource.sortDataSource({
            id: 'someDataSource',
            sortField: 'id',
            sortDirection: 'desc',
          })
        );
        expect(store.getState().datasource.someDataSource.data[0].id).toBe('c');
        expect(store.getState().datasource.someDataSource.sortField).toBe('id');
        expect(store.getState().datasource.someDataSource.sortDirection).toBe(
          'desc'
        );
        expect(sourceData[0].id).toBe('a');
      });
    });
    describe('when it is updated', () => {
      it('keeps the original sort', () => {
        const updateData = [{ id: 'a' }, { id: 'b' }];
        store.dispatch(
          store.actions.datasource.updateDataSource({
            id: 'someDataSource',
            source: updateData,
          })
        );
        expect(store.getState().datasource.someDataSource.data[0].id).toBe('b');
      });
    });
  });
  describe('when it is initialized with a key', () => {
    const store = datasource<{ someDataSource: { id: string; name: string } }>()
      .with(fakeDataModule)
      .asStore({ deferred: true, record: true, enforceImmutableState: true });
    beforeEach(() => {
      store.reload();
      store.dispatch(
        store.actions.datasource.initDataSource({
          id: 'someDataSource',
          source: 'someData.value',
        })
      );
    });
    it('initializes the data from the store', () => {
      expect(store.getState().datasource.someDataSource.data[0].name).toBe('a');
      expectType<
        TypeEqual<
          ReturnType<typeof store.getState>['datasource'],
          DataSourceModuleState<{
            someDataSource: { id: string; name: string };
          }>
        >
      >(true);
    });
    describe('when it is sorted', () => {
      it('has a sort independent from the source data', () => {
        store.dispatch(
          store.actions.datasource.sortDataSource({
            id: 'someDataSource',
            sortField: 'id',
            sortDirection: 'desc',
          })
        );
        expect(store.getState().datasource.someDataSource.data[0].name).toBe(
          'c'
        );
        expect(store.getState().datasource.someDataSource.sortField).toBe('id');
        expect(store.getState().datasource.someDataSource.sortDirection).toBe(
          'desc'
        );
        expect(store.getState().someData.value[0].name).toBe('a');
      });
    });
  });
  describe('when it is initialized with sort', () => {
    const store = datasource<{ someDataSource: { id: string; name: string } }>()
      .with(fakeDataModule)
      .asStore({ deferred: true, record: true, enforceImmutableState: true });
    beforeEach(() => {
      store.reload();
      store.dispatch(
        store.actions.datasource.initDataSource({
          id: 'someDataSource',
          source: 'someData.value',
          sortField: 'id',
          sortDirection: 'desc',
        })
      );
    });
    it('has a sort independent from the source data', () => {
      expect(store.getState().datasource.someDataSource.data[0].name).toBe('c');
      expect(store.getState().datasource.someDataSource.sortField).toBe('id');
      expect(store.getState().datasource.someDataSource.sortDirection).toBe(
        'desc'
      );
    });
  });
  describe('when it is initialized with filters', () => {
    const store = datasource<{
      initWithFiltersDataSource: {
        field1: string;
        field2: { subField: string };
      };
    }>()
      .with(fakeDataModule)
      .asStore({ deferred: true, record: true, enforceImmutableState: true });
    beforeEach(() => {
      store.reload();
      store.dispatch(
        store.actions.datasource.initDataSource({
          id: 'initWithFiltersDataSource',
          source: [
            { field1: 'd', field2: { subField: 'b' } },
            {
              field1: 'c',
              field2: { subField: 'd' },
            },
          ],
          textFilters: {
            'field2.subField': {
              value: 'd',
            },
          },
        })
      );
    });
    it('is filtered', () => {
      expect(
        store.getState().datasource.initWithFiltersDataSource.data[0].field2
          .subField
      ).toBe('d');
    });
  });
  describe('destruction', () => {
    it('can destroy datasources', () => {
      const store = datasource<{
        destroyedDataSource: { field1: string; field2: string };
      }>()
        .with(fakeDataModule)
        .asStore({ deferred: true, record: true, enforceImmutableState: true });
      store.dispatch(
        store.actions.datasource.initDataSource({
          id: 'destroyedDataSource',
          source: [
            { field1: 'd', field2: 'b' },
            { field1: 'c', field2: 'd' },
          ],
        })
      );
      expect(
        store.getState().datasource.destroyedDataSource.data[0].field1
      ).toBe('d');
      store.dispatch(store.actions.datasource.destroyDataSource());
      expect(store.getState().datasource.destroyedDataSource).not.toBeDefined();
    });
  });
  describe('filtering', () => {
    const store = datasource<{
      someDataSource: { search_value: string };
      fieldFilterDataSource: { field1: string; field2: string };
      nestedFieldFilterDataSource: {
        field1: string;
        field2: { subField: string };
      };
      equalsOperatorFilterDataSource: { search_value: string };
      softFilterDataSource: {
        search_value: string;
        other_value: string;
        __exclude?: boolean;
      };
      customFilterFuncDataSource: { field1: string };
    }>()
      .with(fakeDataModule)
      .asStore({ deferred: true, record: true, enforceImmutableState: true });
    let sourceData: { search_value: string }[];
    beforeEach(() => {
      store.reload();
      sourceData = [
        { search_value: 'alpha' },
        { search_value: 'bravo' },
        { search_value: 'charlie' },
      ];
      store.dispatch(
        store.actions.datasource.initDataSource({
          id: 'someDataSource',
          source: sourceData,
        })
      );
    });
    it('holds its own id', () => {
      expect(store.getState().datasource.someDataSource.id).toBe(
        'someDataSource'
      );
    });
    it('can filter the values', () => {
      store.dispatch(
        store.actions.datasource.filterDataSource({
          id: 'someDataSource',
          textFilter: 'r',
        })
      );
      expect(
        store.getState().datasource.someDataSource.data[0].search_value
      ).toBe('bravo');
    });
    it('can filter on a field', () => {
      store.dispatch(
        store.actions.datasource.initDataSource({
          id: 'fieldFilterDataSource',
          source: [
            { field1: 'd', field2: 'b' },
            { field1: 'c', field2: 'd' },
          ],
        })
      );
      store.dispatch(
        store.actions.datasource.filterDataSource({
          id: 'fieldFilterDataSource',
          field: 'field2',
          textFilter: 'd',
        })
      );
      expect(
        store.getState().datasource.fieldFilterDataSource.data[0].field2
      ).toBe('d');
    });
    it('can filter on a nested field', () => {
      store.dispatch(
        store.actions.datasource.initDataSource({
          id: 'nestedFieldFilterDataSource',
          source: [
            { field1: 'd', field2: { subField: 'b' } },
            {
              field1: 'c',
              field2: { subField: 'd' },
            },
          ],
        })
      );
      store.dispatch(
        store.actions.datasource.filterDataSource({
          id: 'nestedFieldFilterDataSource',
          field: 'field2.subField',
          textFilter: 'd',
        })
      );
      expect(
        store.getState().datasource.nestedFieldFilterDataSource.data[0].field2
          .subField
      ).toBe('d');
    });
    it('can filter with equals operator', () => {
      store.dispatch(
        store.actions.datasource.initDataSource({
          id: 'equalsOperatorFilterDataSource',
          source: [
            { search_value: 'alpha31' },
            { search_value: 'alpha32' },
            { search_value: 'alpha3' },
          ],
        })
      );
      store.dispatch(
        store.actions.datasource.filterDataSource({
          id: 'equalsOperatorFilterDataSource',
          textFilter: 'alpha3',
          operator: 'equals',
        })
      );
      expect(
        store.getState().datasource.equalsOperatorFilterDataSource.data[0]
          .search_value
      ).toBe('alpha3');
    });
    it('can filter with a function', () => {
      store.dispatch(
        store.actions.datasource.initDataSource({
          id: 'equalsOperatorFilterDataSource',
          source: [
            { search_value: 'alpha31' },
            { search_value: 'alpha32' },
            { search_value: 'alpha3' },
          ],
        })
      );
      store.dispatch(
        store.actions.datasource.filterDataSource({
          id: 'equalsOperatorFilterDataSource',
          textFilter: (item) => /([0-9]+)/.exec(item.search_value)[1] === '3',
        })
      );
      expect(
        store.getState().datasource.equalsOperatorFilterDataSource.data[0]
          .search_value
      ).toBe('alpha3');
    });
    it('can be initialized with a custom filter func', () => {
      store.dispatch(
        store.actions.datasource.initDataSource({
          id: 'customFilterFuncDataSource',
          source: [
            { field1: 'alpha31' },
            { field1: 'alpha32' },
            { field1: 'alpha3' },
          ],
          filterFunc: (item, field, fieldValue, operator, filterValue) => {
            return filterValue === 'blah' && fieldValue === 'alpha32';
          },
        })
      );
      store.dispatch(
        store.actions.datasource.filterDataSource({
          id: 'customFilterFuncDataSource',
          field: 'field1',
          operator: 'contains',
          textFilter: 'blah',
        })
      );
      expect(
        store.getState().datasource.customFilterFuncDataSource.data[0].field1
      ).toBe('alpha32');
    });
    it('can perform a "soft" filter', () => {
      store.dispatch(
        store.actions.datasource.initDataSource({
          id: 'softFilterDataSource',
          source: [
            {
              search_value: 'alpha31',
              other_value: 'foo',
            },
            {
              search_value: 'alpha32',
              other_value: 'bar',
            },
            { search_value: 'alpha3', other_value: 'baz' },
          ],
        })
      );
      store.dispatch(
        store.actions.datasource.filterDataSource({
          id: 'softFilterDataSource',
          textFilter: 'alpha',
          softFilter: true,
        })
      );
      store.dispatch(
        store.actions.datasource.filterDataSource({
          id: 'softFilterDataSource',
          field: 'other_value',
          textFilter: '32',
          softFilter: true,
        })
      );
      expect(
        store.getState().datasource.softFilterDataSource.data[0].search_value
      ).toBe('alpha31');
      expect(
        store.getState().datasource.softFilterDataSource.data[0].__exclude
      ).toBe(true);
      store.dispatch(
        store.actions.datasource.filterDataSource({
          id: 'softFilterDataSource',
          textFilter: '',
          softFilter: true,
        })
      );
      // 'other_value' filter remains
      expect(
        store.getState().datasource.softFilterDataSource.data[0].__exclude
      ).toBe(true);
      store.dispatch(
        store.actions.datasource.filterDataSource({
          id: 'softFilterDataSource',
          field: 'other_value',
          textFilter: '',
          softFilter: true,
        })
      );
      expect(
        store.getState().datasource.softFilterDataSource.data[0].__exclude
      ).toBe(false);
    });
  });
  describe('filtering and sorting behavior', () => {
    const store = datasource<{ someDataSource: { search_value: string } }>()
      .with(fakeDataModule)
      .asStore({ deferred: true, record: true, enforceImmutableState: true });
    let sourceData;
    beforeEach(() => {
      store.reload();
      sourceData = [
        { search_value: 'alpha' },
        { search_value: 'bravo' },
        { search_value: 'charlie' },
      ];
      store.dispatch(
        store.actions.datasource.initDataSource({
          id: 'someDataSource',
          source: sourceData,
        })
      );
    });
    it('it retains the sort when filtering', () => {
      store.dispatch(
        store.actions.datasource.sortDataSource({
          id: 'someDataSource',
          sortField: 'search_value',
          sortDirection: 'desc',
        })
      );
      store.dispatch(
        store.actions.datasource.filterDataSource({
          id: 'someDataSource',
          textFilter: 'alpha',
        })
      );
      expect(
        store.getState().datasource.someDataSource.data[0].search_value
      ).toBe('alpha');
      store.dispatch(
        store.actions.datasource.filterDataSource({
          id: 'someDataSource',
          textFilter: '',
        })
      );
      expect(
        store.getState().datasource.someDataSource.data[0].search_value
      ).toBe('charlie');
    });
  });
  describe('updateDataSource', () => {
    const store = datasource<{
      someDataSource: { id: string; value: number };
    }>()
      .with(fakeDataModule)
      .asStore({ deferred: true, record: true, enforceImmutableState: true });
    beforeEach(() => {
      store.reload();
      store.dispatch(
        store.actions.datasource.initDataSource({
          id: 'someDataSource',
          source: [
            { value: 1, id: 'a' },
            { value: 2, id: 'b' },
            { value: 3, id: 'c' },
          ],
        })
      );
    });
    it('can update the data source without sorting', () => {
      store.dispatch(
        store.actions.datasource.sortDataSource({
          id: 'someDataSource',
          sortField: 'value',
          sortDirection: 'asc',
        })
      );
      store.dispatch(
        store.actions.datasource.updateDataSource({
          id: 'someDataSource',
          source: [
            { value: 999, id: 'a' },
            { value: 2, id: 'b' },
            {
              value: 3,
              id: 'c',
            },
          ],
          sort: false,
        })
      );
      expect(store.getState().datasource.someDataSource.data[0].value).toBe(
        999
      );
    });
    it('records a timestamp when it was updated', async () => {
      const initTime = store.getState().datasource.someDataSource.updateTime;
      expect(initTime).toBeGreaterThan(0);
      await delay(1);
      store.dispatch(
        store.actions.datasource.updateDataSource({
          id: 'someDataSource',
          source: [],
        })
      );
      expect(initTime).toBeLessThan(
        store.getState().datasource.someDataSource.updateTime
      );
    });
    it('records if the datasource was updated in a browser environment', async () => {
      expect(store.getState().datasource.someDataSource.inBrowser).toBe(true);
    });
    it('can update the data source without filter', () => {
      store.dispatch(
        store.actions.datasource.filterDataSource({
          id: 'someDataSource',
          field: 'id',
          textFilter: 'a',
        })
      );
      expect(store.getState().datasource.someDataSource.data[0].id).toBe('a');
      store.dispatch(
        store.actions.datasource.updateDataSource({
          id: 'someDataSource',
          source: [{ value: 1, id: 'b' }],
          filter: false,
        })
      );
      expect(store.getState().datasource.someDataSource.data[0].id).toBe('b');
    });
    it('can update the source and data', () => {
      store.dispatch(
        store.actions.datasource.updateDataSource({
          id: 'someDataSource',
          data: [{ value: 1, id: 'a' }],
        })
      );
      expect(store.getState().datasource.someDataSource.data[0].id).toBe('a');
    });
  });
  describe('mapDataSource', () => {
    const store = datasource<{
      someDataSource: { id: string; value: number; prop?: string };
      anotherDataSource: { something: boolean };
    }>()
      .with(fakeDataModule)
      .asStore({ deferred: true, record: true, enforceImmutableState: true });
    let sourceData: any[];
    beforeEach(() => {
      store.reload();
      sourceData = [
        { value: 1, id: 'a' },
        {
          value: 2,
          id: 'b',
          prop: 'keep',
        },
        { value: 3, id: 'c', prop: 'keep' },
      ];
      store.dispatch(
        store.actions.datasource.initDataSource({
          id: 'someDataSource',
          source: sourceData,
        })
      );
    });
    it('update records in the data source', () => {
      store.dispatch(
        store.actions.datasource.mapDataSource('someDataSource', (record) => {
          record.value++;
          return record;
        })
      );
      expect(store.getState().datasource.someDataSource.data[0].value).toBe(2);
    });
    it('can map over data without re-sorting', () => {
      store.dispatch(
        store.actions.datasource.sortDataSource({
          id: 'someDataSource',
          sortField: 'value',
          sortDirection: 'desc',
        })
      );
      store.dispatch(
        store.actions.datasource.filterDataSource({
          id: 'someDataSource',
          textFilter: 'keep',
          field: 'prop',
        })
      );
      expect(store.getState().datasource.someDataSource.data[0].id).toBe('c');
      store.dispatch(
        store.actions.datasource.mapDataSource('someDataSource', (record) => {
          if (record.value === 3) {
            record.value = -1;
          }
          return record;
        })
      );
      expect(store.getState().datasource.someDataSource.data[0].id).toBe('c');
    });
  });
  describe('sortFunc', () => {
    it('sorts by the primary field', () => {
      const arr = [{ name: 'b' }, { name: 'a' }];
      arr.sort(sortFunc('name', null, 'asc'));
      expect(arr[0].name).toBe('a');
    });
    it('tie breaks with the baseSortField', () => {
      const arr = [
        { id: 1, name: 'a' },
        { id: 0, name: 'a' },
      ];
      arr.sort(sortFunc('name', 'id', 'asc'));
      expect(arr[0].id).toBe(0);
    });
  });
});

const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(() => resolve(), ms));
