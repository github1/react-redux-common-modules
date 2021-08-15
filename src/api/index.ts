import {
  ActionsOrThunks,
  Module
} from '@github1/redux-modules';
import {AnyAction} from 'redux';
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
  username : string;
  password : string;
}

export const authenticate = () => {
  return {type: AUTHENTICATE_REQUESTED}
};

export const authenticateWithUsernamePassword = ({
                                                   username,
                                                   password
                                                 } : AuthenticateOptions) => {
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

export interface DataFetchSuccessHandler {
  (result : DataFetchSuccess, state : any) : ActionsOrThunks | void;
}

export interface DataFetchFailedHandler {
  (result : DataFetchFailed, state : any) : ActionsOrThunks | void;
}

export interface DataFetchHandler {
  onSuccess? : DataFetchSuccessHandler;
  onFailed? : DataFetchFailedHandler;
}

const dataFetchHandlers : { [key : string] : Array<DataFetchHandler> } = {};

export const invalidatePrefetchCache = (key : string = null) => {
  return {
    type: INVALIDATE_PREFETCH_CACHE,
    key
  }
};

export interface DataFetchRequested {
  type : string;
  dataFetchId : string;
  url : string;
  queryName : string;
  queryResultName? : string;
  tag? : string;
  staticData? : any;
  graphQuery? : any;
  postProcessor? : (data : any, state? : any) => any;
}

export interface DataFetchPostProcessor<T, S = any> {
  (data : T[], state? : S) : any
}

export interface DataFetchQueryRoot<T, A = any> {
  [name : string] : Partial<T> | [A, Partial<T>]
}

export interface DataFetchQueryNamedDefinition<S extends DataFetchQueryRoot<T, A>, T, A = any> {
  name? : string;
  schema : S;
  postProcessor? : DataFetchPostProcessor<T>;
}

type DataFetchQueryDefinition<S extends DataFetchQueryRoot<T, A>, T, A = any> =
  DataFetchQueryNamedDefinition<S, T, A>
  | S;

export interface DataFetchRequestBuilder<S extends DataFetchQueryRoot<T>, T, A = any> extends DataFetchRequested {
  fromQuery(graphQueryDefinition : DataFetchQueryDefinition<S, T, A>) : DataFetchRequestBuilder<S, T>;

  fromStaticData(data : any) : DataFetchRequestBuilder<S, T>;

  fromUrl(url : string) : DataFetchRequestBuilder<S, T>;

  withName(name : string) : DataFetchRequestBuilder<S, T>;

  withTag(tag : string) : DataFetchRequestBuilder<S, T>;

  withPostProcessor(postProcessor : DataFetchPostProcessor<T>) : DataFetchRequestBuilder<S, T>;

  onSuccess(handler : DataFetchSuccessHandler) : DataFetchRequestBuilder<S, T>;

  onFailure(handler : DataFetchFailedHandler) : DataFetchRequestBuilder<S, T>;
}

export interface DataFetchSuccess {
  dataFetchId : string;
  queryName : string;
  queryResultName? : string;
  data : any;
}

export interface DataFetchFailed {
  dataFetchId : string;
  queryName : string;
  queryResultName? : string;
  error : any;
}

export const dataFetch = <S extends DataFetchQueryRoot<T>, T>(name? : string) : DataFetchRequestBuilder<S, T> => {
  const fetchId : string = generateDataFetchID();
  const dataFetch : DataFetchRequestBuilder<S, T> = {
    type: DATA_FETCH_REQUESTED,
    dataFetchId: fetchId,
    graphQuery: undefined,
    postProcessor: undefined,
    queryName: name || fetchId,
    queryResultName: name || fetchId,
    staticData: undefined,
    url: undefined,
    fromQuery(graphQueryDefinition : DataFetchQueryDefinition<S, T> | S) : DataFetchRequestBuilder<S, T> {
      dataFetch.graphQuery = graphQueryDefinition.schema ? graphQueryDefinition.schema : graphQueryDefinition;
      dataFetch.postProcessor = graphQueryDefinition.postProcessor as DataFetchPostProcessor<any>;
      dataFetch.queryResultName = Object.keys(dataFetch.graphQuery)[0];
      dataFetch.queryName = (graphQueryDefinition.name || dataFetch.queryResultName) as string;
      return dataFetch;
    },
    fromStaticData(data : any) : DataFetchRequestBuilder<S, T> {
      dataFetch.staticData = data;
      return dataFetch;
    },
    fromUrl(url : string) : DataFetchRequestBuilder<S, T> {
      dataFetch.url = url;
      return dataFetch;
    },
    onFailure(handler : DataFetchFailedHandler) : DataFetchRequestBuilder<S, T> {
      dataFetchHandlers[dataFetch.dataFetchId] = dataFetchHandlers[dataFetch.dataFetchId] || [];
      dataFetchHandlers[dataFetch.dataFetchId].push({onFailed: handler});
      return dataFetch;
    },
    onSuccess(handler : DataFetchSuccessHandler) : DataFetchRequestBuilder<S, T> {
      dataFetchHandlers[dataFetch.dataFetchId] = dataFetchHandlers[dataFetch.dataFetchId] || [];
      dataFetchHandlers[dataFetch.dataFetchId].push({onSuccess: handler});
      return dataFetch;
    },
    withName(name : string) : DataFetchRequestBuilder<S, T> {
      dataFetch.queryName = name;
      return dataFetch;
    },
    withTag(tag : string) : DataFetchRequestBuilder<S, T> {
      dataFetch.tag = tag;
      return dataFetch;
    },
    withPostProcessor(postProcessor : (data : any) => any) : DataFetchRequestBuilder<S, T> {
      dataFetch.postProcessor = postProcessor;
      return dataFetch;
    }
  };
  return dataFetch;
};

export const dataFetchSuccess = ({
                                   dataFetchId,
                                   queryName,
                                   queryResultName,
                                   data
                                 } : DataFetchSuccess) => ({
  type: DATA_FETCH_SUCCESS,
  dataFetchId,
  queryName,
  queryResultName,
  data
});

export const dataFetchFailed = ({
                                  dataFetchId,
                                  queryName,
                                  queryResultName,
                                  error
                                } : DataFetchFailed) => ({
  type: DATA_FETCH_FAILED,
  dataFetchId,
  queryName,
  queryResultName,
  error
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

function toBase64(value) {
  if (typeof btoa === 'undefined') {
    return Buffer.from(value).toString('base64');
  }
  return btoa(value);
}

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
      const headers : { [key : string] : string } = {};
      let mode = action.hasOwnProperty('username') && action.hasOwnProperty('password') ? 'basic-auth' : 'cookie';
      if (action.username && action.password) {
        headers.Authorization = `Basic ${toBase64([action.username.toLowerCase(), action.password].join(':'))}`
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
        const data = action.postProcessor ? action.postProcessor(action.staticData, store.getState()) : action.staticData;
        store.dispatch(dataFetchSuccess({
          dataFetchId: action.dataFetchId,
          queryName: action.queryName,
          data
        }));
      } else if (action.url) {
        store.dispatch(doGetRequest(action.queryName, action.url, store.getState(), (err, response) => {
          if (err) {
            return dataFetchFailed({
              dataFetchId: action.dataFetchId,
              queryName: action.queryName,
              error: err
            });
          } else {
            const data = action.postProcessor ? action.postProcessor(response.data, store.getState()) : response.data;
            return dataFetchSuccess({
              dataFetchId: action.dataFetchId,
              queryName: action.queryName,
              queryResultName: action.queryName,
              data
            });
          }
        }));
      } else {
        store.dispatch(doGraphQuery(action.queryName, action.tag, action.graphQuery, store.getState(), (err, response) => {
          try {
            if (err) {
              return dataFetchFailed({...action, error: err});
            } else {
              const data = action.postProcessor ? action.postProcessor(response.data['graph'][action.queryResultName], store.getState()) : response.data['graph'][action.queryResultName];
              return dataFetchSuccess({
                dataFetchId: action.dataFetchId,
                queryName: action.queryName,
                queryResultName: action.queryResultName,
                data
              });
            }
          } catch (err) {
            return dataFetchFailed({...action, error: err});
          }
        }));
      }
    } else if (DATA_FETCH_SUCCESS === action.type || DATA_FETCH_FAILED === action.type) {
      next(action);
      (dataFetchHandlers[action.dataFetchId] || [])
        .forEach((handler : DataFetchHandler) => {
          let actions : ActionsOrThunks | void = undefined;
          if (DATA_FETCH_SUCCESS === action.type && handler.onSuccess) {
            actions = handler.onSuccess(action, store.getState());
          } else if (DATA_FETCH_FAILED === action.type && handler.onFailed) {
            actions = handler.onFailed(action, store.getState());
          }
          if (actions) {
            (Array.isArray(actions) ? actions : [actions])
              .forEach((handlerAction) => store.dispatch(handlerAction as AnyAction));
          }
        });
      delete dataFetchHandlers[action.dataFetchId];
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
          if (action.responseHandler) {
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

const doGraphQuery = (queryName : string, tag : string, query : any, storeState : any, responseHandler) => {
  const renderedQuery = createGraphQuery(query);
  const queryParams = [`name=${queryName}`];
  if (tag) {
    queryParams.push(`tag=${tag}`);
  }
  return doWithPrefetchCheck(queryName, renderedQuery, post(`graph?${queryParams.join('&')}`, {
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
    if (!obj) {
      return;
    }
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

const generateDataFetchID = () : string => {
  return `df-${Math.floor(Math.random() * 1000000000)}`;
};
