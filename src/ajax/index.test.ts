import ajax, {
  AJAX_CALL_COMPLETE,
  AJAX_CALL_FAILED,
  AJAX_CALL_REQUESTED,
  AJAX_CALL_SENT,
  AJAX_CALL_SLOW,
  AJAX_CALL_STATS,
  AJAX_CALL_SUCCESS,
  get,
  post
} from './index';
import {ajaxModuleTestHelper} from './test-helper';

describe('when calling send', () => {
  let store;
  let ajaxService;
  let fake;
  beforeEach(() => {
    ajaxService = {
      send: function () {
        return fake;
      }
    };
    store = ajax(ajaxService, {slowCallThreshold: 1}).enforceImmutableState().inRecordedStore();
  });
  it('fires actions when the call succeeds', () => {
    fake = Promise.resolve({status: 200});
    return new Promise(resolve => {
      store.dispatch(post('http://test.com', () => {
        expect(store.getState().recording.actions[1].type).toBe(AJAX_CALL_REQUESTED);
        expect(store.getState().recording.actions[2].type).toBe(AJAX_CALL_SENT);
        expect(store.getState().recording.actions[3].type).toBe(AJAX_CALL_COMPLETE);
        expect(store.getState().recording.actions[3].payload.status).toBe(200);
        expect(store.getState().recording.actions[3].payload.request.url).toBe('http://test.com');
        expect(store.getState().recording.actions[4].type).toBe(AJAX_CALL_SUCCESS);
        expect(store.getState().recording.actions[4].payload.response.status).toBe(200);
        resolve();
      }));
    });
  });
  it('fires the action returned by the callback', () => {
    fake = Promise.resolve({status: 200});
    return new Promise(resolve => {
      store.dispatch(post('http://test.com', () => {
        resolve();
        return {type: 'TEST_ACTION'};
      }));
    }).then(() => {
      expect(store.getState().recording.containsType('TEST_ACTION')).toBe(true);
    });
  });
  it('fires the actions (array) returned by the callback', () => {
    fake = Promise.resolve({status: 200});
    return new Promise(resolve => {
      store.dispatch(post('http://test.com', () => {
        resolve();
        return [{type: 'TEST_ACTION_1'}, {type: 'TEST_ACTION_2'}];
      }));
    }).then(() => {
      expect(store.getState().recording.containsType('TEST_ACTION_1')).toBe(true);
      expect(store.getState().recording.containsType('TEST_ACTION_2')).toBe(true);
    });
  });
  it('fires actions when the call fails', () => {
    fake = Promise.reject({status: 500});
    return new Promise(resolve => {
      store.dispatch(get('http://test.com', function (err) {
        expect(store.getState().recording.actions[1].type).toBe(AJAX_CALL_REQUESTED);
        expect(store.getState().recording.actions[2].type).toBe(AJAX_CALL_SENT);
        expect(store.getState().recording.actions[3].type).toBe(AJAX_CALL_COMPLETE);
        expect(store.getState().recording.actions[4].type).toBe(AJAX_CALL_FAILED);
        expect(store.getState().recording.actions[4].payload.error.status).toBe(500);
        expect(err.status).toBe(500);
        resolve();
      }));
    });
  });
  it('reports slow calls', () => {
    //expect.assertions(1);
    fake = new Promise((resolve) => {
      setTimeout(() => resolve({status: 200}), 10);
    });
    return new Promise(resolve => {
      store.dispatch(post('http://test.com', () => {
        expect(store.getState().recording.findType(AJAX_CALL_SLOW).length).toBe(1);
        expect(store.getState().recording.findType(AJAX_CALL_STATS)[0].payload.numSlow).toBe(1);
        expect(store.getState().recording.findType(AJAX_CALL_STATS)[1].payload.numSlow).toBe(0);
        resolve();
      }));
    });
  });
});

describe('ajaxModuleTestHelper', () => {
  it('can return static responses', async () => {
    const store = ajaxModuleTestHelper.createStore();
    ajaxModuleTestHelper.ajaxResponse.forceResolve({
      data: 'the response'
    });
    store.dispatch(get('http://test.com', () => {}));
    const success = await store.getState().recording.waitForType(AJAX_CALL_SUCCESS);
    expect(success[0].payload.response.data).toBe('the response');
  });
  it('can return dynamic responses based on the request', async () => {
    const store = ajaxModuleTestHelper.createStore();
    await ajaxModuleTestHelper.ajaxResponse.forceResolve((action) => ({
      data: `the response for ${action.payload.url}`
    }));
    store.dispatch(get('http://test.com', () => {}));
    const success = await store.getState().recording.waitForType(AJAX_CALL_SUCCESS);
    expect(success[0].payload.response.data).toBe('the response for http://test.com');
  });
  it('can return dynamic errors based on the request', async () => {
    const store = ajaxModuleTestHelper.createStore();
    ajaxModuleTestHelper.ajaxResponse.forceReject((action) => {
      throw new Error(`error: ${action.payload.url}`);
    });
    store.dispatch(get('http://test.com', () => {}));
    store.dispatch(get('http://test2.com', () => {}));
    const failure = await store.getState().recording.waitForType(AJAX_CALL_FAILED);
    expect(failure[0].payload.error.message).toBe('error: http://test.com');
    expect(failure[1].payload.error.message).toBe('error: http://test2.com');
  });
});
