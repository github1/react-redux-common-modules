import {Module} from '@github1/redux-modules';
import {
  APPLICATION_AMF,
  APPLICATION_JSON,
  del,
  get,
  post,
  TEXT_PLAIN
} from '../ajax';

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

export const INVALIDATE_PREFETCH_CACHE = '@API/INVALIDATE_PREFETCH_CACHE';

export interface AuthenticateOptions {
  username: string;
  password: string;
}

export const authenticate = () => {
    return {type: AUTHENTICATE_REQUESTED}
};

export const authenticateWithUsernamePassword = ({username, password} : AuthenticateOptions) => {
  return {type: AUTHENTICATE_REQUESTED, username, password}
};

export const authenticationSuccess = (mode : string, claims : any) => ({
    type: AUTHENTICATE_SUCCESS,
    mode,
    claims
});

export const authenticationFailed = (mode : string, error : Error) => ({
    type: AUTHENTICATE_FAILED,
    mode,
    error
});

export const authorizationFailed = () => ({
    type: AUTHENTICATE_AUTHORIZATION_FAILED
});

export const signout = () => ({type: SIGNOUT_REQUESTED});

export const signoutSuccess = () => ({type: SIGNOUT_SUCCESS});

export const graphQuery = (graphQueryDefinition, queryName?) => {
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

export const getRequest = (url, queryName, postProcessor?) => {
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

export const invalidatePrefetchCache = (key : string = null) => {
  return {
    type: INVALIDATE_PREFETCH_CACHE,
    key
  }
};

export interface DataFetchSuccess {
  queryName : string;
  queryResultName? : string;
  data : any;
}

export const dataFetchSuccess = ({ queryName, queryResultName, data } : DataFetchSuccess) => ({
    type: DATA_FETCH_SUCCESS,
    queryName,
    queryResultName,
    data
});

export const executeCommand = (name, payload, responseHandler?, errorHandler?) => {
  return {
      type: COMMAND_REQUESTED,
      name,
      payload,
      responseHandler,
      errorHandler,
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
    preloadedState: {
        numCallsInProgress: 0,
        callsInProgress: [],
        callCount: {},
        fetching: {}
    },
    reducer: (state, action) => {
        if (/@API.*_REQUESTED$/.test(action.type)) {
            const fetching = {
                fetching: {
                    ...state.fetching
                }
            };
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
            const numCallsInProgress = callsInProgress.length;
            return {
                ...state,
                ...fetching,
                ...callCount,
                numCallsInProgress,
                callInProgress: numCallsInProgress > 0,
                callsInProgress
            }
        } else if (/@API.*_(SUCCESS|FAILED)$/.test(action.type)) {
            const fetching = {
                fetching: {
                    ...state.fetching
                }
            };
            if (action.queryName) {
                fetching.fetching[action.queryName] = false;
            }
            const callName = getCallName(action);
            const callsInProgress = (state.callsInProgress || []).filter(call => call !== callName);
            const numCallsInProgress = callsInProgress.length;
            return {
                ...state,
                ...fetching,
                numCallsInProgress,
                callInProgress: numCallsInProgress > 0,
                callsInProgress
            }
        } else if (INVALIDATE_PREFETCH_CACHE === action.type) {
          const newState = {
            ...state
          };
          if (action.key) {
            delete newState.prefetched[action.key];
          } else {
            delete newState.prefetched;
          }
          return newState;
        }
        return state;
    },
    middleware: store => next => action => {
        if (AUTHENTICATE_REQUESTED === action.type) {
            next(action);
            const headers : { [key: string]: string } = {};
            let mode = action.hasOwnProperty('username') && action.hasOwnProperty('password') ? 'basic-auth' : 'cookie';
            if (action.username && action.password) {
                headers.Authorization = `Basic ${btoa([action.username.toLowerCase(), action.password].join(':'))}`
            }
            store.dispatch(get('service/identity', {
                accept: APPLICATION_AMF,
                headers,
                numOfAttempts: 2
            }, (err, response) => {
                if (err) {
                    return authenticationFailed(mode, err);
                } else {
                    return authenticationSuccess(mode, response.data);
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
                store.dispatch(doGetRequest(action.queryName, action.url, store.getState(), (err, response) => {
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
                store.dispatch(doGraphQuery(action.queryName, action.graphQuery, store.getState(), (err, response) => {
                    try {
                        if (err) {
                            return {...action, type: DATA_FETCH_FAILED, error: err};
                        } else {
                            const data = action.postProcessor ? action.postProcessor(response.data['graph'][action.queryResultName], store.getState()) : response.data['graph'][action.queryResultName];
                            return dataFetchSuccess({
                                queryName: action.queryName,
                                queryResultName: action.queryResultName,
                                data
                            });
                        }
                    } catch (err) {
                        return {...action, type: DATA_FETCH_FAILED, error: err};
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
                const callbackActions = [];
                if (err) {
                    callbackActions.push({...action, type: COMMAND_FAILED, error: err});
                    if (action.errorHandler) {
                        callbackActions.push(action.errorHandler(err));
                    }
                } else {
                    callbackActions.push({
                        type: COMMAND_SUCCESS,
                        name: action.name,
                        payload: action.payload,
                        response: response,
                        callCountName: action.callCountName
                    });
                    if(action.responseHandler) {
                        callbackActions.push(commandResponseHandler(action.responseHandler, console.log.bind(console))(response));
                    }
                }
                return callbackActions;
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

const doGetRequest = (queryName, url, storeState, responseHandler) => {
  return doWithPrefetchCheck(queryName, url, get(url, {
    accept: APPLICATION_JSON,
    contentType: APPLICATION_JSON
  }, responseHandler), storeState, responseHandler);
};

const doGraphQuery = (queryName, query, storeState, responseHandler) => {
    const renderedQuery = createGraphQuery(query);
    return doWithPrefetchCheck(queryName, renderedQuery, post(`graph?name=${queryName}`, {
      data: "\"" + renderedQuery + "\"",
      accept: APPLICATION_AMF,
      contentType: TEXT_PLAIN
    }, responseHandler), storeState, responseHandler);
};

const doWithPrefetchCheck = (queryName, prefetchKey, fetchAction, storeState, responseHandler) => {
  const prefetchedResponse = (storeState.api.prefetched || {})[prefetchKey];
  if (prefetchedResponse) {
    if (typeof window === 'undefined' || storeState.api.usePrefetchedAlways || prefetchedResponse.cache) {
      if (prefetchedResponse.statusCode >= 200 && prefetchedResponse.statusCode < 300 && prefetchedResponse.data) {
        return responseHandler(null, {data: prefetchedResponse.data});
      }
      const error = new Error(`Data fetch for ${queryName} returned ${prefetchedResponse.statusCode}`);
      (error as any).status = prefetchedResponse.statusCode;
      return responseHandler(error, null);
    }
  }
  return fetchAction;
};

export const createGraphQuery = query => {
    let obj = query;
    query = '{ graph ';
    const print = (obj) => {
        if (obj.constructor === Array) {
            query += '(';
            query += Object.keys(obj[0])
                .map((key) => [key, obj[0][key]])
                .filter((pair) => pair[1])
                .map((pair) => {
                let value = pair[1];
                if (typeof value === 'string') {
                    value = "\\\"" + value + "\\\"";
                }
                return pair[0] + ': ' + value;
            }).join(', ');
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
                            handlerOrFunc[item.name] = item.args.length === 1 ? item.args[0] : item.args;
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
