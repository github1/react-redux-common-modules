import { Module } from '@common/redux-modules';
import { get, del, post, APPLICATION_AMF, APPLICATION_JSON, TEXT_PLAIN } from '../ajax';

export const AUTHENTICATE_REQUESTED = '@API/AUTHENTICATE_REQUESTED';
export const AUTHENTICATE_SUCCESS = '@API/AUTHENTICATE_SUCCESS';
export const AUTHENTICATE_AUTHORIZATION_FAILED = '@API/AUTHENTICATE_AUTHORIZATION_FAILED';
export const AUTHENTICATE_FAILED = '@API/AUTHENTICATE_FAILED';

export const DATA_FETCH_REQUESTED = '@API/DATA_FETCH_REQUESTED';
export const DATA_FETCH_SUCCESS = '@API/DATA_FETCH_SUCCESS';
export const DATA_FETCH_FAILED = '@API/DATA_FETCH_FAILED';

export const COMMAND_REQUESTED = '@API/COMMAND_REQUESTED';
export const COMMAND_SUCCESS = '@API/COMMAND_SUCCESS';
export const COMMAND_FAILED = '@API/COMMAND_FAILED';

export const SIGNOUT_REQUESTED = '@API/SIGNOUT_REQUESTED';
export const SIGNOUT_SUCCESS = '@API/SIGNOUT_SUCCESS';

export const authenticate = ({username, password} = {}) => {
    return {type: AUTHENTICATE_REQUESTED, username, password}
};

export const authenticationSuccess = (claims) => ({
    type: AUTHENTICATE_SUCCESS,
    claims
});

export const authenticationFailed = () => ({
    type: AUTHENTICATE_FAILED
});

export const authorizationFailed = () => ({
    type: AUTHENTICATE_AUTHORIZATION_FAILED
});

export const signout = () => ({type: SIGNOUT_REQUESTED});

export const signoutSuccess = () => ({type: SIGNOUT_SUCCESS});

export const graphQuery = (graphQueryDefinition, queryName) => {
    const graphQuery = graphQueryDefinition.hasOwnProperty('schema') ? graphQueryDefinition.schema : graphQueryDefinition;
    const postProcessor = graphQueryDefinition.postProcessor;
    const queryResultName = Object.keys(graphQuery)[0];
    queryName = queryName || queryResultName;
    return {
        type: DATA_FETCH_REQUESTED,
        queryName,
        queryResultName,
        graphQuery,
        postProcessor
    };
};

export const getRequest = (url, queryName, postProcessor) => {
    return {
        type: DATA_FETCH_REQUESTED,
        queryName,
        url,
        postProcessor
    }
};

export const staticResponse = (queryName, staticData) => {
  return {
      type: DATA_FETCH_REQUESTED,
      queryName,
      queryResultName: queryName,
      staticData
  }
};

export const dataFetchSuccess = ({ queryName, queryResultName, data }) => ({
    type: DATA_FETCH_SUCCESS,
    queryName,
    queryResultName,
    data
});

export const executeCommand = (name, payload, responseHandler) => {
  return {
      type: COMMAND_REQUESTED,
      name,
      payload,
      responseHandler,
      callCountName: name
  }
};

