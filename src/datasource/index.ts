import { createModule } from '@github1/redux-modules';
import { Optional } from 'utility-types';
import { Action } from 'redux';
import propByString from 'prop-by-string';

export const DATASOURCE_INIT = '@DATASOURCE/INIT';
export const DATASOURCE_UPDATE = '@DATASOURCE/UPDATE';
export const DATASOURCE_UPDATED = '@DATASOURCE/UPDATED';
export const DATASOURCE_MAP = '@DATASOURCE/MAP';
export const DATASOURCE_SORT_REQUESTED = '@DATASOURCE/SORT_REQUESTED';
export const DATASOURCE_SORT_COMPLETE = '@DATASOURCE/SORT_COMPLETE';
export const DATASOURCE_FILTER_REQUESTED = '@DATASOURCE/FILTER_REQUESTED';
export const DATASOURCE_FILTER_COMPLETE = '@DATASOURCE/FILTER_COMPLETE';
export const DATASOURCE_DESTROY = '@DATASOURCE/DESTROY';

// Action types

export interface DataSourceSortProps {
  sortField: string;
  sortDirection: string;
}

export interface DataSourceBaseProps extends DataSourceSortProps {
  id: string;
  source: any[] | string;
  data: any[];
  master: any[];
  baseSortField: string;
  textFilters: any;
  updateTime: number;
  inBrowser: boolean;
}

export interface DataSourceInitAction
  extends Action<typeof DATASOURCE_INIT>,
    DataSourceBaseProps {}

export interface DataSourceDestroyAction
  extends Action<typeof DATASOURCE_DESTROY> {}

export interface DataSourceUpdateAction
  extends Action<typeof DATASOURCE_UPDATE>,
    DataSourceBaseProps {
  sort: boolean;
  filter: boolean;
}

export interface DataSourceUpdatedAction
  extends Action<typeof DATASOURCE_UPDATED>,
    DataSourceBaseProps {}

export interface DataSourceMapAction extends Action<typeof DATASOURCE_MAP> {
  id: string;
  func: (item: any) => any;
}

export interface DataSourceSortAction
  extends Action<typeof DATASOURCE_SORT_REQUESTED>,
    DataSourceSortProps {
  id: string;
}

export interface DataSourceSortCompleteAction
  extends Action<typeof DATASOURCE_SORT_COMPLETE>,
    DataSourceSortProps {
  id: string;
}

export interface DataSourceFilterProps {
  id: string;
  textFilter: any;
  field: string;
  operator: string;
  softFilter: boolean;
}

export interface DataSourceFilterAction
  extends Action<typeof DATASOURCE_FILTER_REQUESTED>,
    DataSourceFilterProps {}

export interface DataSourceFilterCompleteAction
  extends Action<typeof DATASOURCE_FILTER_COMPLETE>,
    DataSourceFilterProps {}

export interface SortDataSourceOptions {
  id: string;
  sortField?: string;
  sortDirection?: string;
}

// Module

type DataSourceModuleState = {
  [k: string]: DataSourceBaseProps;
};

