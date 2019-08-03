import { Module } from '@github1/redux-modules';
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

export const initDataSource = ({id, source, baseSortField, sortField, sortDirection, textFilters}) => {
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

export const updateDataSource = ({id, source, baseSortField, sortField, sortDirection, textFilters}) => {
    return {
        type: DATASOURCE_UPDATE,
        id,
        source,
        baseSortField: baseSortField || 'id',
        sortField,
        sortDirection,
        textFilters
    }
};

export const mapDataSource = (id, func) => {
    return {
        type: DATASOURCE_MAP,
        id,
        func
    }
};

export const sortDataSource = ({id, sortField, sortDirection}) => {
    return {
        type: DATASOURCE_SORT_REQUESTED,
        id,
        sortField,
        sortDirection
    }
};

const sortDataSourceComplete = ({id, sortField, sortDirection}) => {
    return {
        type: DATASOURCE_SORT_COMPLETE,
        id,
        sortField,
        sortDirection
    }
};

export const filterDataSource = ({id, textFilter, field = 'search_value', operator = 'contains'}) => {
    return {
        type: DATASOURCE_FILTER_REQUESTED,
        id,
        textFilter: textFilter,
        field,
        operator
    }
};

const filterDataSourceComplete = ({id, textFilter, field, operator}) => {
    return {
        type: DATASOURCE_FILTER_COMPLETE,
        id,
        textFilter,
        field,
        operator
    }
};

export default Module.create({
    name: 'datasource',
    middleware: store => next => action => {
        const storeState = store.getState();
        const existingDataSource = storeState.datasource[action.id];
        if (DATASOURCE_INIT === action.type || DATASOURCE_UPDATE === action.type) {
            if (Array.isArray(action.source)) {
                action.data = action.source;
            } else {
                action.data = resolveDataFromKey(store.getState(), action.source);
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
                    source: JSON.parse(JSON.stringify(existingDataSource.master)).map(action.func)
                }));
            }
        } else {
            next(action);
        }
    },
    reducer: (state = {}, action) => {
        switch (action.type) {
            case DATASOURCE_UPDATE:
            case DATASOURCE_INIT:
            {
                const initData = {
                    [action.id]: {
                        baseSortField: action.baseSortField,
                        data: action.data,
                        master: action.data,
                        sortField: action.sortField,
                        sortDirection: action.sortDirection,
                        textFilters: action.textFilters
                    }
                };
                updateSortFilter(initData, action.id);
                return {
                    ...state,
                    ...initData
                };
            }
            case DATASOURCE_SORT_COMPLETE:
            {
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
            case DATASOURCE_FILTER_COMPLETE:
            {
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
                updateSortFilter(updatedState, action.id);
                return updatedState;
            }
            case DATASOURCE_DESTROY:
            {
                return {};
            }
        }
        return state;
    }
});

const updateSortFilter = (state, id) => {
    let updatedData = clone(state[id].master);
    if (state[id].textFilters) {
        updatedData = Object.keys(state[id].textFilters)
            .reduce((filtered, key) => {
                const filterRawValue = state[id].textFilters[key].value;
                if (typeof filterRawValue === 'function') {
                    return filtered.filter(filterRawValue);
                } else {
                    const filterValue = filterRawValue + '';
                    const operator = state[id].textFilters[key].operator;
                    return filtered.filter(item => {
                        const propValue = (propByString.get(key, item) || '') + '';
                        if (operator === 'equals') {
                            return propValue.toLowerCase() === filterValue.toLowerCase() || filterValue === '0';
                        }
                        return propValue.toLowerCase().indexOf(filterValue.toLowerCase()) > -1;
                    });
                }
            }, updatedData);
    }
    if (state[id].sortField) {
        updatedData.sort(sortFunc(state[id].sortField,
            state[id].baseSortField,
            state[id].sortDirection));
    }
    state[id].data = updatedData;
};

const resolveDataFromKey = (state, key) => propByString.get(key, state);

export const sortFunc = (field, baseSortField, direction) => {
    return (a, b) => {
        let itemA = propByString.get(field, a);
        let itemB = propByString.get(field, b);
        let result = (itemA > itemB) - (itemA < itemB);
        if (baseSortField && result === 0 && field !== baseSortField) {
            itemA = propByString.get(baseSortField, a);
            itemB = propByString.get(baseSortField, b);
            result = (itemA > itemB) - (itemA < itemB);
        }
        if (direction === 'desc') {
            return result - (result * 2);
        }
        return result;
    };
};

const clone = data => data.slice();
