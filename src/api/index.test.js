import api, {
    authenticate,
    signout,
    createGraphQuery,
    graphQuery,
    executeCommand,
    commandResponseHandler
} from './index';
import { apiModuleTestHelper } from './test-helper.js';
import { success, failed } from '../ajax';

describe('api', () => {
    let store;
    beforeEach(() => {
        store = apiModuleTestHelper.createStore();
    });
    describe('authenticate', () => {
        it('can authenticate', () => {
            store.dispatch(authenticate({
                username: 'foo',
                password: 'bar'
            }));
            expect(store.getState().recording.actions[2].type).toBe('@AJAX/CALL_REQUESTED');
            expect(store.getState().recording.actions[2].payload.url).toBe('service/identity');
            expect(store.getState().recording.actions[2].payload.headers.Authorization).toBe('Basic Zm9vOmJhcg==');
            store.dispatch(success(store.getState().recording.actions[2].payload.id, {
                status: 200,
                data: 'abc'
            }));
            expect(store.getState().recording.actions[5].type).toBe('@API/AUTHENTICATE_SUCCESS');
            expect(store.getState().recording.actions[5].claims).toBe('abc');
        });
        it('can fail to authenticate with 401 or 403 status', () => {
            [401, 403].forEach(status => {
                store.dispatch(authenticate({
                    username: 'foo',
                    password: 'bar'
                }));
                const err = new Error('failed');
                err.status = status;
                store.dispatch(failed(store.getState().recording.actions[2].payload.id, err));
                expect(store.getState().recording.actions[5].type).toBe('@API/AUTHENTICATE_FAILED');
            });
        });
        it('can fail to authenticate with an error', () => {
            store.dispatch(authenticate({
                username: 'foo',
                password: 'bar'
            }));
            store.dispatch(failed(store.getState().recording.actions[2].payload.id, new Error('failed')));
            expect(store.getState().recording.actions[5].type).toBe('@API/AUTHENTICATE_FAILED');
        });
        it('can signout', () => {
            store.dispatch(signout());
            expect(store.getState().recording.actions[1].type).toBe('@AJAX/CALL_REQUESTED');
            expect(store.getState().recording.actions[1].payload.method).toBe('DELETE');
        });
    });
    describe('when an api call is requested', () => {
        beforeEach(() => {
            store.dispatch({type: '@API/FOO_REQUESTED'});
        });
        it('sets callInProgress to true', () => {
            expect(store.getState().api.callInProgress).toBe(true);
        });
        it('sets the call count', () => {
            expect(store.getState().api.callCount['FOO']).toBe(1);
            expect(store.getState().api.callsInProgress).toEqual(['FOO']);
        });
    });
    describe('when an api call is successful', () => {
        it('sets callInProgress to false', () => {
            store.dispatch({type: '@API/FOO_SUCCESS'});
            expect(store.getState().api.callInProgress).toBe(false);
        });
    });
    describe('when an api call fails', () => {
        it('sets callInProgress to false', () => {
            store.dispatch({type: '@API/FOO_FAILED'});
            expect(store.getState().api.callInProgress).toBe(false);
        });
    });
    describe('graphQuery', () => {
        it('creates graph queries with quoted string arguments', () => {
            const query = createGraphQuery({
                graphObjects: [{
                    criteria: 'someValue'
                }, {name: ''}]
            });
            expect(query).toBe('{ graph { graphObjects (criteria: \\\"someValue\\\") { name } } }');
        });
        it('creates graph queries', () => {
            const query = createGraphQuery({
                graphObjects: [{
                    criteria: 1
                }, {name: ''}]
            });
            expect(query).toBe('{ graph { graphObjects (criteria: 1) { name } } }');
        });
        describe('prefetchedResponses', () => {
            it('returns prefetched data', () => {
                store = apiModuleTestHelper.createStore({
                    preloadedState: {
                        api: {
                            usePrefetchedAlways: true,
                            prefetched: {
                                "{ graph { graphObjects (criteria: 1) { name } } }": {
                                    data: {graph: {graphObjects: [{name: 'hi'}]}},
                                    statusCode: 200
                                }
                            }
                        }
                    }
                });
                store.dispatch(graphQuery({
                    graphObjects: [{
                        criteria: 1
                    }, {name: ''}]
                }, 'graphObjects'));
                expect(store.getState().recording.findType('@API/DATA_FETCH_SUCCESS')[0].queryName).toBe('graphObjects');
            });
            it('dispatches @API/DATA_FETCH_FAILED on non 200 status', () => {
                store = apiModuleTestHelper.createStore({
                    preloadedState: {
                        api: {
                            usePrefetchedAlways: true,
                            prefetched: {
                                "{ graph { graphObjects (criteria: 1) { name } } }": {
                                    statusCode: 404
                                }
                            }
                        }
                    }
                });
                store.dispatch(graphQuery({
                    graphObjects: [{
                        criteria: 1
                    }, {name: ''}]
                }, 'graphObjects'));
                const dataFetchFailedAction = store.getState().recording.findType('@API/DATA_FETCH_FAILED')[0];
                expect(dataFetchFailedAction.queryName).toBe('graphObjects');
                expect(dataFetchFailedAction.error.status).toBe(404);
            });
        });
    });
    describe('executeCommand', () => {
        it('dispatches an authorizationFailed action for 401 status', () => {
            apiModuleTestHelper.ajaxResponse = DeferredPromise();
            store.dispatch(executeCommand('test/command', {}, {}, (err) => ({type: `SOME_ERROR_${err.status}`})));
            const err = new Error('401');
            err.status = 401;
            return apiModuleTestHelper.ajaxResponse
                .forceReject(err)
                .catch(() => '').then(() => {
                    expect(store.getState().recording.containsType('@API/COMMAND_FAILED')).toBe(true);
                    expect(store.getState().recording.findType('@API/COMMAND_FAILED')[0].error.status).toBe(401);
                    expect(store.getState().recording.containsType('SOME_ERROR_401')).toBe(true);
                });
        });
    });
    describe('commandResponseHandler', () => {
        describe('response is a function', () => {
            it('passes the responseHandler to the function', () => {
                const handler = {};
                const response = jest.fn();
                commandResponseHandler(handler, console.log.bind(console))({data: response});
                expect(response).toHaveBeenCalledWith(handler);
            });
        });
        describe('responseHandler is a function', () => {
            it('passes the response directly to the function', () => {
                const handler = jest.fn();
                commandResponseHandler(handler, console.log.bind(console))({data: 'the res'});
                expect(handler).toHaveBeenCalledWith('the res');
            });
        });
        describe('responseHandler is object', () => {
            it('calls the default handler if none other found', () => {
                const logger = jest.fn();
                const handler = {
                    _: jest.fn(()=> ''),
                    someMethod: jest.fn(()=>''),
                    resultUndefined: jest.fn()
                };
                commandResponseHandler(handler, logger)({
                    data: [
                        {name: 'noMethod', args: ['arg0']},
                        {name: 'someMethod', args: ['arg0']}
                    ]
                });
                expect(handler._).toHaveBeenCalledWith('noMethod', ['arg0']);
                expect(handler.someMethod).toHaveBeenCalledWith('arg0');
            });
            it('warns if no result is returned by the handler', () => {
                const logger = jest.fn();
                const handler = {
                    resultUndefined: jest.fn()
                };
                commandResponseHandler(handler, logger)({
                    data: [
                        {name: 'resultUndefined', args: []}
                    ]
                });
                expect(logger).toHaveBeenCalledWith('warning: api result is undefined.');
            });
            it('can set args on a property', () => {
                const logger = jest.fn();
                const handler = {};
                commandResponseHandler(handler, logger)({
                    data: [
                        {
                            methodCall: false,
                            name: 'someProperty',
                            args: ['aValue']
                        },
                        {
                            methodCall: false,
                            name: 'anotherProperty',
                            args: [1, 2]
                        }
                    ]
                });
                expect(handler.someProperty).toBe('aValue');
                expect(handler.anotherProperty).toEqual([1, 2]);
            });
        });
    });
});