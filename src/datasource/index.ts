import {
  createModule,
  ReduxModuleFullyInitialized,
  ReduxModuleTypeContainer,
} from '@github1/redux-modules';
import { Optional } from 'utility-types';
import { Action } from 'redux';
import propByString from 'prop-by-string';
import { Leaves } from '../type-helpers/utils';

export const DATASOURCE_INIT = '@DATASOURCE/INIT';
export const DATASOURCE_UPDATE = '@DATASOURCE/UPDATE';
export const DATASOURCE_UPDATED = '@DATASOURCE/UPDATED';
export const DATASOURCE_MAP = '@DATASOURCE/MAP';
export const DATASOURCE_SORT_REQUESTED = '@DATASOURCE/SORT_REQUESTED';
export const DATASOURCE_SORT_COMPLETE = '@DATASOURCE/SORT_COMPLETE';
export const DATASOURCE_FILTER_REQUESTED = '@DATASOURCE/FILTER_REQUESTED';
export const DATASOURCE_FILTER_COMPLETE = '@DATASOURCE/FILTER_COMPLETE';
export const DATASOURCE_DESTROY = '@DATASOURCE/DESTROY';

// Helper type

type StringKeys<TType> = {
  [k in keyof TType]: k extends string ? k : never;
}[keyof TType];

// State type

export type DataSourceModuleState<
  TDataSourceTypes extends Record<string, any> = Record<string, any>
> = {
  [k in keyof TDataSourceTypes]: k extends string
    ? DataSourceBaseProps<k, TDataSourceTypes[k]>
    : never;
};

// Action types

export type DataSourceSortProps<TDataType = any> = {
  sortField: Leaves<TDataType>;
  sortDirection: 'asc' | 'desc';
};

export type DataSourceBaseProps<
  TDataKey extends string = string,
  TDataType = any
> = DataSourceSortProps<TDataType> & {
  id: TDataKey;
  source: TDataType[] | string;
  data: TDataType[];
  master: TDataType[];
  baseSortField: StringKeys<TDataType>;
  textFilters: Partial<
    Record<
      Leaves<TDataType>,
      {
        value: DataSourceTextFilter<TDataType>;
        operator?: 'contains' | 'equals';
      }
    >
  >;
  updateTime: number;
  inBrowser: boolean;
};

export type DataSourceInitAction<
  TDataKey extends string = string,
  TDataType = any
> = Action<typeof DATASOURCE_INIT> & DataSourceBaseProps<TDataKey, TDataType>;

export type DataSourceDestroyAction = Action<typeof DATASOURCE_DESTROY>;

export type DataSourceUpdateAction<
  TDataKey extends string = string,
  TDataType = any
> = Action<typeof DATASOURCE_UPDATE> &
  DataSourceBaseProps<TDataKey, TDataType> & {
    sort: boolean;
    filter: boolean;
  };

export type DataSourceUpdatedAction<
  TDataKey extends string = string,
  TDataType = any
> = Action<typeof DATASOURCE_UPDATED> &
  DataSourceBaseProps<TDataKey, TDataType>;

export type DataSourceMapAction<
  TDataKey extends string = string,
  TDataType = any
> = Action<typeof DATASOURCE_MAP> & {
  id: TDataKey;
  func: (item: TDataType) => TDataType;
};

export type DataSourceSortAction<
  TDataKey extends string = string,
  TDataType = any
> = Action<typeof DATASOURCE_SORT_REQUESTED> & {
  id: TDataKey;
  sortField: Leaves<TDataType>;
  sortDirection: 'asc' | 'desc' | 'reverse';
};

export type DataSourceSortCompleteAction<
  TDataKey extends string = string,
  TDataType = any
> = Action<typeof DATASOURCE_SORT_COMPLETE> &
  Omit<DataSourceSortAction<TDataKey, TDataType>, 'type'>;

export type DataSourceTextFilter<TDataType = any> =
  | string
  | ((item: TDataType) => boolean);

export type DataSourceFilterProps<
  TDataKey extends string = string,
  TDataType = any,
  TField = Leaves<TDataType>
> = {
  id: TDataKey;
  textFilter: DataSourceTextFilter<TDataType>;
  field: TField;
  operator: 'equals' | 'contains';
  softFilter: boolean;
};

export type DataSourceFilterAction<
  TDataKey extends string = string,
  TDataType = any
> = Action<typeof DATASOURCE_FILTER_REQUESTED> &
  DataSourceFilterProps<TDataKey, TDataType>;

export type DataSourceFilterCompleteAction<
  TDataKey extends string = string,
  TDataType = any
> = Action<typeof DATASOURCE_FILTER_COMPLETE> &
  DataSourceFilterProps<TDataKey, TDataType>;

// Module

type DataSourceModuleType<
  TDataSourceTypes extends Record<string, any> = Record<string, any>,
  TDataSourceKeys extends string = StringKeys<TDataSourceTypes>
