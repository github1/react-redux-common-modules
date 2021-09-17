import { createModule, isAction } from '@github1/redux-modules';
import { Action, AnyAction } from 'redux';
import { AjaxServiceResponse } from '@github1/ajax-service';
import {
  ajax,
  AjaxCallRequestedAction,
  AjaxCallback,
  APPLICATION_AMF,
  APPLICATION_JSON,
  TEXT_PLAIN,
} from '../ajax';

const { get, del, post } = ajax.actions;

export const AUTHENTICATE_REQUESTED = '@API/AUTHENTICATE_REQUESTED';
export const AUTHENTICATE_SUCCESS = '@API/AUTHENTICATE_SUCCESS';
export const AUTHENTICATE_AUTHORIZATION_FAILED =
  '@API/AUTHENTICATE_AUTHORIZATION_FAILED';
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

export type ActionsOrThunks = AnyAction | ((...args: any[]) => any);

// Action Types

export interface AuthenticationRequestedAction
  extends Action<typeof AUTHENTICATE_REQUESTED> {
  username?: string;
  password?: string;
}

export interface AuthenticationSuccessAction
  extends Action<typeof AUTHENTICATE_SUCCESS> {
  mode: string;
  claims: any;
}

export interface AuthenticationFailedAction
  extends Action<typeof AUTHENTICATE_FAILED> {
  mode: string;
  error: Error & { status?: any };
}

export interface AuthorizationFailedAction
  extends Action<typeof AUTHENTICATE_AUTHORIZATION_FAILED> {}

export interface SignoutRequestedAction
  extends Action<typeof SIGNOUT_REQUESTED> {}

export interface SignoutSuccessAction extends Action<typeof SIGNOUT_SUCCESS> {}

export interface InvalidatePrefetchCacheAction
  extends Action<typeof INVALIDATE_PREFETCH_CACHE> {
  key?: string;
}

export interface DataFetchRequestedAction
  extends Action<typeof DATA_FETCH_REQUESTED> {
  queryName: string;
  dataFetchId?: string;
  url?: string;
  queryResultName?: string;
  tag?: string;
  staticData?: any;
  graphQuery?: any;
  postProcessor?: (data: any, state?: any) => any;
}

export interface DataFetchSuccessAction
  extends Action<typeof DATA_FETCH_SUCCESS> {
  dataFetchId: string;
  queryName: string;
  queryResultName: string;
  data: any;
}

export interface DataFetchFailedAction
  extends Action<typeof DATA_FETCH_FAILED> {
  dataFetchId: string;
  queryName: string;
  queryResultName: string;
  error: Error & { status?: any };
}

type CommandResponseHandler =
  | ((data: any) => ActionsOrThunks)
  | { [k: string]: (data: any) => ActionsOrThunks };

type CommandErrorHandler = (error: Error & { status?: any }) => ActionsOrThunks;

type CommandResponseResult = {
  data:
    | CommandResponseResultItem[]
    | ((handler: CommandResponseHandler) => ActionsOrThunks);
};

type CommandResponseResultItem = {
  methodCall?: boolean;
  name: string;
  args: any[];
};

export interface CommandExecutionRequestedAction
  extends Action<typeof COMMAND_REQUESTED> {
  name: string;
  payload: any;
  responseHandler: CommandResponseHandler;
  errorHandler: CommandErrorHandler;
  callCountName: string;
}

export interface CommandExecutionSuccessAction
  extends Action<typeof COMMAND_SUCCESS>,
    Omit<CommandExecutionRequestedAction, 'type'> {
  response: AjaxServiceResponse;
  callCountName: string;
}

export interface CommandExecutionFailedAction
  extends Action<typeof COMMAND_FAILED>,
    Omit<CommandExecutionRequestedAction, 'type'> {
  error: Error & { status?: any };
}

export interface AuthenticateOptions {
  username: string;
  password: string;
}

export interface DataFetchSuccessHandler {
  (result: DataFetchSuccessAction, state: any): ActionsOrThunks | void;
}

