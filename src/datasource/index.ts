import {Module} from '@github1/redux-modules';
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

export interface InitDataSourceOptions {
  id : string,
  source : any;
  baseSortField? : string;
  sortField? : string;
  sortDirection? : string;
  textFilters? : any;
}

export const initDataSource = ({id, source, baseSortField, sortField, sortDirection, textFilters} : InitDataSourceOptions) => {
  return {
    type: DATASOURCE_INIT,
    id,
    source,
    baseSortField: baseSortField || 'id',
    sortField,
    sortDirection,
    textFilters
  }
};

export const destroyDataSource = () => {
  return {
    type: DATASOURCE_DESTROY
  }
};

export interface UpdateDataSourceOptions {
  id : string,
  source? : any;
  data? : any;
  baseSortField? : string;
  sortField? : string;
  sortDirection? : string;
  textFilters? : any;
  sort? : boolean;
  filter? : boolean;
}

export const updateDataSource = ({
                                   id,
                                   source,
                                   data,
                                   baseSortField,
                                   sortField,
                                   sortDirection,
                                   textFilters,
                                   sort,
                                   filter
                                 } : UpdateDataSourceOptions) => {
  return {
    type: DATASOURCE_UPDATE,
    id,
    source,
    data,
    baseSortField: baseSortField || 'id',
    sortField,
    sortDirection,
    textFilters,
    sort,
    filter
  }
};

export interface MapDataSourceOptions {
  sort? : boolean;
  filter? : boolean;
}

export const mapDataSource = (id, func, {sort, filter} : MapDataSourceOptions = {}) => {
  return {
    type: DATASOURCE_MAP,
    id,
    func,
    sort,
    filter
  }
};

export interface SortDataSourceOptions {
  id : string;
  sortField? : string;
  sortDirection? : string;
}

export const sortDataSource = ({id, sortField, sortDirection} : SortDataSourceOptions) => {
  return {
    type: DATASOURCE_SORT_REQUESTED,
    id,
    sortField,
    sortDirection
  }
};

const sortDataSourceComplete = ({id, sortField, sortDirection} : SortDataSourceOptions) => {
  return {
    type: DATASOURCE_SORT_COMPLETE,
    id,
    sortField,
    sortDirection
  }
};

export interface FilterDataSourceOptions {
  id : string;
  textFilter? : any;
  field? : string;
  operator? : string;
  softFilter? : boolean;
}

export const filterDataSource = ({id, textFilter, field = 'search_value', operator = 'contains', softFilter = false} : FilterDataSourceOptions) => {
  return {
    type: DATASOURCE_FILTER_REQUESTED,
    id,
    textFilter: textFilter,
    field,
    operator,
    softFilter
  }
};

const filterDataSourceComplete = ({id, textFilter, field, operator, softFilter} : FilterDataSourceOptions) => {
  return {
    type: DATASOURCE_FILTER_COMPLETE,
    id,
    textFilter,
    field,
    operator,
    softFilter
  }
};