> = ReduxModuleFullyInitialized<
  ReduxModuleTypeContainer<
    'datasource',
    DataSourceModuleState<TDataSourceTypes>,
    | DataSourceInitAction<string, any>
    | Action<'@DATASOURCE/DESTROY'>
    | DataSourceUpdateAction<string, any>
    | DataSourceUpdatedAction<string, any>
    | DataSourceMapAction<string, any>
    | DataSourceSortAction<string, any>
    | DataSourceSortCompleteAction<string, any>
    | DataSourceFilterAction<string, any>
    | DataSourceFilterCompleteAction<string, any>,
    {
      initDataSource<TDataSourceKey extends TDataSourceKeys>(
        props: Omit<
          Optional<
            DataSourceInitAction<
              TDataSourceKey,
              TDataSourceTypes[TDataSourceKey]
            >,
            | 'baseSortField'
            | 'sortField'
            | 'sortDirection'
            | 'textFilters'
            | 'updateTime'
            | 'inBrowser'
          >,
          'type' | 'master' | 'data'
        >
      ): DataSourceInitAction;
      destroyDataSource(): Action<typeof DATASOURCE_DESTROY>;
      updateDataSource<TDataSourceKey extends TDataSourceKeys>(
        props: Omit<
          Optional<
            DataSourceUpdateAction<
              TDataSourceKey,
              TDataSourceTypes[TDataSourceKey]
            >,
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
      ): DataSourceUpdateAction;
      dateSourceUpdated<TDataSourceKey extends TDataSourceKeys>(
        props: Omit<
          DataSourceUpdatedAction<
            TDataSourceKey,
            TDataSourceTypes[TDataSourceKey]
          >,
          'type'
        >
      ): DataSourceUpdatedAction;
      mapDataSource<TDataSourceKey extends TDataSourceKeys>(
        id: TDataSourceKey,
        func: DataSourceMapAction<
          TDataSourceKey,
          TDataSourceTypes[TDataSourceKey]
        >['func']
      ): DataSourceMapAction;
      sortDataSource<TDataSourceKey extends TDataSourceKeys>(
        props: Omit<
          Optional<
            DataSourceSortAction<
              TDataSourceKey,
              TDataSourceTypes[TDataSourceKey]
            >,
            'sortField' | 'sortDirection'
          >,
          'type'
        >
      ): DataSourceSortAction;
      sortDataSourceComplete<TDataSourceKey extends TDataSourceKeys>(
        props: Omit<
          DataSourceSortCompleteAction<
            TDataSourceKey,
            TDataSourceTypes[TDataSourceKey]
          >,
          'type'
        >
      ): DataSourceSortCompleteAction;
      filterDataSource<TDataSourceKey extends TDataSourceKeys>({
        id,
        textFilter,
        field,
        operator,
        softFilter,
      }: Omit<
        Optional<
          DataSourceFilterAction<
            TDataSourceKey,
            TDataSourceTypes[TDataSourceKey]
          >,
          'textFilter' | 'field' | 'operator' | 'softFilter'
        >,
        'type'
      >): DataSourceFilterAction;
      filterDataSourceComplete<TDataSourceKey extends TDataSourceKeys>({
        id,
        textFilter,
        field,
        operator,
        softFilter,
      }: Omit<
        DataSourceFilterAction<
          TDataSourceKey,
          TDataSourceTypes[TDataSourceKey]
        >,
        'type'
      >): DataSourceFilterCompleteAction;
    },
    never,
    ['datasource']
  >
>;

function datasourceModuleCreator<
  TDataSourceTypes extends Record<string, any>
>(): DataSourceModuleType<TDataSourceTypes> {
  return createModule('datasource', {
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
          ...(props as any),
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
        props: Omit<DataSourceSortCompleteAction, 'type'>
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
    .reduce((state: DataSourceModuleState<TDataSourceTypes>, action) => {
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
          // update sort and filter
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
          // mapping of reverse sorts
          const sortReverse: Record<
            DataSourceModuleState<any>[string]['sortDirection'],
            DataSourceModuleState<any>[string]['sortDirection']
          > = {
            asc: 'desc',
            desc: 'asc',
          };
          // update sort to be requested sort (or reverse of current sort)
          const sortInfoItem: DataSourceModuleState<any>[string] = {
            ...state[action.id],
            sortField: action.sortField,
            sortDirection:
              action.sortDirection === 'reverse'
                ? sortReverse[state[action.id].sortDirection || 'desc']
                : action.sortDirection,
          };
          const sortInfo = {
            [action.id]: sortInfoItem,
          };
          const updatedState = {
            ...state,
            ...sortInfo,
          };
          // update sort and filter
          updateSortFilter(updatedState, action.id);
          return updatedState;
        }
        case DATASOURCE_FILTER_COMPLETE: {
          const textFilters = state[action.id].textFilters
            ? { ...state[action.id].textFilters }
            : {};
          textFilters[String(action.field)] = {
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
          // just update filter, no sort
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
      if (
        DATASOURCE_INIT === action.type ||
        DATASOURCE_UPDATE === action.type
      ) {
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
}

const datasourceDefault = datasourceModuleCreator();

type DataSourceModule = typeof datasourceModuleCreator &
  typeof datasourceDefault;

Object.keys(datasourceDefault)
  .filter((k) => k !== 'name')
  .forEach((k) => {
    datasourceModuleCreator[k] = datasourceDefault[k];
  });

export const datasource: DataSourceModule = datasourceModuleCreator as any;

const updateSortFilter = (
  state: typeof datasourceDefault['_types']['_stateType'],
  id: string,
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
            const operator = state[id].textFilters[key].operator;
            return filter(filterSession, softFilter, filtered, (item) => {
              const propValue = (propByString.get(key, item) || '') + '';
              if (operator === 'equals') {
                return (
                  propValue.toLowerCase() === filterRawValue.toLowerCase() ||
                  filterRawValue === '0'
                );
              }
              return (
                propValue.toLowerCase().indexOf(filterRawValue.toLowerCase()) >
                -1
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

const resolveDataFromKey = (state: any, key: string) =>
  propByString.get(key, state);

const sortFuncs = {};

export const sortFunc = (
  field: string,
  baseSortField: string,
  direction: 'asc' | 'desc'
) => {
  const key = `${field}.${baseSortField}.${direction}`;
  if (!sortFuncs[key]) {
    sortFuncs[key] = (a: any, b: any) => {
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

const clone = (data: any[]) => (data ? data.slice() : []);
