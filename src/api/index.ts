import { createModule, isAction } from '@github1/redux-modules';
import { Action, AnyAction, Dispatch } from 'redux';
import { AjaxServiceResponse } from '@github1/ajax-service';
import {
  ajax,
  AjaxCallRequestedAction,
  AjaxCallback,
  AjaxServiceError,
  APPLICATION_AMF,
  APPLICATION_JSON,
  TEXT_PLAIN,
} from '../ajax';
export { AjaxServiceError, isAjaxServiceError } from '../ajax';

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
export const ASYNC_CALLBACK_RECEIVED = '@API/ASYNC_CALLBACK_RECEIVED';

export const SIGNOUT_REQUESTED = '@API/SIGNOUT_REQUESTED';
export const SIGNOUT_SUCCESS = '@API/SIGNOUT_SUCCESS';

export const INVALIDATE_PREFETCH_CACHE = '@API/INVALIDATE_PREFETCH_CACHE';

export type ActionsOrThunks = AnyAction | ((...args: any[]) => any);

// Action Types

export type AuthenticationRequestedAction = Action<
  typeof AUTHENTICATE_REQUESTED
> & {
  username?: string;
  password?: string;
};

export type AuthenticationSuccessAction = Action<
  typeof AUTHENTICATE_SUCCESS
> & {
  mode: string;
  claims: any;
};

export type AuthenticationFailedAction = Action<typeof AUTHENTICATE_FAILED> & {
  mode: string;
  error: Error | AjaxServiceError;
};

export type AuthorizationFailedAction = Action<
  typeof AUTHENTICATE_AUTHORIZATION_FAILED
>;

export type SignoutRequestedAction = Action<typeof SIGNOUT_REQUESTED>;

export type SignoutSuccessAction = Action<typeof SIGNOUT_SUCCESS>;

export type InvalidatePrefetchCacheAction = Action<
  typeof INVALIDATE_PREFETCH_CACHE
> & {
  key?: string;
};

export type DataFetchRequestedAction<N> = Action<typeof DATA_FETCH_REQUESTED> & {
  queryName: N;
  dataFetchId?: string;
  url?: string;
  queryResultName?: string;
  tag?: string;
  staticData?: any;
  graphQuery?: any;
  postProcessor?: (data: any, state?: any) => any;
};

export type DataFetchSuccessAction<R, N> = Action<
  typeof DATA_FETCH_SUCCESS
> & {
  dataFetchId: string;
  queryName: N;
  queryResultName: string;
  data: R;
};

export type DataFetchFailedAction<N> = Action<typeof DATA_FETCH_FAILED> & {
  dataFetchId: string;
  queryName: N;
  queryResultName: string;
  error: Error & { status?: any };
};

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

type CommandExecutionRequestedAction = Action<typeof COMMAND_REQUESTED> & {
  name: string;
  payload: any;
  responseHandler: CommandResponseHandler;
  errorHandler: CommandErrorHandler;
  callCountName: string;
};

export type CommandExecutionSuccessAction = Action<typeof COMMAND_SUCCESS> &
  Omit<CommandExecutionRequestedAction, 'type'> & {
    response: AjaxServiceResponse;
    callCountName: string;
  };

export type CommandExecutionFailedAction = Action<typeof COMMAND_FAILED> &
  Omit<CommandExecutionRequestedAction, 'type'> & {
    error: Error & { status?: any };
  };

export type AsyncCallbackReceivedAction = Action<
  typeof ASYNC_CALLBACK_RECEIVED
> & {
  commandRequestId: string;
  asyncResponseId: string;
  name: string;
  args: any[];
};

export type AuthenticateOptions = {
  username: string;
  password: string;
};

export type DataFetchSuccessHandler<R, N> = {
  (result: DataFetchSuccessAction<R, N>, state: any): ActionsOrThunks | void;
};

export type DataFetchFailedHandler<N> = {
  (
    result: DataFetchFailedAction<N>,
    state: any
  ): ActionsOrThunks | void;
};

export type DataFetchHandler<R, N> = {
  onSuccess?: DataFetchSuccessHandler<R, N>;
  onFailed?: DataFetchFailedHandler<N>;
};

const dataFetchHandlers: Record<string, DataFetchHandler<any, any>[]> = {};

export type DataFetchPostProcessor<I, O = I> = {
  (data: I, state?: any): O;
};

// DataFetchContext<TKey, TSchema, undefined, any>

export interface DataFetchRequestBuilder<R, N = string> extends DataFetchRequestedAction<N> {
  fromQuery<T, FR = T extends { _output_type?: infer O } ? O : unknown>(
    query: T
  ): DataFetchRequestBuilder<FR, N>;