export default createModule('datasource', {
  actionCreators: {
    initDataSource(
      props: Omit<
        Optional<
          DataSourceInitAction,
          | 'baseSortField'
          | 'sortField'
          | 'sortDirection'
          | 'textFilters'
          | 'updateTime'
          | 'inBrowser'
        >,
        'type' | 'master' | 'data'
      >
    ): DataSourceInitAction {
      return {
        ...(props as DataSourceBaseProps),
        baseSortField: props.baseSortField || 'id',
        type: DATASOURCE_INIT,
      };
    },
    destroyDataSource(): Action<typeof DATASOURCE_DESTROY> {
      return {
        type: DATASOURCE_DESTROY,
      };
    },
    updateDataSource(
      props: Omit<
        Optional<
          DataSourceUpdateAction,
          | 'source'
          | 'data'
          | 'baseSortField'
          | 'sortField'
          | 'sortDirection'
          | 'textFilters'
          | 'sort'
          | 'filter'
          | 'updateTime'
          | 'inBrowser'
        >,
        'type' | 'master'
      >
    ): DataSourceUpdateAction {
      return {
        ...(props as DataSourceUpdateAction),
        baseSortField: props.baseSortField || 'id',
        type: DATASOURCE_UPDATE,
      };
    },
    dateSourceUpdated(
      props: Omit<DataSourceUpdatedAction, 'type'>
    ): DataSourceUpdatedAction {
      return {
        ...props,
        type: DATASOURCE_UPDATED,
      };
    },
    mapDataSource(
      id: DataSourceMapAction['id'],
      func: DataSourceMapAction['func']
    ): DataSourceMapAction {
      return {
        type: DATASOURCE_MAP,
        id,
        func,
      };
    },
    sortDataSource(
      props: Omit<
        Optional<DataSourceSortAction, 'sortField' | 'sortDirection'>,
        'type'
      >
    ): DataSourceSortAction {
      return {
        type: DATASOURCE_SORT_REQUESTED,
        ...(props as DataSourceSortAction),
      };
    },
    sortDataSourceComplete(
      props: Omit<DataSourceSortAction, 'type'>
    ): DataSourceSortCompleteAction {
      return {
        ...props,
        type: DATASOURCE_SORT_COMPLETE,
      };
    },
    filterDataSource({
      id,
      textFilter,
      field = 'search_value',
      operator = 'contains',
      softFilter = false,
    }: Omit<
      Optional<
        DataSourceFilterAction,
        'textFilter' | 'field' | 'operator' | 'softFilter'
      >,
      'type'
    >): DataSourceFilterAction {
      return {
        type: DATASOURCE_FILTER_REQUESTED,
        id,
        textFilter,
        field,
        operator,
        softFilter,
      };
    },
    filterDataSourceComplete({
      id,
      textFilter,
      field,
      operator,
      softFilter,
    }: Omit<DataSourceFilterAction, 'type'>): DataSourceFilterCompleteAction {
      return {
        id,
        textFilter,
        field,
        operator,
        softFilter,
        type: DATASOURCE_FILTER_COMPLETE,
      };
    },
  },
})
  .reduce((state: DataSourceModuleState = {}, action) => {
    switch (action.type) {
      case DATASOURCE_UPDATE:
      case DATASOURCE_INIT: {
        const dataSourceProps: DataSourceBaseProps = {
          id: action.id,
          source: action.source,
          baseSortField: action.baseSortField,
          data: action.data,
          master: action.master || state[action.id].master,
          sortField: action.sortField,
          sortDirection: action.sortDirection,
          textFilters: action.textFilters,
          updateTime: action.updateTime,
          inBrowser: action.inBrowser,
        };
        const initData: DataSourceModuleState = {
          [action.id]: dataSourceProps,
        };
        updateSortFilter(
          initData,
          action.id,
          action.type === DATASOURCE_UPDATE ? action.sort : true,
          action.type === DATASOURCE_UPDATE ? action.filter : true
        );
        return {
          ...state,
          ...initData,
        } as DataSourceModuleState;
      }
      case DATASOURCE_SORT_COMPLETE: {
        const sortInfo = {
          [action.id]: {
            ...state[action.id],
            sortField: action.sortField,
            sortDirection: action.sortDirection,
          },
        };
        const updatedState = {
          ...state,
          ...sortInfo,
        };
        updateSortFilter(updatedState, action.id);
        return updatedState;
      }
      case DATASOURCE_FILTER_COMPLETE: {
        const textFilters = state[action.id].textFilters
          ? { ...state[action.id].textFilters }
          : {};
        textFilters[action.field] = {
          value: action.textFilter,
          operator: action.operator,
        };
        const filterInfo = {
          [action.id]: {
            ...state[action.id],
            textFilters,
          },
        };
        const updatedState = {
          ...state,
          ...filterInfo,
        };
        updateSortFilter(
          updatedState,
          action.id,
          false,
          true,
          action.softFilter
        );
        return updatedState;
      }
      case DATASOURCE_MAP: {
        let updatedState = { ...state };
        if (updatedState[action.id]) {
          const updatedItem = { ...updatedState[action.id] };
          for (const field of ['master', 'data']) {
            if (updatedItem[field]) {
              updatedItem[field] = JSON.parse(
                JSON.stringify(updatedItem[field])
              ).map(action.func);
            }
          }
          updatedState = { ...updatedState, ...{ [action.id]: updatedItem } };
        }
        return updatedState;
      }
      case DATASOURCE_DESTROY: {
        return {};
      }
    }
    return state;
  })
  .on((store) => (next) => (action) => {
    const storeState = store.getState();
    if (DATASOURCE_INIT === action.type || DATASOURCE_UPDATE === action.type) {
      const existingDataSource = storeState.datasource[action.id];
      if (action.source) {
        if (Array.isArray(action.source)) {
          action.master = action.source;
        } else {
          action.master = resolveDataFromKey(store.getState(), action.source);
        }
      }

      if (!action.data) {
        action.data = action.master;
      }

      action.updateTime = new Date().getTime();
      action.inBrowser = typeof window !== 'undefined';

      if (DATASOURCE_UPDATE === action.type && existingDataSource) {
        action.sortField = existingDataSource.sortField;
        action.sortDirection = existingDataSource.sortDirection;
        action.textFilters = existingDataSource.textFilters;
      }
      next(action);
      store.dispatch(store.actions.dateSourceUpdated(action));
    } else if (DATASOURCE_SORT_REQUESTED === action.type) {
      next(action);
      next(store.actions.sortDataSourceComplete({ ...action }));
    } else if (DATASOURCE_FILTER_REQUESTED === action.type) {
      next(action);
      next(store.actions.filterDataSourceComplete({ ...action }));
    } else {
      next(action);
    }
  });