export interface DataFetchFailedHandler {
  (result: DataFetchFailedAction, state: any): ActionsOrThunks | void;
}

export interface DataFetchHandler {
  onSuccess?: DataFetchSuccessHandler;
  onFailed?: DataFetchFailedHandler;
}

const dataFetchHandlers: { [key: string]: Array<DataFetchHandler> } = {};

export interface DataFetchPostProcessor<T, S = any> {
  (data: T[], state?: S): any;
}

type DataFetchQueryRoot<K extends string, T, A = any> = {
  [k in K]: Partial<T> | [A, Partial<T>];
};

export interface DataFetchQueryNamedDefinition<K extends string, T, A = any> {
  name?: string;
  schema: DataFetchQueryRoot<K, T, A>;
  postProcessor?: DataFetchPostProcessor<T>;
}

export type DataFetchQueryDefinition<T, A = any, K extends string = string> =
  | DataFetchQueryNamedDefinition<K, T, A>
  | DataFetchQueryRoot<K, T, A>;

export interface DataFetchRequestBuilder<T, A = any, K extends string = string>
  extends DataFetchRequestedAction {
  fromQuery(
    graphQueryDefinition: DataFetchQueryDefinition<T, A, K>
  ): DataFetchRequestBuilder<T, A, K>;

  fromStaticData(data: any): DataFetchRequestBuilder<T, A, K>;

  fromUrl(url: string): DataFetchRequestBuilder<T, A, K>;

  withName(name: string): DataFetchRequestBuilder<T, A, K>;

  withTag(tag: string): DataFetchRequestBuilder<T, A, K>;

  withPostProcessor(
    postProcessor: DataFetchPostProcessor<T>
  ): DataFetchRequestBuilder<T, A, K>;

  onSuccess(handler: DataFetchSuccessHandler): DataFetchRequestBuilder<T, A, K>;

  onFailure(handler: DataFetchFailedHandler): DataFetchRequestBuilder<T, A, K>;
}

function applyDataFetchPostProcessor(
  postProcessor: DataFetchPostProcessor<any>,
  data: any,
  state: any
): any {
  if (data && postProcessor) {
    const wasArray = Array.isArray(data);
    const result = postProcessor(wasArray ? data : [data], state);
    const resultIsArray = Array.isArray(result);
    if (!wasArray && resultIsArray) {
      return result[0];
    }
    return result;
  }
  return data;
}

