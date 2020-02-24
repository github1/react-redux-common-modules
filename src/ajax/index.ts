import {Module} from '@github1/redux-modules';
import {
  Action,
  Dispatch,
  Store
} from 'redux';

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

export interface AjaxCallOpts {
  slowCallThreshold? : number;
}

export type AjaxCallback = (err? : Error, resp? : any) => Action | Array<Action> | void;

const callbacks : { [key : string] : AjaxCallback } = {};
const callStoreRefs : { [key : string] : Store } = {};
const callTimeouts : { [key : string] : number } = {};
const slowCalls : { [key : string] : boolean } = {};
const retriedCalls : { [key : string] : number } = {};

export interface AjaxCallRequestedAction extends Action<typeof AJAX_CALL_REQUESTED> {
  payload : {
    id : string
  }
}

export interface AjaxCallSuccessAction extends Action<typeof AJAX_CALL_SUCCESS> {
  payload : {
    id : string,
    response : any
  }
}

export interface AjaxCallFailedAction extends Action<typeof AJAX_CALL_FAILED> {
  payload : {
    id : string,
    error : any
  }
}

export interface AjaxCallRetriedAction extends Action<typeof AJAX_CALL_RETRIED> {
  payload : {
    id : string,
    opts : any,
    attemptNumber : number,
    numOfAttempts : number,
    error : any
  }
}

export interface AjaxCallSlowAction extends Action<typeof AJAX_CALL_SLOW> {
  payload : {
    id : string,
    opts : any,
    duration : any
  }
}

export interface AjaxCallStatsAction extends Action<typeof AJAX_CALL_STATS> {
  payload : {
    maxCurrentRetryAttempts : number,
    numSlow : number
  }
}

export type AjaxCallAction =
  AjaxCallRequestedAction
  | AjaxCallSuccessAction
  | AjaxCallFailedAction;

const send = (method : string, url : string, opts : any, callback? : AjaxCallback) => {
  if (typeof opts === 'function') {
    callback = opts;
    opts = {};
  }
  opts.method = method.toUpperCase();
  opts.id = `call-${generateCallID()}`;
  opts.interceptors = opts.interceptors || [];
  opts.interceptors.push({
    onRetry: (err, attemptNumber, numOfAttempts, fetchOpts) => {
      const store = callStoreRefs[opts.id];
      if (store) {
        retriedCalls[opts.id] = attemptNumber;
        store.dispatch(retried(opts.id, fetchOpts, attemptNumber, numOfAttempts, err));
        store.dispatch(reportCallStats());
      }
    }
  });
  callbacks[opts.id] = callback;
  return {
    type: AJAX_CALL_REQUESTED,
    payload: {url, ...opts}
  }
};

const sendMethod = (method : string) => (url : string, opts : any, callback? : AjaxCallback) => send(method, url, opts, callback);

export const get = sendMethod('get');

export const post = sendMethod('post');

export const del = sendMethod('delete');

const sent = opts => ({type: AJAX_CALL_SENT, payload: opts});

const complete = (id, request, status) => ({
  type: AJAX_CALL_COMPLETE,
  payload: {id, request, status}
});

export const success = (id, response) => ({
  type: AJAX_CALL_SUCCESS,
  payload: {id, response}
});

export const failed = (id, error) => ({
  type: AJAX_CALL_FAILED,
  payload: {id, error}
});

export const retried = (id : string, opts, attemptNumber, numOfAttempts, error) : AjaxCallRetriedAction => ({
  type: AJAX_CALL_RETRIED,
  payload: {
    id,
    opts,
    attemptNumber,
    numOfAttempts,
    error
  }
});

const reportSlowCall = (id : string, opts, duration : number = -1) : AjaxCallSlowAction => ({
  type: AJAX_CALL_SLOW,
  payload: {
    id,
    opts,
    duration
  }
});

const reportCallStats = () : AjaxCallStatsAction => ({
  type: AJAX_CALL_STATS,
  payload: {
    maxCurrentRetryAttempts: Object
      .keys(retriedCalls)
      .reduce((max, retriedCall) => Math.max(max, retriedCalls[retriedCall]), 0),
    numSlow: Object.keys(slowCalls).length
  }
});

const invokeCallback = (id : string, dispatch : Dispatch, err : Error, resp? : any) => {
  const callback : AjaxCallback = callbacks[id];
  clearTimeout(callTimeouts[id]);
  delete callStoreRefs[id];
  delete callTimeouts[id];
  delete slowCalls[id];
  delete retriedCalls[id];
  dispatch(reportCallStats());
  if (callback) {
    delete callbacks[id];
    const action = callback(err, resp);
    if (action) {
      if (Array.isArray(action)) {
        action.forEach(action => {
          if (action) {
            dispatch(action);
          }
        });
      } else {
        dispatch(action);
      }
    }
  }
};

export default (ajaxService, opts : AjaxCallOpts = {}) => Module.fromMiddleware((store : Store) => (next : Dispatch) => (action : AjaxCallAction) => {
  opts.slowCallThreshold = opts.slowCallThreshold || 500;
  if (action.type === AJAX_CALL_REQUESTED) {
    callStoreRefs[action.payload.id] = store;
    callTimeouts[action.payload.id] = window.setTimeout(() => {
      slowCalls[action.payload.id] = true;
      store.dispatch(reportCallStats());
      store.dispatch(reportSlowCall(action.payload.id, action.payload, opts.slowCallThreshold));
    }, opts.slowCallThreshold);
    next(action);
    next(sent(action.payload));
    ajaxService
      .send(action.payload)
      .then(resp => {
        if (typeof resp === 'function') {
          resp = resp(action);
        }
        store.dispatch(complete(action.payload.id, action.payload, resp.status));
        store.dispatch(success(action.payload.id, resp));
      })
      .catch(err => {
        if (typeof err === 'function') {
          try {
            err = err(action);
          } catch (errFuncErr) {
            err = errFuncErr;
          }
        }
        store.dispatch(complete(action.payload.id, action.payload, err.status));
        store.dispatch(failed(action.payload.id, err));
      });
  } else if (action.type === AJAX_CALL_SUCCESS) {
    next(action);
    invokeCallback(action.payload.id, store.dispatch.bind(store), null, action.payload.response);
  } else if (action.type === AJAX_CALL_FAILED) {
    next(action);
    invokeCallback(action.payload.id, store.dispatch.bind(store), action.payload.error);
  } else {
    next(action);
  }
});

const generateCallID = () : string => {
  const s4 = () => Math.floor((1 + Math.random()) * 0x10000)
    .toString(16)
    .substring(1);
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
};