const updateSortFilter = (
  state,
  id,
  doSort = true,
  doFilter = true,
  softFilter = false
) => {
  if (doSort || doFilter) {
    let updatedData = clone(state[id].master);
    if (state[id].sortField && doSort) {
      updatedData.sort(
        sortFunc(
          state[id].sortField,
          state[id].baseSortField,
          state[id].sortDirection
        )
      );
      state[id].master = clone(updatedData);
    }
    if (state[id].textFilters && doFilter) {
      const filterSession: string =
        new Date().valueOf().toString(36) +
        Math.random().toString(36).substr(2);
      updatedData = Object.keys(state[id].textFilters).reduce(
        (filtered, key) => {
          const filterRawValue = state[id].textFilters[key].value;
          if (typeof filterRawValue === 'function') {
            return filter(filterSession, softFilter, filtered, filterRawValue);
          } else {
            const filterValue = filterRawValue + '';
            const operator = state[id].textFilters[key].operator;
            return filter(filterSession, softFilter, filtered, (item) => {
              const propValue = (propByString.get(key, item) || '') + '';
              if (operator === 'equals') {
                return (
                  propValue.toLowerCase() === filterValue.toLowerCase() ||
                  filterValue === '0'
                );
              }
              return (
                propValue.toLowerCase().indexOf(filterValue.toLowerCase()) > -1
              );
            });
          }
        },
        updatedData
      );
    }
    state[id].data = updatedData;
  }
};

const filter = (
  filterSession: string,
  softFilter: boolean,
  data: Array<any>,
  predicate: (obj: any) => boolean
): Array<any> => {
  if (softFilter) {
    return data.map((item) => {
      const exclude =
        item.__filter_session === filterSession
          ? item.__exclude || !predicate(item)
          : !predicate(item);
      return {
        ...item,
        __exclude: exclude,
        __filter_session: filterSession,
      };
    });
  } else {
    return data.filter(predicate);
  }
};

const resolveDataFromKey = (state, key) => propByString.get(key, state);

const sortFuncs = {};

export const sortFunc = (field, baseSortField, direction) => {
  const key = `${field}.${baseSortField}.${direction}`;
  if (!sortFuncs[key]) {
    sortFuncs[key] = (a, b) => {
      let itemA: any = propByString.get(field, a);
      let itemB: any = propByString.get(field, b);
      let result: any = ((itemA > itemB) as any) - ((itemA < itemB) as any);
      if (baseSortField && result === 0 && field !== baseSortField) {
        itemA = propByString.get(baseSortField, a);
        itemB = propByString.get(baseSortField, b);
        result = ((itemA > itemB) as any) - ((itemA < itemB) as any);
      }
      if (direction === 'desc') {
        return result - result * 2;
      }
      return result;
    };
  }
  return sortFuncs[key];
};

const clone = (data: any[]) => data.slice();