const getCallName = (action) => {
  let callName = action.callCountName;
  if (!callName) {
    callName = action.type.replace(/@API\//g, '');
    callName = callName.substring(0, callName.lastIndexOf('_'));
  }
  return callName;
};

function toBase64(value: string) {
  if (typeof btoa === 'undefined') {
    return Buffer.from(value).toString('base64');
  }
  return btoa(value);
}

export type ActionTypes =
  | AuthenticationFailedAction
  | AuthenticationRequestedAction
  | AuthenticationSuccessAction
  | AuthorizationFailedAction
  | CommandExecutionRequestedAction
  | CommandExecutionSuccessAction
  | CommandExecutionFailedAction
  | DataFetchFailedAction
  | DataFetchRequestedAction
  | DataFetchSuccessAction
  | SignoutRequestedAction
  | SignoutSuccessAction
  | InvalidatePrefetchCacheAction;

export type ApiModuleState = {
  numCallsInProgress: number;
  callsInProgress: string[];
  callInProgress: boolean;
  callCount: { [k: string]: number };
  fetching: { [k: string]: boolean };
  prefetched: {
    [k: string]: { cache: boolean; data: any; statusCode: number };
  };
  usePrefetchedAlways: boolean;
};

export const api = createModule('api', {
  actionCreators: {
    authenticate(): AuthenticationRequestedAction {
      return { type: AUTHENTICATE_REQUESTED };
    },
    authenticateWithUsernamePassword({
      username,
      password,
    }: AuthenticateOptions): AuthenticationRequestedAction {
      return { type: AUTHENTICATE_REQUESTED, username, password };
    },
    authenticationSuccess(
      mode: string,
      claims: any
    ): AuthenticationSuccessAction {
      return {
        type: AUTHENTICATE_SUCCESS,
        mode,
        claims,
      };
    },
    authenticationFailed(
      mode: string,
      error: Error & { status?: any }
    ): AuthenticationFailedAction {
      return {
        type: AUTHENTICATE_FAILED,
        mode,
        error,
      };
    },
    authorizationFailed(): AuthorizationFailedAction {
      return {
        type: AUTHENTICATE_AUTHORIZATION_FAILED,
      };
    },
    signout(): SignoutRequestedAction {
      return {
        type: SIGNOUT_REQUESTED,
      };
    },
    signoutSuccess(): SignoutSuccessAction {
      return {
        type: SIGNOUT_SUCCESS,
      };
    },
    invalidatePrefetchCache(key: string = null): InvalidatePrefetchCacheAction {
      return {
        type: INVALIDATE_PREFETCH_CACHE,
        key,
      };
    },
    dataFetch<T, A = any, K extends string = string>(
      name?: string
    ): DataFetchRequestBuilder<T, A, K> {
      const fetchId: string = generateDataFetchID();
      const dataFetch: DataFetchRequestBuilder<T, A, K> = {
        type: DATA_FETCH_REQUESTED,
        dataFetchId: fetchId,
        graphQuery: undefined,
        postProcessor: undefined,
        queryName: name || fetchId,
        queryResultName: name || fetchId,
        staticData: undefined,
        url: undefined,
        fromQuery(
          graphQueryDefinition: DataFetchQueryDefinition<T, A, K>
        ): DataFetchRequestBuilder<T, A, K> {
          const dataFetchQueryNamedDefinition: DataFetchQueryNamedDefinition<
            K,
            T,
            A
          > = graphQueryDefinition as DataFetchQueryNamedDefinition<K, T, A>;
          dataFetch.graphQuery = dataFetchQueryNamedDefinition.schema
            ? dataFetchQueryNamedDefinition.schema
            : graphQueryDefinition;
          dataFetch.postProcessor =
            dataFetchQueryNamedDefinition.postProcessor as DataFetchPostProcessor<any>;
          dataFetch.queryResultName = Object.keys(dataFetch.graphQuery)[0];
          dataFetch.queryName = (dataFetchQueryNamedDefinition.name ||
            dataFetch.queryResultName) as string;
          return dataFetch;
        },
        fromStaticData(data: any): DataFetchRequestBuilder<T, A, K> {
          dataFetch.staticData = data;
          return dataFetch;
        },
        fromUrl(url: string): DataFetchRequestBuilder<T, A, K> {
          dataFetch.url = url;
          return dataFetch;
        },
        onFailure(
          handler: DataFetchFailedHandler
        ): DataFetchRequestBuilder<T, A, K> {
          dataFetchHandlers[dataFetch.dataFetchId] =
            dataFetchHandlers[dataFetch.dataFetchId] || [];
          dataFetchHandlers[dataFetch.dataFetchId].push({ onFailed: handler });
          return dataFetch;
        },
        onSuccess(
          handler: DataFetchSuccessHandler
        ): DataFetchRequestBuilder<T, A, K> {
          dataFetchHandlers[dataFetch.dataFetchId] =
            dataFetchHandlers[dataFetch.dataFetchId] || [];
          dataFetchHandlers[dataFetch.dataFetchId].push({ onSuccess: handler });
          return dataFetch;
        },
        withName(name: string): DataFetchRequestBuilder<T, A, K> {
          dataFetch.queryName = name;
          return dataFetch;
        },
        withTag(tag: string): DataFetchRequestBuilder<T, A, K> {
          dataFetch.tag = tag;
          return dataFetch;
        },
        withPostProcessor(
          postProcessor: DataFetchPostProcessor<T>
        ): DataFetchRequestBuilder<T, A, K> {
          dataFetch.postProcessor = postProcessor;
          return dataFetch;
        },
      };
      return dataFetch;
    },
    dataFetchSuccess({
      dataFetchId,
      queryName,
      queryResultName,
      data,
    }: Omit<DataFetchSuccessAction, 'type'>): DataFetchSuccessAction {
      return {
        type: DATA_FETCH_SUCCESS,
        dataFetchId,
        queryName,
        queryResultName,
        data,
      };
    },
    dataFetchFailed({
      dataFetchId,
      queryName,
      queryResultName,
      error,
    }: Omit<DataFetchFailedAction, 'type'>): DataFetchFailedAction {
      return {
        type: DATA_FETCH_FAILED,
        dataFetchId,
        queryName,
        queryResultName,
        error,
      };
    },
    executeCommand(
      name: string,
      payload: any,
      responseHandler: CommandResponseHandler,
      errorHandler: CommandErrorHandler
    ): CommandExecutionRequestedAction {
      return {
        type: COMMAND_REQUESTED,
        name,
        payload,
        responseHandler,
        errorHandler,
        callCountName: name,
      };
    },
    executeCommandSuccess(
      request: CommandExecutionRequestedAction,
      response: AjaxServiceResponse
    ): CommandExecutionSuccessAction {
      return {
        ...request,
        response,
        type: COMMAND_SUCCESS,
      };
    },
    executeCommandFailed(
      request: CommandExecutionRequestedAction,
      error: Error & { status?: any }
    ): CommandExecutionFailedAction {
      return {
        ...request,
        type: COMMAND_FAILED,
        error,
      };
    },
  },
})
  .reduce((state: ApiModuleState, action: ActionTypes) => {
    if (isAction(action, '@API/*_REQUESTED')) {
      const fetching = {
        fetching: {
          ...state.fetching,
        },
      };
      const callName = getCallName(action);
      const callCount = {
        callCount: {
          ...state.callCount,
          [callName]: !state.callCount[callName]
            ? 1
            : state.callCount[callName] + 1,
        },
      };

      if (DATA_FETCH_REQUESTED === action.type) {
        fetching.fetching[action.queryName] = true;
      }

      const callsInProgress = (state.callsInProgress || []).slice();
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
        callsInProgress,
      };
    } else if (
      isAction(action, '@API/*SUCCESS') ||
      isAction(action, '@API/*FAILED')
    ) {
      const fetching = {
        fetching: {
          ...state.fetching,
        },
      };
      if (isAction(action, '@API/DATA_FETCH*')) {
        if (action.queryName) {
          fetching.fetching[action.queryName] = false;
        }
      }
      const callName = getCallName(action);
      const callsInProgress = (state.callsInProgress || []).filter(
        (call) => call !== callName
      );
      const numCallsInProgress = callsInProgress.length;
      return {
        ...state,
        ...fetching,
        numCallsInProgress,
        callInProgress: numCallsInProgress > 0,
        callsInProgress,
      };
    } else if (INVALIDATE_PREFETCH_CACHE === action.type) {
      const newState = {
        ...state,
      };
      if (action.key) {
        delete newState.prefetched[action.key];
      } else {
        delete newState.prefetched;
      }
      return newState;
    }
    return state;
  })
  .preloadedState({
    numCallsInProgress: 0,
    callsInProgress: [],
    callInProgress: false,
    callCount: {},
    fetching: {},
    prefetched: {},
    usePrefetchedAlways: false,
  })
  .on((store) => (next) => (action: ActionTypes) => {
    if (AUTHENTICATE_REQUESTED === action.type) {
      next(action);
      const headers: { [key: string]: string } = {};
      let mode =
        action.hasOwnProperty('username') && action.hasOwnProperty('password')
          ? 'basic-auth'
          : 'cookie';
      if (action.username && action.password) {
        headers.Authorization = `Basic ${toBase64(
          [action.username.toLowerCase(), action.password].join(':')
        )}`;
      }
      store.dispatch(
        get(
          'service/identity',
          {
            accept: APPLICATION_AMF,
            headers,
            numOfAttempts: 2,
          },
          (err, response) => {
            if (err) {
              return store.actions.authenticationFailed(mode, err);
            } else {
              return store.actions.authenticationSuccess(mode, response.data);
            }
          }
        ) as Action
      );
    } else if (DATA_FETCH_REQUESTED === action.type) {
      next(action);
      if (action.staticData) {
        const data = applyDataFetchPostProcessor(
          action.postProcessor,
          action.staticData,
          store.getState()
        );
        store.dispatch(
          store.actions.dataFetchSuccess({
            dataFetchId: action.dataFetchId,
            queryName: action.queryName,
            queryResultName: action.queryResultName,
            data,
          })
        );
      } else if (action.url) {
        store.dispatch(
          doGetRequest(
            action.queryName,
            action.url,
            store.getState(),
            (err: Error, response) => {
              if (err) {
                return store.actions.dataFetchFailed({
                  dataFetchId: action.dataFetchId,
                  queryName: action.queryName,
                  queryResultName: action.queryResultName,
                  error: err,
                });
              } else {
                console.log(response);
                const data = applyDataFetchPostProcessor(
                  action.postProcessor,
                  response.data,
                  store.getState()
                );
                return store.actions.dataFetchSuccess({
                  dataFetchId: action.dataFetchId,
                  queryName: action.queryName,
                  queryResultName: action.queryName,
                  data,
                });
              }
            }
          ) as Action
        );
      } else {
        store.dispatch(
          doGraphQuery(
            action.queryName,
            action.tag,
            action.graphQuery,
            store.getState(),
            (err: Error, response) => {
              try {
                if (err) {
                  return store.actions.dataFetchFailed({
                    ...action,
                    dataFetchId: action.dataFetchId,
                    queryResultName: action.queryResultName,
                    error: err,
                  });
                } else {
                  const data = applyDataFetchPostProcessor(
                    action.postProcessor,
                    response.data['graph'][action.queryResultName],
                    store.getState()
                  );
                  return store.actions.dataFetchSuccess({
                    dataFetchId: action.dataFetchId,
                    queryName: action.queryName,
                    queryResultName: action.queryResultName,
                    data,
                  });
                }
              } catch (err) {
                return store.actions.dataFetchFailed({
                  ...action,
                  dataFetchId: action.dataFetchId,
                  queryResultName: action.queryResultName,
                  error: err,
                });
              }
            }
          ) as Action
        );
      }
    } else if (
      DATA_FETCH_SUCCESS === action.type ||
      DATA_FETCH_FAILED === action.type
    ) {
      next(action);
      (dataFetchHandlers[action.dataFetchId] || []).forEach(
        (handler: DataFetchHandler) => {
          let actions: ActionsOrThunks | void = undefined;
          if (DATA_FETCH_SUCCESS === action.type && handler.onSuccess) {
            actions = handler.onSuccess(action, store.getState());
          } else if (DATA_FETCH_FAILED === action.type && handler.onFailed) {
            actions = handler.onFailed(action, store.getState());
          }
          if (actions) {
            (Array.isArray(actions) ? actions : [actions]).forEach(
              (handlerAction) => store.dispatch(handlerAction as AnyAction)
            );
          }
        }
      );
      delete dataFetchHandlers[action.dataFetchId];
    } else if (COMMAND_REQUESTED === action.type) {
      next(action);
      store.dispatch(
        post(
          'service/' + action.name,
          {
            data: action.payload,
            accept: APPLICATION_AMF,
            contentType: APPLICATION_AMF,
          },
          (err, response) => {
            const callbackActions = [];
            if (err) {
              callbackActions.push(
                store.actions.executeCommandFailed(action, err)
              );
              if (action.errorHandler) {
                callbackActions.push(action.errorHandler(err));
              }
            } else {
              callbackActions.push({
                type: COMMAND_SUCCESS,
                name: action.name,
                payload: action.payload,
                response: response,
                callCountName: action.callCountName,
              });
              callbackActions.push(
                store.actions.executeCommandSuccess(action, response)
              );
              if (action.responseHandler) {
                callbackActions.push(
                  commandResponseHandler(
                    action.responseHandler,
                    console.log.bind(console)
                  )(response)
                );
              }
            }
            return callbackActions;
          }
        ) as Action
      );
    } else if (SIGNOUT_REQUESTED === action.type) {
      next(
        del('service/identity', {}, () => {
          return store.actions.signoutSuccess();
        })
      );
    } else {
      next(action);
    }
  });