export default Module.create({
  name: 'datasource',
  middleware: store => next => action => {
    const storeState = store.getState();
    const existingDataSource = storeState.datasource[action.id];
    if (DATASOURCE_INIT === action.type || DATASOURCE_UPDATE === action.type) {

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

      if (DATASOURCE_UPDATE === action.type && existingDataSource) {
        action.sortField = existingDataSource.sortField;
        action.sortDirection = existingDataSource.sortDirection;
        action.textFilters = existingDataSource.textFilters;
      }
      next(action);
      store.dispatch({...action, type: DATASOURCE_UPDATED});
    } else if (DATASOURCE_SORT_REQUESTED === action.type) {
      next(action);
      next(sortDataSourceComplete({...action}));
    } else if (DATASOURCE_FILTER_REQUESTED === action.type) {
      next(action);
      next(filterDataSourceComplete({...action}));
    } else if (DATASOURCE_MAP === action.type) {
      if (existingDataSource) {
        store.dispatch(updateDataSource({
          id: action.id,
          source: JSON.parse(JSON.stringify(existingDataSource.master)).map(action.func),
          sort: action.sort,
          filter: action.filter
        }));
      }
    } else {
      next(action);
    }
  },
  reducer: (state = {}, action) => {
    switch (action.type) {
      case DATASOURCE_UPDATE:
      case DATASOURCE_INIT: {
        const initData = {
          [action.id]: {
            baseSortField: action.baseSortField,
            data: action.data,
            master: action.master || state[action.id].master,
            sortField: action.sortField,
            sortDirection: action.sortDirection,
            textFilters: action.textFilters
          }
        };
        updateSortFilter(initData, action.id, action.sort, action.filter);
        return {
          ...state,
          ...initData
        };
      }
      case DATASOURCE_SORT_COMPLETE: {
        const sortInfo = {
          [action.id]: {
            ...state[action.id],
            sortField: action.sortField,
            sortDirection: action.sortDirection
          }
        };
        const updatedState = {
          ...state,
          ...sortInfo
        };
        updateSortFilter(updatedState, action.id);
        return updatedState;
      }
      case DATASOURCE_FILTER_COMPLETE: {
        const textFilters = state[action.id].textFilters ? {...state[action.id].textFilters} : {};
        textFilters[action.field] = {
          value: action.textFilter,
          operator: action.operator
        };
        const filterInfo = {
          [action.id]: {
            ...state[action.id],
            textFilters
          }
        };
        const updatedState = {
          ...state,
          ...filterInfo
        };
        updateSortFilter(updatedState, action.id, false, true, action.softFilter);
        return updatedState;
      }
      case DATASOURCE_DESTROY: {
        return {};
      }
    }
    return state;
  }
});

const updateSortFilter = (state, id, doSort = true, doFilter = true, softFilter = false) => {
  if (doSort || doFilter) {
    let updatedData = clone(state[id].master);
    if (state[id].sortField && doSort) {
      updatedData.sort(sortFunc(state[id].sortField,
        state[id].baseSortField,
        state[id].sortDirection));
      state[id].master = clone(updatedData);
    }
    if (state[id].textFilters && doFilter) {
      const filterSession : string = new Date().valueOf().toString(36) + Math.random().toString(36).substr(2);
      updatedData = Object.keys(state[id].textFilters)
        .reduce((filtered, key) => {
          const filterRawValue = state[id].textFilters[key].value;
          if (typeof filterRawValue === 'function') {
            return filter(filterSession, softFilter, filtered, filterRawValue);
          } else {
            const filterValue = filterRawValue + '';
            const operator = state[id].textFilters[key].operator;
            return filter(filterSession, softFilter, filtered, (item => {
              const propValue = (propByString.get(key, item) || '') + '';
              if (operator === 'equals') {
                return propValue.toLowerCase() === filterValue.toLowerCase() || filterValue === '0';
              }
              return propValue.toLowerCase().indexOf(filterValue.toLowerCase()) > -1;
            }));
          }
        }, updatedData);
    }
    state[id].data = updatedData;
  }
};

const filter = (filterSession: string, softFilter: boolean, data : Array<any>, predicate: (obj:any) => boolean) : Array<any> => {
  if (softFilter) {
    return data.map((item) => {
      const exclude = item.__filter_session === filterSession ? item.__exclude || !predicate(item) : !predicate(item);
      return {
        ...item,
        __exclude: exclude,
        __filter_session: filterSession
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
      let itemA : any = propByString.get(field, a);
      let itemB : any = propByString.get(field, b);
      let result : any = ((itemA > itemB) as any) - ((itemA < itemB) as any);
      if (baseSortField && result === 0 && field !== baseSortField) {
        itemA = propByString.get(baseSortField, a);
        itemB = propByString.get(baseSortField, b);
        result = ((itemA > itemB) as any) - ((itemA < itemB) as any);
      }
      if (direction === 'desc') {
        return result - (result * 2);
      }
      return result;
    };
  }
  return sortFuncs[key];
};

const clone = data => data.slice();
