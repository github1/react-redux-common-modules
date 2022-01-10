import { expectType, TypeEqual } from 'ts-expect';
import {
  api,
  AUTHENTICATE_FAILED,
  AUTHENTICATE_SUCCESS,
  COMMAND_FAILED,
  storeCommandResponseHandlerWithDispatch,
  commandResponseHandler,
  invokeAsyncCallbackHandlerOrFunc,
  createGraphQuery,
  DATA_FETCH_FAILED,
  DATA_FETCH_SUCCESS,
  DataFetchContextFromQuery,
  DataFetchQueryDefinition,
} from './index';
import { apiModuleTestHelper } from './test-helper';
import { ajax, AJAX_CALL_COMPLETE, AJAX_CALL_REQUESTED } from '../ajax';
const {
  executeCommand,
  invalidatePrefetchCache,
  signout,
  dataFetch,
  authenticateWithUsernamePassword,
  authenticate,
} = api.actions;

describe('api', () => {
  const store = apiModuleTestHelper.asStore({
    deferred: true,
    record: true,
    enforceImmutableState: true,
  });
  beforeEach(() => {
    store.reload();
    ajax.forceResolve({ status: 200 });
  });
  describe('authenticate', () => {
    it('can authenticate with username and password', async () => {
      ajax.forceResolve((opts) => {
        if (
          opts.url === 'service/identity' &&
          opts.headers.Authorization === 'Basic Zm9vOmJhcg=='
        ) {
          return { status: 200, data: 'abc' };
        }
        return { status: 500 };
      });
      store.dispatch(
        authenticateWithUsernamePassword({
          username: 'foo',
          password: 'bar',
        })
      );
      await store.getState().recording.waitFor(AJAX_CALL_COMPLETE);
      expect(
        store.getState().recording.find(AUTHENTICATE_SUCCESS)[0].claims
      ).toBe('abc');
    });
    it('can authenticate with a cookie', async () => {
      ajax.forceResolve({ status: 200, data: 'abc' });
      store.dispatch(authenticate());
      await store.getState().recording.waitFor(AJAX_CALL_COMPLETE);
      expect(store.getState().recording.find(AUTHENTICATE_SUCCESS)[0]).toEqual(
        expect.objectContaining({
          claims: 'abc',
          mode: 'cookie',
        })
      );
    });
    it('can fail to authenticate with 401 or 403 status', async () => {
      for (const status of [401, 403]) {
        ajax.forceReject(() => {
          throw { ...new Error(''), status };
        });
        store.dispatch(
          authenticateWithUsernamePassword({
            username: 'foo',
            password: 'bar',
          })
        );
        await store.getState().recording.waitFor(AJAX_CALL_COMPLETE);
        const authenticateFailedAction = store
          .getState()
          .recording.find(AUTHENTICATE_FAILED)
          .reverse()[0];
        expect(authenticateFailedAction.mode).toBe('basic-auth');
        expect(authenticateFailedAction.error.status).toBe(status);
      }
    });
    it('can fail to authenticate with an error', async () => {
      ajax.forceReject(() => {
        throw new Error('failed');
      });
      store.dispatch(
        authenticateWithUsernamePassword({
          username: 'foo',
          password: 'bar',
        })
      );
      await store.getState().recording.waitFor(AJAX_CALL_COMPLETE);
      expect(store.getState().recording.find(AUTHENTICATE_FAILED).length).toBe(
        1
      );
    });
    it('can signout', () => {
      store.dispatch(signout());
      store.getState().recording.find(AJAX_CALL_REQUESTED, (actions) => {
        expect(actions[0].payload.method).toBe('DELETE');
      });
    });
  });
  describe('tracking calls in progress', () => {
    describe('when an api call is requested', () => {
      beforeEach(() => {
        store.dispatch({ type: '@API/FOO_REQUESTED' } as any);
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
        store.dispatch({ type: '@API/FOO_SUCCESS' } as any);
        expect(store.getState().api.callInProgress).toBe(false);
      });
    });
    describe('when an api call fails', () => {
      it('sets callInProgress to false', () => {
        store.dispatch({ type: '@API/FOO_FAILED' } as any);
        expect(store.getState().api.callInProgress).toBe(false);
      });
    });
  });
  describe('createGraphQuery', () => {
    it('creates graph queries with quoted string arguments', () => {
      const queryDef = {
        graphObjects: {
          args: {
            criteria: 'someValue',
          },
          schema: { name: '' },
        },
      };
      const query = createGraphQuery(queryDef);
      expect(query).toBe(
        '{ graph { graphObjects (criteria: \\"someValue\\") { name } } }'
      );
    });
    it('creates graph queries', () => {
      const queryDef: DataFetchQueryDefinition = {
        graphObjects: {
          args: {
            criteria: 1,
          },
          schema: { name: '' },
        },
      };
      const query = createGraphQuery(queryDef);
      expect(query).toBe('{ graph { graphObjects (criteria: 1) { name } } }');
    });
    it('creates graph queries with sub-selection', () => {
      const queryDef: DataFetchQueryDefinition = {
        graphObjects: {
          args: {
            criteria: 1,
          },
          schema: { something: { foo: '_' } },
        },
      };
      const query = createGraphQuery(queryDef);
      expect(query).toBe(
        '{ graph { graphObjects (criteria: 1) { something { foo } } } }'
      );
    });
    it('creates graph queries with sub-selection from array type', () => {
      const queryDef: DataFetchQueryDefinition = {
        graphObjects: {
          args: {
            criteria: 1,
          },
          schema: { something: [{ foo: '_' }] },
        },
      };
      const query = createGraphQuery(queryDef);
      expect(query).toBe(
        '{ graph { graphObjects (criteria: 1) { something { foo } } } }'
      );
    });
    it('creates graph queries with multiple criteria', () => {
      const queryDef: DataFetchQueryDefinition = {
        graphObjects: {
          args: {
            c1: 1,
            c2: true,
          },
          schema: { name: '' },
        },
      };
      const query = createGraphQuery(queryDef);
      expect(query).toBe(
        '{ graph { graphObjects (c1: 1, c2: true) { name } } }'
      );
    });
    it('excludes null or undefined arguments', () => {
      const queryDef: DataFetchQueryDefinition = {
        graphObjects: {
          args: {
            c1: null,
            c2: undefined,
            c3: 1,
          },
          schema: { name: '' },
        },
      };
      const query = createGraphQuery(queryDef);
      expect(query).toBe('{ graph { graphObjects (c3: 1) { name } } }');
    });
  });
  describe('graphQuery', () => {
    it('creates a dataFetch builder', () => {
      type TestQueryNoArgs = DataFetchQueryDefinition<
        DataFetchContextFromQuery<{
          test: {
            schema: { name: string };
          };
        }>
      >;
      const fetchNoArgs = api.actions.graphQuery<TestQueryNoArgs>('test', {
        name: '',
      });
      expectType<
        TypeEqual<
          Parameters<
            Parameters<typeof fetchNoArgs.onSuccess>[0]
          >[0]['queryName'],
          'test'
        >
      >(true);
      expect(fetchNoArgs.type).toBe('@API/DATA_FETCH_REQUESTED');
      type TestQueryWithArgs = DataFetchQueryDefinition<
        DataFetchContextFromQuery<{
          test: {
            args: { id: number };
            schema: { name: string };
          };
        }>
      >;
      const fetchWithArgs = api.actions.graphQuery<TestQueryWithArgs>('test', {
        name: '',
      })({
        id: 123,
      });
      expectType<
        TypeEqual<
          Parameters<
            Parameters<typeof fetchWithArgs.onSuccess>[0]
          >[0]['queryName'],
          'test'
        >
      >(true);
      expect(fetchWithArgs.type).toBe('@API/DATA_FETCH_REQUESTED');
    });
  });
  describe('dataFetch.fromQuery', () => {
    it('determines DataFetchContext from query', () => {
      const query = {
        graphOfObjects: {
          schema: { something: 'a' },
        },
      };
      expectType<
        TypeEqual<
          DataFetchContextFromQuery<typeof query>,
          {
            _keyType: 'graphOfObjects';
            _argsType: undefined;
            _schemaType: { something: string };
          }
        >
      >(true);
      const queryWithArgs = {
        graphOfObjects: {
          args: { criteria: 123 },
          schema: { name: '' },
        },
      };
      expectType<
        TypeEqual<
          DataFetchContextFromQuery<typeof queryWithArgs>,
          {
            _keyType: 'graphOfObjects';
            _argsType: { criteria: number };
            _schemaType: { name: string };
          }
        >
      >(true);
    });
    it('performs graph queries', async () => {
      ajax.forceResolve({
        data: {
          graph: {
            graphOfObjects: ['graphObj'],
          },
        },
      });
      const action = dataFetch().fromQuery({
        graphOfObjects: {
          schema: {
            c1: null,
          },
        },
      });
      store.dispatch(action);
      const success = await store
        .getState()
        .recording.waitFor(DATA_FETCH_SUCCESS);
      expect(success[0].queryName).toBe('graphOfObjects');
      expect(success[0].data[0]).toBe('graphObj');
    });
  });
  describe('dataFetch.fromUrl', () => {
    it('performs GET requests', async () => {
      ajax.forceResolve({ data: 'theFoos' });
      const action = dataFetch('foos').fromUrl('/foo');
      expect(action.url).toBe('/foo');
      store.dispatch(action);
      const success = await store
        .getState()
        .recording.waitFor(DATA_FETCH_SUCCESS);
      expect(success[0].queryName).toBe('foos');
      expect(success[0].data).toBe('theFoos');
    });
  });
  describe('dataFetch.fromStaticData', () => {
    it('returns the supplied data', async () => {
      const action = dataFetch('foos').fromStaticData('theFoosStatic');
      expect(action.staticData).toBe('theFoosStatic');
      store.dispatch(action);
      const success = await store
        .getState()
        .recording.waitFor(DATA_FETCH_SUCCESS);
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
      const success = await store
        .getState()
        .recording.waitFor(DATA_FETCH_SUCCESS);
      expect(success[0].data).toBe('theFoosStatic-processed');
    });
    it('can convert the data to a different type', async () => {
      const action = dataFetch('foos')
        .fromStaticData('theFoosStatic')
        .withPostProcessor<number[]>((data) => [data.length]);
      store.dispatch(action);
      const success = await store
        .getState()
        .recording.waitFor(DATA_FETCH_SUCCESS);
      expect(success[0].data[0]).toBe('theFoosStatic'.length);
    });
  });
  describe('dataFetch.withName', () => {
    it('uses the name', async () => {
      const action = dataFetch('foos')
        .fromStaticData('theFoosStatic')
        .withName('foo-name');
      store.dispatch(action);
      const success = await store
        .getState()
        .recording.waitFor(DATA_FETCH_SUCCESS);
      expect(success[0].queryName).toBe('foo-name');
    });
  });
  describe('dataFetch.onSuccess', () => {
    it('runs the onSuccess handler', async () => {
      const action = dataFetch('foos')
        .fromStaticData([{ someData: 'abc' }])
        .onSuccess((action) => {
          expectType<TypeEqual<typeof action.data, { someData: string }[]>>(
            true
          );
          return {
            type: 'SUCCESS_ACTION',
          };
        });
      store.dispatch(action);
      await store.getState().recording.waitFor('SUCCESS_ACTION' as any);
    });
    it('runs multiple onSuccess handler', async () => {
      const action = dataFetch('foos')
        .fromStaticData('theFoosStatic')
        .onSuccess(() => {
          return {
            type: 'SUCCESS_ACTION_1',
          };
        })
        .onSuccess(() => {
          return {
            type: 'SUCCESS_ACTION_2',
          };
        });
      store.dispatch(action);
      await store.getState().recording.waitFor('SUCCESS_ACTION_1' as any);
      await store.getState().recording.waitFor('SUCCESS_ACTION_2' as any);
    });
  });
  describe('dataFetch.onFailure', () => {
    it('runs the onSuccess handler', async () => {
      ajax.forceReject(() => {
        throw new Error('failed');
      });
      const action = dataFetch('foos')
        .fromUrl('/foo')
        .onFailure(() => {
          return {
            type: 'FAILED_ACTION',
          };
        });
      store.dispatch(action);
      await store.getState().recording.waitFor(AJAX_CALL_COMPLETE);
      expect(
        (await store.getState().recording.waitFor('FAILED_ACTION' as any))[0]
      ).toBeDefined();
    });
  });
  describe('prefetchedResponses', () => {
    it('returns prefetched data', async () => {
      const store = apiModuleTestHelper.asStore({
        record: true,
        enforceImmutableState: true,
        preloadedState: {
          api: {
            usePrefetchedAlways: true,
            prefetched: {
              '{ graph { graphObjects (criteria: 1) { name } } }': {
                data: { graph: { graphObjects: [{ name: 'hi' }] } },
                statusCode: 200,
              },
            },
          },
        },
      });
      ajax.forceResolve({ status: 200, data: {} });
      const dataFetchRequest = dataFetch().fromQuery({
        graphObjects: {
          args: {
            criteria: 1,
          },
          schema: [{ name: '' }],
        },
      });
      dataFetchRequest.withPostProcessor((res) => {
        expectType<TypeEqual<typeof res[number], { name: string }>>(true);
        return res;
      });
      store.dispatch(dataFetchRequest);
      console.log(store.getState().recording.actions);
      expect(
        store.getState().recording.find(DATA_FETCH_SUCCESS)[0].queryName
      ).toBe('graphObjects');
      expect(store.getState().recording.find(AJAX_CALL_REQUESTED).length).toBe(
        0
      );
      store.dispatch(invalidatePrefetchCache());
      store.dispatch(
        dataFetch().fromQuery({
          graphObjects: {
            args: {
              criteria: 1,
            },
            schema: { name: '' },
          },
        })
      );
      expect(store.getState().recording.find(AJAX_CALL_REQUESTED).length).toBe(
        1
      );
      await store.getState().recording.waitFor(AJAX_CALL_COMPLETE);
    });
    it('dispatches @API/DATA_FETCH_FAILED on non 200 status', () => {
      const store = apiModuleTestHelper.asStore({
        record: true,
        enforceImmutableState: true,
        preloadedState: {
          api: {
            usePrefetchedAlways: true,
            prefetched: {
              '{ graph { graphObjects (criteria: 1) { name } } }': {
                statusCode: 404,
              },
            },
          },
        },
      });
      const df = dataFetch().fromQuery({
        graphObjects: {
          args: {
            criteria: 1,
          },
          schema: { name: '' },
        },
      });
      store.dispatch(df);
      const dataFetchFailedAction = store
        .getState()
        .recording.find(DATA_FETCH_FAILED)[0];
      expect(dataFetchFailedAction.queryName).toBe('graphObjects');
      expect(dataFetchFailedAction.error.status).toBe(404);
    });
  });
  describe('executeCommand', () => {
    it('dispatches an authorizationFailed action for 401 status', async () => {
      const err = new Error('401');
      (err as any).status = 401;
      ajax.forceReject(err);
      store.dispatch(
        executeCommand('test/command', {}, {}, (err) => ({
          type: `SOME_ERROR_${err.status}`,
        }))
      );
      const failure = await store.getState().recording.waitFor(COMMAND_FAILED);
      expect(failure[0].error.status).toBe(401);
      await store.getState().recording.waitFor('SOME_ERROR_401' as any);
    });
  });
  describe('commandResponseHandler', () => {
    describe('response is a function', () => {
      it('passes the responseHandler to the function', () => {
        const handler = {};
        const response = jest.fn();
        commandResponseHandler(
          handler,
          console.log.bind(console)
        )({ data: response });
        expect(response).toHaveBeenCalledWith(handler);
      });
    });
    describe('responseHandler is a function', () => {
      it('passes the response directly to the function', () => {
        const handler = jest.fn();
        commandResponseHandler(
          handler,
          console.log.bind(console)
        )({ data: [{ name: 'prop', args: [] }] });
        expect(handler).toHaveBeenCalledWith(
          expect.arrayContaining([{ name: 'prop', args: [] }])
        );
      });
    });
    describe('responseHandler is object', () => {
      it('calls the default handler if none other found', () => {
        const logger = jest.fn();
        const handler = {
          _: jest.fn(() => ({ type: 'SOME_ACTION' })),
          someMethod: jest.fn(() => ({ type: 'SOME_ACTION' })),
          resultUndefined: jest.fn(),
        };
        commandResponseHandler(
          handler,
          logger
        )({
          data: [
            { name: 'noMethod', args: ['arg0'] },
            { name: 'someMethod', args: ['arg0'] },
          ],
        });
        expect(handler._).toHaveBeenCalledWith('noMethod', ['arg0']);
        expect(handler.someMethod).toHaveBeenCalledWith('arg0');
      });
      it('handles async callbacks', () => {
        const dispatch = jest.fn();
        const logger = jest.fn();
        const handler = {
          someMethod: jest.fn(() => ({ type: 'SOME_ACTION' })),
        };
        storeCommandResponseHandlerWithDispatch('theCommandRequestId', {
          commandResponseHandler: handler,
          dispatch,
        });
        commandResponseHandler(
          handler,
          logger
        )({
          data: [{ name: '_asyncCallback', args: ['theCommandRequestId'] }],
        });
        invokeAsyncCallbackHandlerOrFunc('theCommandRequestId', {
          name: 'someMethod',
          args: ['arg0'],
        });
        expect(handler.someMethod).toHaveBeenCalledWith('arg0');
        expect(dispatch).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'SOME_ACTION' })
        );
      });
      it('warns if no result is returned by the handler', () => {
        const logger = jest.fn();
        const handler = {
          resultUndefined: jest.fn(),
        };
        commandResponseHandler(
          handler,
          logger
        )({
          data: [{ name: 'resultUndefined', args: [] }],
        });
        expect(logger).toHaveBeenCalledWith(
          'warning: api result is undefined.'
        );
      });
      it('can set args on a property', () => {
        const logger = jest.fn();
        const handler: any = {};
        commandResponseHandler(
          handler,
          logger
        )({
          data: [
            {
              methodCall: false,
              name: 'someProperty',
              args: ['aValue'],
            },
            {
              methodCall: false,
              name: 'anotherProperty',
              args: [1, 2],
            },
          ],
        });
        expect(handler.someProperty).toBe('aValue');
        expect(handler.anotherProperty).toEqual([1, 2]);
      });
    });
  });
});