const doGetRequest = (
  queryName: string,
  url: string,
  storeState: { api: ApiModuleState },
  responseHandler: AjaxCallback
) => {
  return doWithPrefetchCheck(
    queryName,
    url,
    get(
      url,
      {
        accept: APPLICATION_JSON,
        contentType: APPLICATION_JSON,
      },
      responseHandler
    ),
    storeState,
    responseHandler
  );
};

const doGraphQuery = (
  queryName: string,
  tag: string,
  query: any,
  storeState: { api: ApiModuleState },
  responseHandler: AjaxCallback
) => {
  const renderedQuery = createGraphQuery(query);
  const queryParams = [`name=${queryName}`];
  if (tag) {
    queryParams.push(`tag=${tag}`);
  }
  return doWithPrefetchCheck(
    queryName,
    renderedQuery,
    post(
      `graph?${queryParams.join('&')}`,
      {
        data: '"' + renderedQuery + '"',
        accept: APPLICATION_AMF,
        contentType: TEXT_PLAIN,
      },
      responseHandler
    ),
    storeState,
    responseHandler
  );
};

const doWithPrefetchCheck = (
  queryName: string,
  prefetchKey: string,
  fetchAction: AjaxCallRequestedAction,
  storeState: { api: ApiModuleState },
  responseHandler: AjaxCallback
) => {
  const prefetchedResponse = (storeState.api.prefetched || {})[prefetchKey];
  if (prefetchedResponse) {
    if (
      typeof window === 'undefined' ||
      storeState.api.usePrefetchedAlways ||
      prefetchedResponse.cache
    ) {
      if (
        prefetchedResponse.statusCode >= 200 &&
        prefetchedResponse.statusCode < 300 &&
        prefetchedResponse.data
      ) {
        return responseHandler(null, {
          data: prefetchedResponse.data,
          status: prefetchedResponse.statusCode,
          headers: {},
        });
      }
      const error = new Error(
        `Data fetch for ${queryName} returned ${prefetchedResponse.statusCode}`
      );
      (error as any).status = prefetchedResponse.statusCode;
      return responseHandler(error, null);
    }
  }
  return fetchAction;
};

