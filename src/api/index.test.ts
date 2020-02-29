import {
  authenticate,
  AUTHENTICATE_FAILED,
  AUTHENTICATE_SUCCESS,
  authenticateWithUsernamePassword,
  COMMAND_FAILED,
  commandResponseHandler,
  createGraphQuery,
  DATA_FETCH_FAILED,
  DATA_FETCH_SUCCESS,
  dataFetch,
  executeCommand,
  invalidatePrefetchCache,
  signout
} from './index';
import {apiModuleTestHelper} from './test-helper';
import {
  AJAX_CALL_REQUESTED,
  failed,
  success
} from '../ajax';

describe('api', () => {
  let store;
  beforeEach(() => {
    store = apiModuleTestHelper.createStore();
  });
  describe('authenticate', () => {
    it('can authenticate with username and password', () => {
      store.dispatch(authenticateWithUsernamePassword({
        username: 'foo',
        password: 'bar'
      }));
      store.getState().recording.findType(AJAX_CALL_REQUESTED, (actions) => {
        expect(actions[0].payload.url).toBe('service/identity');
        expect(actions[0].payload.headers.Authorization).toBe('Basic Zm9vOmJhcg==');
        store.dispatch(success(actions[0].payload.id, {
          status: 200,
          data: 'abc'
        }));
      });
      store.getState().recording.findType(AUTHENTICATE_SUCCESS, (actions) => {
        expect(actions[0].claims).toBe('abc');
      });
    });
    it('can authenticate with a cookie', () => {
      store.dispatch(authenticate());
      store.getState().recording.findType(AJAX_CALL_REQUESTED, (actions) => {
        expect(actions[0].payload.url).toBe('service/identity');
        expect(actions[0].payload.headers.length).toBeUndefined();
        store.dispatch(success(actions[0].payload.id, {
          status: 200,
          data: 'abc'
        }));
      });
      store.getState().recording.findType(AUTHENTICATE_SUCCESS, (actions) => {
        expect(actions[0].claims).toBe('abc');
        expect(actions[0].mode).toBe('cookie');
      });
    });
    it('can fail to authenticate with 401 or 403 status', () => {
      [401, 403].forEach(status => {
        store.dispatch(authenticateWithUsernamePassword({
          username: 'foo',
          password: 'bar'
        }));
        const err = new Error('failed');
        (err as any).status = status;
        store.dispatch(failed(store.getState().recording.findType(AJAX_CALL_REQUESTED).reverse()[0].payload.id, err));
        const authenticateFailedAction = store.getState().recording.findType(AUTHENTICATE_FAILED).reverse()[0];
        expect(authenticateFailedAction.mode).toBe('basic-auth');
        expect(authenticateFailedAction.error.status).toBe(status);
      });
    });
    it('can fail to authenticate with an error', () => {
      store.dispatch(authenticateWithUsernamePassword({
        username: 'foo',
        password: 'bar'
      }));
      store.getState().recording.findType(AJAX_CALL_REQUESTED, (actions) => {
        store.dispatch(failed(actions[0].payload.id, new Error('failed')));
      });
      expect(store.getState().recording.findType(AUTHENTICATE_FAILED).length).toBe(1);
    });
    it('can signout', () => {
      store.dispatch(signout());
      store.getState().recording.findType(AJAX_CALL_REQUESTED, (actions) => {
        expect(actions[0].payload.method).toBe('DELETE');
      });
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
  describe('createGraphQuery', () => {
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
    it('creates graph queries with multiple criteria', () => {
      const query = createGraphQuery({
        graphObjects: [{
          c1: 1,
          c2: true
        }, {name: ''}]
      });
      expect(query).toBe('{ graph { graphObjects (c1: 1, c2: true) { name } } }');
    });
    it('excludes null or undefined arguments', () => {
      const query = createGraphQuery({
        graphObjects: [{
          c1: null,
          c2: undefined,
          c3: 1
        }, {name: ''}]
      });
      expect(query).toBe('{ graph { graphObjects (c3: 1) { name } } }');
    });
  });
  describe('dataFetch.fromQuery', () => {
    it('performs graph queries', async () => {
      const action = dataFetch('foos').fromQuery({
        graphOfObjects: {
          c1: null
        }
      });
      store.dispatch(action);
      apiModuleTestHelper.ajaxResponse.forceResolve({
        data: {
          graph: {
            graphOfObjects: ['graphObj']
          }
        }
      });
      const success = await store.getState().recording.waitForType(DATA_FETCH_SUCCESS);
      expect(success[0].queryName).toBe('graphOfObjects');
      expect(success[0].data[0]).toBe('graphObj');
    });
  });
  describe('dataFetch.fromUrl', () => {
    it('performs GET requests', async () => {
      const action = dataFetch('foos').fromUrl('/foo');
      expect(action.url).toBe('/foo');
      store.dispatch(action);
      apiModuleTestHelper.ajaxResponse.forceResolve({data: 'theFoos'});
      const success = await store.getState().recording.waitForType(DATA_FETCH_SUCCESS);
      expect(success[0].queryName).toBe('foos');
      expect(success[0].data).toBe('theFoos');
    });
  });
  describe('dataFetch.fromStaticData', () => {
    it('returns the supplied data', async () => {
      const action = dataFetch('foos').fromStaticData('theFoosStatic');
      expect(action.staticData).toBe('theFoosStatic');
      store.dispatch(action);
      const success = await store.getState().recording.waitForType(DATA_FETCH_SUCCESS);
      expect(success[0].queryName).toBe('foos');
      expect(success[0].data).toBe('theFoosStatic');
    });
  });
  describe('dataFetch.withPostProcessor', () => {
    it('processes the fetched data', async () => {
      const action = dataFetch('foos')
        .fromStaticData('theFoosStatic')
        .withPostProcessor((data) => `${data}-processed`);
      store.dispatch(action);
      const success = await store.getState().recording.waitForType(DATA_FETCH_SUCCESS);
      expect(success[0].data).toBe('theFoosStatic-processed');
    });
  });
  describe('dataFetch.withName', () => {
    it('uses the name', async () => {
      const action = dataFetch('foos')
        .fromStaticData('theFoosStatic')
        .withName('foo-name');
      store.dispatch(action);
      const success = await store.getState().recording.waitForType(DATA_FETCH_SUCCESS);
      expect(success[0].queryName).toBe('foo-name');
    });
  });
  describe('dataFetch.onSuccess', () => {
    it('runs the onSuccess handler', async () => {
      const action = dataFetch('foos')
        .fromStaticData('theFoosStatic')
        .onSuccess(() => {
          return {
            type: 'SUCCESS_ACTION'
          };
        });
      store.dispatch(action);
      await store.getState().recording.waitForType('SUCCESS_ACTION');
    });
  });
  describe('dataFetch.onFailure', () => {
    it('runs the onSuccess handler', async () => {
      const action = dataFetch('foos')
        .fromUrl('/foo')
        .onFailure(() => {
          return {
            type: 'FAILED_ACTION'
          };
        });
      store.dispatch(action);
      apiModuleTestHelper.ajaxResponse.forceResolve(() => {
        throw new Error('failed')
      });
      await store.getState().recording.waitForType('FAILED_ACTION');
    });
  });
  describe('prefetchedResponses', () => {
    it('returns prefetched data', async () => {
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
      store.dispatch(dataFetch().fromQuery({
        graphObjects: [{
          criteria: 1
        }, {name: ''}]
      }));
      expect(store.getState().recording.findType(DATA_FETCH_SUCCESS)[0].queryName).toBe('graphObjects');
      expect(store.getState().recording.findType(AJAX_CALL_REQUESTED).length).toBe(0);
      store.dispatch(invalidatePrefetchCache());
      store.dispatch(dataFetch().fromQuery({
        graphObjects: [{
          criteria: 1
        }, {name: ''}]
      }));
      expect(store.getState().recording.findType(AJAX_CALL_REQUESTED).length).toBe(1);
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
      store.dispatch(dataFetch().fromQuery({
        graphObjects: [{
          criteria: 1
        }, {name: ''}]
      }));
      const dataFetchFailedAction = store.getState().recording.findType(DATA_FETCH_FAILED)[0];
      expect(dataFetchFailedAction.queryName).toBe('graphObjects');
      expect(dataFetchFailedAction.error.status).toBe(404);
    });
  });
  describe('executeCommand', () => {
    it('dispatches an authorizationFailed action for 401 status', async () => {
      const err = new Error('401');
      (err as any).status = 401;
      apiModuleTestHelper.ajaxResponse
        .forceReject(err);
      store.dispatch(executeCommand('test/command', {}, {}, (err) => ({type: `SOME_ERROR_${err.status}`})));
      const failure = await store.getState().recording.waitForType(COMMAND_FAILED);
      expect(failure[0].error.status).toBe(401);
      await store.getState().recording.waitForType('SOME_ERROR_401');
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
          _: jest.fn(() => ''),
          someMethod: jest.fn(() => ''),
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
        const handler : any = {};
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