  fromStaticData<FR, N>(data: FR): DataFetchRequestBuilder<FR>;

  fromUrl<R, N>(url: string): DataFetchRequestBuilder<R>;

  withName<WN>(name: WN): DataFetchRequestBuilder<R, WN>;

  withTag(tag: string): DataFetchRequestBuilder<R, N>;

  withPostProcessor<FR = R>(
    postProcessor: DataFetchPostProcessor<R, FR>
  ): DataFetchRequestBuilder<FR, N>;

  onSuccess(handler: DataFetchSuccessHandler<R, N>): DataFetchRequestBuilder<R, N>;

  onFailure(handler: DataFetchFailedHandler<N>): DataFetchRequestBuilder<R, N>;
}

function applyDataFetchPostProcessor(
  postProcessor: DataFetchPostProcessor<any>,
  data: any,
  state: any
): any {
  if (data && postProcessor) {
    return postProcessor(data, state);
  }
  return data;
}

const getCallName = (
  action: CommandExecutionRequestedAction | Action<string>
) => {
  let callName = isAction(action, COMMAND_REQUESTED)
    ? action.callCountName
    : '';
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

type ApiModuleState = {
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
      error: Error | AjaxServiceError
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
    graphQuery<T, R = T extends { _output_type?: infer O } ? O : unknown>(
      query: T
    ): DataFetchRequestBuilder<R> {
      return this.dataFetch().fromQuery(query);
    },
    dataFetch(name?: string): DataFetchRequestBuilder<any> {
      const fetchId: string = generateDataFetchID();
      const dataFetch: DataFetchRequestBuilder<any> = {
        type: DATA_FETCH_REQUESTED,
        dataFetchId: fetchId,
        graphQuery: undefined,
        postProcessor: undefined,
        queryName: name || fetchId,
        queryResultName: name || fetchId,
        staticData: undefined,
        url: undefined,
        fromQuery(query: any): DataFetchRequestBuilder<any> {
          let queryKey = Object.keys(query)[0];
          dataFetch.graphQuery = query;
          dataFetch.postProcessor =
            query.postProcessor as DataFetchPostProcessor<any>;
          dataFetch.queryResultName = queryKey;
          dataFetch.queryName = this.queryName || dataFetch.queryResultName;
          return dataFetch as any;
        },
        fromStaticData(data: any): DataFetchRequestBuilder<any> {
          dataFetch.staticData = data;
          return dataFetch as any;
        },
        fromUrl(url: string): DataFetchRequestBuilder<any> {
          dataFetch.url = url;
          return dataFetch;
        },
        onFailure(
          handler: DataFetchFailedHandler<any>
        ): DataFetchRequestBuilder<any> {
          dataFetchHandlers[dataFetch.dataFetchId] =
            dataFetchHandlers[dataFetch.dataFetchId] || [];
          dataFetchHandlers[dataFetch.dataFetchId].push({ onFailed: handler });
          return dataFetch;
        },
        onSuccess(
          handler: DataFetchSuccessHandler<any, string>
        ): DataFetchRequestBuilder<any> {
          dataFetchHandlers[dataFetch.dataFetchId] =
            dataFetchHandlers[dataFetch.dataFetchId] || [];
          dataFetchHandlers[dataFetch.dataFetchId].push({ onSuccess: handler });
          return dataFetch;
        },
        withName<WN>(name: WN): DataFetchRequestBuilder<any, WN> {
          dataFetch.queryName = `${name}`;
          return dataFetch as any;
        },
        withTag(tag: string): DataFetchRequestBuilder<any> {
          dataFetch.tag = tag;
          return dataFetch;
        },
        withPostProcessor(
          postProcessor: DataFetchPostProcessor<any>
        ): DataFetchRequestBuilder<any> {
          dataFetch.postProcessor = postProcessor;
          return dataFetch as any;
        },
      };
      return dataFetch as any;
    },
    dataFetchSuccess({
      dataFetchId,
      queryName,
      queryResultName,
      data,
    }: Omit<DataFetchSuccessAction<any, any>, 'type'>): DataFetchSuccessAction<any, any> {
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
    }: Omit<DataFetchFailedAction<any>, 'type'>): DataFetchFailedAction<any> {
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
      responseHandler?: CommandResponseHandler,
      errorHandler?: CommandErrorHandler
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
    asyncCallbackReceived(
      commandRequestId: string,
      asyncResponseId: string,
      name: string,
      args: any[]
    ): AsyncCallbackReceivedAction {
      return {
        type: ASYNC_CALLBACK_RECEIVED,
        commandRequestId,
        asyncResponseId,
        name,
        args,
      };
    },
  },
})
  .reduce((state: ApiModuleState, action) => {
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
  .on((store) => (next) => (action) => {
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
            retry: {
              attempts: 2
            }
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
                    response.data,
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
        (handler: DataFetchHandler<any, any>) => {
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
      // generate a command request id
      const commandRequestId: string = generateID('cr');
      // store the response handler so it is available
      // when any async responses arrive
      storeCommandResponseHandlerWithDispatch(commandRequestId, {
        commandResponseHandler: action.responseHandler,
        dispatch: store.dispatch.bind(store),
      });
      setTimeout(() => {
        // remove stored handler after a minute (i.e. async responses should be within a minute)
        delete asyncCallbackHandlerOrFuncStore[commandRequestId];
      }, 60000);
      store.dispatch(
        post(
          'service/' + action.name,
          {
            data: action.payload,
            accept: APPLICATION_AMF,
            contentType: APPLICATION_AMF,
            headers: {
              'x-command-request-id': commandRequestId,
            },
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
    } else if (ASYNC_CALLBACK_RECEIVED === action.type) {
      // Invoke the async callback
      invokeAsyncCallbackHandlerOrFunc(action.commandRequestId, {
        name: action.name,
        args: action.args,
      });
    } else if (SIGNOUT_REQUESTED === action.type) {
      next(action);
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
        data: renderedQuery,
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

export const createGraphQuery = (obj: any, depth: number = 0) => {
  let output = '';
  if (typeof obj === 'string') {
    return obj;
  } else if (Array.isArray(obj)) {
    output +=
      '{ ' +
      obj.map((item) => createGraphQuery(item, depth + 1)).join(' ') +
      ' }';
  } else {
    if (obj.args && obj.schema) {
      output += '(';
      output += Object.keys(obj.args)
        .map((argKey) => ({ key: argKey, value: obj.args[argKey] }))
        .filter((argItem) => argItem.value !== null && argItem.value !== undefined)
        .map((argItem) => {
          const value = argItem.value;
          const queryValue = typeof value === 'string' ? `"${value}"` : value;
          return `${argItem.key}: ${queryValue}`;
        })
        .join(', ');
      output += ') ' + createGraphQuery(obj.schema, depth + 1);
    } else {
      if (depth === 0) {
        output += '{ ';
      }
      output += Object.keys(obj)
        .map(
          (propKey) => `${propKey} ${createGraphQuery(obj[propKey], depth + 1)}`
        )
        .join(' ');
      if (depth === 0) {
        output += ' }';
      }
    }
  }
  return output;
};

type CommandResponseHandlerWithDispatch = {
  commandResponseHandler: CommandResponseHandler;
  dispatch: Dispatch<Action>;
};

const asyncCallbackHandlerOrFuncStore: Record<
  string,
  CommandResponseHandlerWithDispatch
> = {};

export function storeCommandResponseHandlerWithDispatch(
  commandRequestId: string,
  commandResponseHandlerWithDispatch: CommandResponseHandlerWithDispatch
) {
  if (!commandResponseHandlerWithDispatch.commandResponseHandler) {
    // do not store if commandResponseHandler is undefined
    return;
  }
  // store the handlerOrFunc until the commandResponseResultItem is received
  asyncCallbackHandlerOrFuncStore[commandRequestId] =
    commandResponseHandlerWithDispatch;
}

export function invokeAsyncCallbackHandlerOrFunc(
  commandRequestId: string,
  commandResponseResultItem: CommandResponseResultItem
) {
  if (asyncCallbackHandlerOrFuncStore[commandRequestId]) {
    const commandResponseHandlerWithDispatch: CommandResponseHandlerWithDispatch =
      asyncCallbackHandlerOrFuncStore[commandRequestId];
    commandResponseHandlerWithDispatch.dispatch(
      commandResponseHandler(
        commandResponseHandlerWithDispatch.commandResponseHandler,
        console.log.bind(console)
      )({ data: [commandResponseResultItem] })
    );
  }
}

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
              // check for handler for item name
              let m = handlerOrFunc[item.name];
              if (typeof m === 'undefined') {
                // if named handler not found, check for default handler (denoted by '_')
                m = handlerOrFunc['_'];
                if (typeof m === 'undefined') {
                  // no handler methods found
                  logger(
                    `MethodNotFound : \'${item.name}\' on `,
                    handlerOrFunc
                  );
                } else {
                  // call default handler
                  results.push(m.apply(null, [item.name, item.args]));
                }
              } else {
                // call named handler
                results.push(m.apply(null, item.args));
              }
            } else {
              // if not a methodCall, treat as property setter
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

const generateID = (prefix?: string): string => {
  return `${prefix ? `${prefix}-` : ''}${Math.floor(
    Math.random() * 1000000000
  )}`;
};

const generateDataFetchID = (): string => {
  return generateID('df');
};
