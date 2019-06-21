import { Module } from '@github1/redux-modules';

export const AJAX_CALL_REQUESTED = '@AJAX/CALL_REQUESTED';
export const AJAX_CALL_SENT = '@AJAX/CALL_SENT';
export const AJAX_CALL_COMPLETE = '@AJAX/CALL_COMPLETE';
export const AJAX_CALL_SUCCESS = '@AJAX/CALL_SUCCESS';
export const AJAX_CALL_FAILED = '@AJAX/CALL_FAILED';

export const APPLICATION_JSON = 'application/json';
export const APPLICATION_AMF = 'application/x-amf';
export const TEXT_PLAIN = 'text/plain';

const callbacks = {};

const send = (method, url, opts, callback) => {
    if (typeof opts === 'function') {
        callback = opts;
        opts = {};
    }
    opts.method = method.toUpperCase();
    opts.id = `call-${generateCallID()}`;
    callbacks[opts.id] = callback;
    return {
        type: AJAX_CALL_REQUESTED,
        payload: {url, ...opts}
    }
};

const sendMethod = (method) => (url, opts, callback) => send(method, url, opts, callback);

export const get = sendMethod('get');

export const post = sendMethod('post');

export const del = sendMethod('delete');

const sent = opts => ({type: AJAX_CALL_SENT, payload: opts});

const complete = (id, request, status) => ({type: AJAX_CALL_COMPLETE, payload: {id, request, status}});

export const success = (id, response) => ({
    type: AJAX_CALL_SUCCESS,
    payload: {id, response}
});

export const failed = (id, error) => ({type: AJAX_CALL_FAILED, payload: {id, error}});

const invokeCallback = (id, dispatch, err, resp) => {
    const callback = callbacks[id];
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

export default ajaxService => Module.fromMiddleware(store => next => action => {
    if (action.type === AJAX_CALL_REQUESTED) {
        next(action);
        next(sent(action.payload));
        ajaxService
            .send(action.payload)
            .then(resp => {
                store.dispatch(complete(action.payload.id, action.payload, resp.status));
                store.dispatch(success(action.payload.id, resp));
            })
            .catch(err => {
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

const generateCallID = () => {
    const s4 = () => Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
};
