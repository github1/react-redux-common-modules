import { createModule } from '@github1/redux-modules';
import { Action, Dispatch, MiddlewareAPI } from 'redux';
import {
  init as AjaxService,
  AjaxServiceRequestOptions,
  AjaxServiceRequestOptionsBase,
  AjaxServiceResponse,
} from '@github1/ajax-service';
import { Optional } from 'utility-types';
import { URL } from 'url-shim';

export const AJAX_CALL_REQUESTED = '@AJAX/CALL_REQUESTED';
export const AJAX_CALL_SENT = '@AJAX/CALL_SENT';
export const AJAX_CALL_COMPLETE = '@AJAX/CALL_COMPLETE';
export const AJAX_CALL_SUCCESS = '@AJAX/CALL_SUCCESS';
export const AJAX_CALL_FAILED = '@AJAX/CALL_FAILED';
export const AJAX_CALL_RETRIED = '@AJAX/CALL_RETRIED';
export const AJAX_CALL_SLOW = '@AJAX/CALL_SLOW';
export const AJAX_CALL_STATS = '@AJAX/CALL_STATS';

export const APPLICATION_JSON = 'application/json';
export const APPLICATION_AMF = 'application/x-amf';
export const TEXT_PLAIN = 'text/plain';

type AjaxModuleStubData<TType> =
  | Partial<TType>
  | PromiseLike<TType>
  | ((opts: AjaxServiceRequestOptions) => Partial<TType> | PromiseLike<TType>);

export type AjaxSender = {
  send(options: AjaxServiceRequestOptions): Promise<AjaxServiceResponse>;
};

export type AjaxCallRequestedActionWithParsedUrl = AjaxCallRequestedAction['payload'] & {
  parsedUrl: URL;
};

export type AjaxCallOpts = {
  ajaxSender?: AjaxSender;
  slowCallThreshold?: number;
};

export type AjaxCallback = (
  err?: Error & { status?: any },
  resp?: AjaxServiceResponse
) => Action | Array<Action> | void;

const callbacks: { [key: string]: AjaxCallback } = {};
const callStoreRefs: { [key: string]: MiddlewareAPI } = {};
const callTimeouts: { [key: string]: number } = {};
const slowCalls: { [key: string]: boolean } = {};
const retriedCalls: { [key: string]: number } = {};

export interface AjaxCallRequestedAction
  extends Action<typeof AJAX_CALL_REQUESTED> {
  payload: {
    id: string;
    method: string;
    url: string;
    headers: Record<string, string>;
    data: any;
  };
}

export interface AjaxCallSentAction extends Action<typeof AJAX_CALL_SENT> {
  payload: AjaxCallRequestedAction['payload'];
}

export interface AjaxCallSuccessAction
  extends Action<typeof AJAX_CALL_SUCCESS> {
  payload: {
    id: string;
    response: AjaxServiceResponse;
  };
}

export interface AjaxCallFailedAction extends Action<typeof AJAX_CALL_FAILED> {
  payload: {
    id: string;
    status: number;
    error: any;
  };
}

export interface AjaxCallRetriedAction
  extends Action<typeof AJAX_CALL_RETRIED> {
  payload: {
    id: string;
    opts: AjaxServiceRequestOptionsBase;
    attemptNumber: number;
    numOfAttempts: number;
    error: any;
  };
}

export interface AjaxCallSlowAction extends Action<typeof AJAX_CALL_SLOW> {
  payload: {
    id: string;
    opts: any;
    duration: any;
  };
}

export interface AjaxCallStatsAction extends Action<typeof AJAX_CALL_STATS> {
  payload: {
    maxCurrentRetryAttempts: number;
    numSlow: number;
  };
}

export interface AjaxCallCompleteAction
  extends Action<typeof AJAX_CALL_COMPLETE> {
  payload: {
    id: string;
    request: AjaxCallRequestedActionWithParsedUrl;
    status: number;
  };
}

function invokeCallback(
  id: string,
  dispatch: Dispatch,
  reportCallStatusActionCreator: () => Action,
  err: Error,
  resp?: any
) {
  const callback: AjaxCallback = callbacks[id];
  clearTimeout(callTimeouts[id]);
  delete callStoreRefs[id];
  delete callTimeouts[id];
  delete slowCalls[id];
  delete retriedCalls[id];
  dispatch(reportCallStatusActionCreator());
  if (callback) {
    delete callbacks[id];
    const action = callback(err, resp);
    if (action) {
      if (Array.isArray(action)) {
        action.forEach((action) => {
          if (action) {
            dispatch(action);
          }
        });
      } else {
        dispatch(action);
      }
    }
  }
}

let stubbedAjaxSender: AjaxSender;
let stubLoggingEnabled: boolean = false;