const getCallName = (action) => {
    let callName = action.callCountName;
    if (!callName) {
        callName = action.type.replace(/@API\//g, '');
        callName = callName.substring(0, callName.lastIndexOf('_'));
    }
    return callName;
};

export default Module.create({
    name: 'api',
    reducer: (state = {
        numCallsInProgress: 0,
        callsInProgress: [],
        callCount: {},
        fetching: {}
    }, action) => {
        if (/@API.*_REQUESTED$/.test(action.type)) {
            const fetching = {
                fetching: {
                    ...state.fetching
                }
            };
            const numCallsInProgress = state.numCallsInProgress + 1;
            const callName = getCallName(action);
            const callCount = {
              callCount: {
                  ...state.callCount,
                  [callName]: !state.callCount[callName] ? 1 : state.callCount[callName] + 1
              }
            };
            if (DATA_FETCH_REQUESTED === action.type) {
                fetching.fetching[action.queryName] = true;
            }
            const callsInProgress = (state.callsInProgress || []).splice();
            if (callsInProgress.indexOf(callName) < 0) {
                callsInProgress.push(callName);
            }
            return {
                ...state,
                ...fetching,
                ...callCount,
                numCallsInProgress,
                callInProgress: true,
                callsInProgress
            }
        } else if (/@API.*_(SUCCESS|FAILED)$/.test(action.type)) {
            const fetching = {
                fetching: {
                    ...state.fetching
                }
            };
            const numCallsInProgress = Math.max(0, state.numCallsInProgress - 1);
            if (action.queryName) {
                fetching.fetching[action.queryName] = false;
            }
            const callName = getCallName(action);
            const callsInProgress = (state.callsInProgress || []).filter(call => call === callName);
            return {
                ...state,
                ...fetching,
                numCallsInProgress,
                callInProgress: numCallsInProgress > 0,
                callsInProgress
            }
        }
        return state;
    },
    middleware: store => next => action => {
        if (AUTHENTICATE_REQUESTED === action.type) {
            next(action);
            const headers = {};
            if (action.username && action.password) {
                headers.Authorization = `Basic ${btoa([action.username.toLowerCase(), action.password].join(':'))}`
            }
            store.dispatch(get('service/identity', {
                accept: APPLICATION_AMF,
                headers
            }, (err, response) => {
                if (err) {
                    if ([401, 403].indexOf(err.status) > -1) {
                        return authorizationFailed();
                    }
                    return authenticationFailed();
                } else {
                    return authenticationSuccess(response.data);
                }
            }));
        } else if (DATA_FETCH_REQUESTED === action.type) {
            next(action);
            if (action.staticData) {
                store.dispatch(dataFetchSuccess({
                    queryName: action.queryName,
                    data: action.staticData
                }));
            } else if (action.url) {
                store.dispatch(get(action.url, {
                    accept: APPLICATION_JSON,
                    contentType: APPLICATION_JSON
                }, (err, response) => {
                    if (err) {
                        return {type: DATA_FETCH_FAILED, queryName: action.queryName, error: err};
                    } else {
                        const data = action.postProcessor ? action.postProcessor(response.data, store.getState()) : response.data;
                        return dataFetchSuccess({
                            queryName: action.queryName,
                            queryResultName: action.queryName,
                            data
                        });
                    }
                }));
            } else {
                store.dispatch(doGraphQuery(action.queryName, action.graphQuery, (err, response) => {
                    try {
                        if (err) {
                            return {type: DATA_FETCH_FAILED, queryName: action.queryName, error: err};
                        } else {
                            const data = action.postProcessor ? action.postProcessor(response.data['graph'][action.queryResultName], store.getState()) : response.data['graph'][action.queryResultName];
                            return dataFetchSuccess({
                                queryName: action.queryName,
                                queryResultName: action.queryResultName,
                                data
                            });
                        }
                    } catch (err) {
                        return {type: DATA_FETCH_FAILED, queryName: action.queryName, error: err};
                    }
                }));
            }
        } else if (COMMAND_REQUESTED === action.type) {
            next(action);
            store.dispatch(post('service/' + action.name, {
                data: action.payload,
                accept: APPLICATION_AMF,
                contentType: APPLICATION_AMF
            }, (err, response) => {
                if (err) {
                    return {type: COMMAND_FAILED, name: action.name, error: err};
                } else {
                    const callbackActions = [{
                        type: COMMAND_SUCCESS,
                        name: action.name,
                        payload: action.payload,
                        response: response,
                        callCountName: action.callCountName
                    }];
                    if(action.responseHandler) {
                        callbackActions.push(commandResponseHandler(action.responseHandler, console.log.bind(console))(response));
                    }
                    return callbackActions;
                }
            }));
        } else if (SIGNOUT_REQUESTED === action.type) {
            next(del('service/identity', {}, () => {
                return signoutSuccess();
            }));
        } else {
            next(action);
        }
    }
});

const doGraphQuery = (queryName, query, responseHandler) => {
    return post(`graph?name=${queryName}`, {
        data: "\"" + createGraphQuery(query) + "\"",
        accept: APPLICATION_AMF,
        contentType: TEXT_PLAIN
    }, responseHandler);
};

export const createGraphQuery = query => {
    let obj = query;
    query = '{ graph ';
    const print = (obj) => {
        if (obj.constructor === Array) {
            query += '(';
            Object.keys(obj[0]).forEach((key) => {
                let value = obj[0][key];
                if (typeof value === 'string') {
                    value = "\\\"" + value + "\\\"";
                }
                query += key + ': ' + value;
            });
            query += ') ';
            print(obj[1]);
        } else if (typeof obj === 'object') {
            query += '{ ';
            Object.keys(obj).forEach((key) => {
                query += key + ' ';
                print(obj[key]);
            });
            query += '} ';
        }
    };
    print(obj);
    query += '}';
    return query;
};

export const commandResponseHandler = (handlerOrFunc, logger) => {
    return result => {
        result = result.data;
        if (typeof handlerOrFunc === 'function') {
            return handlerOrFunc(result);
        } else {
            if (typeof result === 'function') {
                return result(handlerOrFunc);
            } else {
                try {
                    var results = [];
                    result.forEach(item => {
                        if (item['methodCall'] || !item.hasOwnProperty('methodCall')) {
                            let m = handlerOrFunc[item.name];
                            if (typeof m === 'undefined') {
                                // check for default handler (denoted by '_')
                                m = handlerOrFunc['_'];
                                if (typeof m === 'undefined') {
                                    logger(`MethodNotFound : \'${item.name}\' on `, handlerOrFunc);
                                } else {
                                    // call default handler
                                    results.push(m.apply(null, [item.name, item.args]));
                                }
                            } else {
                                results.push(m.apply(null, item.args));
                            }
                        } else {
                            handlerOrFunc[item.name] = item.args.length == 1 ? item.args[0] : item.args;
                        }
                    });
                    if (typeof results[0] === 'undefined') {
                        logger('warning: api result is undefined.');
                    }
                    return results[0];
                } catch (err) {
                    logger(err.stack);
                }
            }
        }
    };
};