export const createGraphQuery = (query) => {
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
            value = '\\"' + value + '\\"';
          }
          return pair[0] + ': ' + value;
        })
        .join(', ');
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

export const commandResponseHandler = (
  handlerOrFunc: CommandResponseHandler,
  logger: (...args: any[]) => void
) => {
  return (commandResult: CommandResponseResult) => {
    const result = commandResult.data;
    if (typeof handlerOrFunc === 'function') {
      return handlerOrFunc(result);
    } else {
      if (typeof result === 'function') {
        return result(handlerOrFunc);
      } else {
        try {
          const results = [];
          result.forEach((item) => {
            // methodCall is a boolean which indicates if the item is
            // intending to invoke a method on the client
            if (item.methodCall || !item.hasOwnProperty('methodCall')) {
              let m = handlerOrFunc[item.name];
              if (typeof m === 'undefined') {
                // check for default handler (denoted by '_')
                m = handlerOrFunc['_'];
                if (typeof m === 'undefined') {
                  logger(
                    `MethodNotFound : \'${item.name}\' on `,
                    handlerOrFunc
                  );
                } else {
                  // call default handler
                  results.push(m.apply(null, [item.name, item.args]));
                }
              } else {
                results.push(m.apply(null, item.args));
              }
            } else {
              handlerOrFunc[item.name] =
                item.args.length === 1 ? item.args[0] : item.args;
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

const generateDataFetchID = (): string => {
  return `df-${Math.floor(Math.random() * 1000000000)}`;
};