const ajaxModule = createModule('ajax', {
  initializer(opts: AjaxCallOpts = {}) {
    if (!opts.slowCallThreshold) {
      opts.slowCallThreshold = 1000;
    }
    if (!opts.ajaxSender) {
      opts.ajaxSender = AjaxService();
    }
    return opts;
  },
  actionCreators: {
    send(
      method: string,
      url: string,
      optsOrCallback?:
        | Omit<AjaxServiceRequestOptions, 'method' | 'url'>
        | AjaxCallback,
      callback?: AjaxCallback
    ): AjaxCallRequestedAction {
      let opts: AjaxServiceRequestOptions;
      if (typeof optsOrCallback === 'function') {
        callback = optsOrCallback;
        opts = { method, url };
      } else {
        opts = { ...optsOrCallback, method, url };
      }
      opts.method = method.toUpperCase();
      opts.id = `call-${generateCallID()}`;
      opts.configs = opts.configs || [];
      opts.configs.unshift({
        onRequest: (req, { retryState, next }) => {
          const store = callStoreRefs[req.id];
          const { attemptNumber, numOfAttempts, err } = retryState;
          if (store) {
            retriedCalls[opts.id] = attemptNumber;
            store.dispatch(
              this.retried(opts.id, req, attemptNumber, numOfAttempts, err)
            );
            store.dispatch(this.reportCallStats());
          }
          return next(req);
        },
      });
      callbacks[opts.id] = callback;
      return {
        type: AJAX_CALL_REQUESTED,
        payload: {
          url,
          id: opts.id,
          headers: opts.headers || {},
          data: opts.data || undefined,
          ...opts,
        },
      };
    },
    get(
      url: string,
      opts?: AjaxCallback | Omit<AjaxServiceRequestOptions, 'method' | 'url'>,
      callback?: AjaxCallback
    ): AjaxCallRequestedAction {
      if (typeof opts === 'function') {
        callback = opts;
        opts = {};
      }
      return this.send('GET', url, opts, callback);
    },
    post(
      url: string,
      opts?: AjaxCallback | Omit<AjaxServiceRequestOptions, 'method' | 'url'>,
      callback?: AjaxCallback
    ): AjaxCallRequestedAction {
      if (typeof opts === 'function') {
        callback = opts;
        opts = {};
      }
      return this.send('POST', url, opts, callback);
    },
    del(
      url: string,
      opts?: Omit<AjaxServiceRequestOptions, 'method' | 'url'>,
      callback?: AjaxCallback
    ) {
      return this.send('DELETE', url, opts, callback);
    },
    sent(request: AjaxCallRequestedAction['payload']): AjaxCallSentAction {
      return { type: AJAX_CALL_SENT, payload: request };
    },
    complete(
      id: string,
      request: AjaxCallRequestedAction['payload'],
      status: number
    ): AjaxCallCompleteAction {
      let parsed: URL = null;
      try {
        parsed = new URL(request.url);
      } catch (err) {
        // ignore
      }
      return {
        type: AJAX_CALL_COMPLETE,
        payload: { id, request: { ...request, parsedUrl: parsed }, status },
      };
    },
    success(
      id: string,
      response: Optional<AjaxServiceResponse, 'headers'>
    ): AjaxCallSuccessAction {
      return {
        type: AJAX_CALL_SUCCESS,
        payload: { id, response: response as AjaxServiceResponse },
      };
    },
    failed(id: string, error: Error): AjaxCallFailedAction {
      return {
        type: AJAX_CALL_FAILED,
        payload: { id, status: 0, error },
      };
    },
    retried(
      id: string,
      opts,
      attemptNumber,
      numOfAttempts,
      error
    ): AjaxCallRetriedAction {
      return {
        type: AJAX_CALL_RETRIED,
        payload: {
          id,
          opts,
          attemptNumber,
          numOfAttempts,
          error,
        },
      };
    },
    reportSlowCall(
      id: string,
      opts,
      duration: number = -1
    ): AjaxCallSlowAction {
      return {
        type: AJAX_CALL_SLOW,
        payload: {
          id,
          opts,
          duration,
        },
      };
    },
    reportCallStats(): AjaxCallStatsAction {
      return {
        type: AJAX_CALL_STATS,
        payload: {
          maxCurrentRetryAttempts: Object.keys(retriedCalls).reduce(
            (max, retriedCall) => Math.max(max, retriedCalls[retriedCall]),
            0
          ),
          numSlow: Object.keys(slowCalls).length,
        },
      };
    },
  },
})
  .configure(() => {
    stubbedAjaxSender = null;
  })
  .on((store) => (next) => (action) => {
    const { slowCallThreshold } = store.props;
    if (action.type === AJAX_CALL_REQUESTED) {
      callStoreRefs[action.payload.id] = store as MiddlewareAPI;
      if (typeof window !== 'undefined') {
        callTimeouts[action.payload.id] = window.setTimeout(() => {
          // Handle call timeout
          slowCalls[action.payload.id] = true;
          store.dispatch(store.actions.reportCallStats());
          store.dispatch(
            store.actions.reportSlowCall(
              action.payload.id,
              action.payload,
              slowCallThreshold
            )
          );
        }, slowCallThreshold);
      }
      next(action);
      next(store.actions.sent(action.payload));
      (stubbedAjaxSender || store.props.ajaxSender)
        .send(action.payload)
        .then((resp: AjaxServiceResponse) => {
          if (typeof resp === 'function') {
            resp = (resp as any)(action);
          }
          store.dispatch(
            store.actions.complete(
              action.payload.id,
              action.payload,
              resp.status
            )
          );
          store.dispatch(store.actions.success(action.payload.id, resp));
        })
        .catch(
          (maybeErr: (Error & { status?: any }) | ((a: Action) => Error)) => {
            let err: Error & { status?: any };
            if (typeof maybeErr === 'function') {
              try {
                err = maybeErr(action);
              } catch (errFuncErr) {
                err = errFuncErr;
              }
            } else {
              err = maybeErr;
            }
            store.dispatch(
              store.actions.complete(
                action.payload.id,
                action.payload,
                err.status
              )
            );
            store.dispatch(store.actions.failed(action.payload.id, err));
          }
        );
    } else if (action.type === AJAX_CALL_SUCCESS) {
      next(action);
      invokeCallback(
        action.payload.id,
        store.dispatch.bind(store),
        store.actions.reportCallStats,
        null,
        action.payload.response
      );
    } else if (action.type === AJAX_CALL_FAILED) {
      next(action);
      invokeCallback(
        action.payload.id,
        store.dispatch.bind(store),
        store.actions.reportCallStats,
        action.payload.error
      );
    } else {
      next(action);
    }
  });

ajaxModule as any;

type AjaxStubbing = {
  logStubs(value: boolean): void;
  forceResolve(value: AjaxModuleStubData<Partial<AjaxServiceResponse>>): void;
  forceReject(
    value: AjaxModuleStubData<Partial<AjaxServiceResponse | Error>>
  ): void;
  resetStub(): void;
};

function addStubbing(
  mod: typeof ajaxModule & Partial<AjaxStubbing>
): typeof ajaxModule & AjaxStubbing {
  mod.logStubs = (value: boolean) => {
    stubLoggingEnabled = value;
  };
  mod.forceResolve = (
    value: AjaxModuleStubData<Partial<AjaxServiceResponse>>
  ) => {
    const description = [value, '\nfrom:', getCaller()];
    if (stubLoggingEnabled) {
      console.log('Setting forceResolve:\n', ...description);
    }
    stubbedAjaxSender = {
      send: (opts: AjaxServiceRequestOptions) => {
        if (stubLoggingEnabled) {
          console.log('Running forceResolve:\n', ...description);
        }
        return Promise.resolve(
          (typeof value === 'function'
            ? value(opts as AjaxServiceRequestOptions)
            : value) as AjaxServiceResponse
        );
      },
    };
  };
  mod.forceReject = (
    value: AjaxModuleStubData<Partial<AjaxServiceResponse | Error>>
  ) => {
    const description = [value, '\nfrom:', getCaller()];
    if (stubLoggingEnabled) {
      console.log('Setting forceReject:\n', ...description);
    }
    stubbedAjaxSender = {
      send: (opts: AjaxServiceRequestOptions) => {
        if (stubLoggingEnabled) {
          console.log('Running forceReject:\n', ...description);
        }
        try {
          return Promise.reject(
            (typeof value === 'function'
              ? value(opts as AjaxServiceRequestOptions)
              : value) as AjaxServiceResponse | Error
          );
        } catch (err) {
          return Promise.reject(err);
        }
      },
    };
  };
  mod.resetStub = () => {
    stubbedAjaxSender = null;
  };
  return mod as typeof ajaxModule & AjaxStubbing;
}

export const ajax = addStubbing(ajaxModule);

const getCaller = () => {
  try {
    throw new Error('');
  } catch (err) {
    return `${
      err.stack
        .split(/\n/)[3]
        .trim()
        .split(' ')
        .filter((part: string) => /.*[0-9]+:[0-9]+\)?$/.test(part))[0]
    }`.replace(/^\(|\)$/g, '');
  }
};

const generateCallID = (): string => {
  const s4 = () =>
    Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  return (
    s4() +
    s4() +
    '-' +
    s4() +
    '-' +
    s4() +
    '-' +
    s4() +
    '-' +
    s4() +
    s4() +
    s4()
  );
};
