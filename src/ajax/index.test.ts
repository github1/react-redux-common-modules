import { ajax } from './index';
const { get, post } = ajax.actions;

describe('ajax-module', () => {
  describe('when calling send', () => {
    const store = ajax
      .initialize({ ajaxSender: null, slowCallThreshold: 10 })
      .asStore({
        deferred: true,
        enforceImmutableState: true,
        record: true,
      });
    beforeEach(() => {
      store.reload();
    });
    it('fires actions when the call succeeds', () => {
      expect.assertions(6);
      ajax.forceResolve({ status: 200 });
      return new Promise<void>((resolve) => {
        const postAction = post('http://test.com', () => {
          const callRequestedAction = store
            .getState()
            .recording.find('@AJAX/CALL_REQUESTED')[0];
          expect(callRequestedAction.payload.url).toBe('http://test.com');
          expect(
            store.getState().recording.find('@AJAX/CALL_SENT')[0].payload.id
          ).toBe(callRequestedAction.payload.id);
          const callCompleteAction = store
            .getState()
            .recording.find('@AJAX/CALL_COMPLETE')[0];
          expect(callCompleteAction.payload.id).toBe(
            callRequestedAction.payload.id
          );
          expect(callCompleteAction.payload.status).toBe(200);
          expect(callCompleteAction.payload.request.url).toBe(
            'http://test.com'
          );
          const callSuccessAction = store
            .getState()
            .recording.find('@AJAX/CALL_SUCCESS')[0];
          expect(callSuccessAction.payload.response.status).toBe(200);
          resolve();
        });
        store.dispatch(postAction);
      });
    });
    it('fires the action returned by the callback', async () => {
      expect.assertions(1);
      ajax.forceResolve({ status: 200 });
      await new Promise<void>((resolve) => {
        store.dispatch(
          post('http://test.com', () => {
            resolve();
            return { type: 'TEST_ACTION' };
          })
        );
      });
      expect(
        store
          .getState()
          .recording.contains((a) => (a as any).type === 'TEST_ACTION')
      ).toBe(true);
    });
    it('fires an array of actions returned by the callback', async () => {
      expect.assertions(2);
      ajax.forceResolve({ status: 200 });
      await new Promise<void>((resolve) => {
        store.dispatch(
          post('http://test.com', () => {
            resolve();
            return [{ type: 'TEST_ACTION_1' }, { type: 'TEST_ACTION_2' }];
          })
        );
      });
      expect(
        store
          .getState()
          .recording.contains((a) => (a as any).type === 'TEST_ACTION_1')
      ).toBe(true);
      expect(
        store
          .getState()
          .recording.contains((a) => (a as any).type === 'TEST_ACTION_2')
      ).toBe(true);
    });
    it('fires actions when the call fails', () => {
      ajax.forceReject({ status: 500 });
      return new Promise<void>((resolve) => {
        store.dispatch(
          get('http://test.com', (err) => {
            const callRequestedAction = store
              .getState()
              .recording.find('@AJAX/CALL_REQUESTED')[0];
            expect(callRequestedAction.payload.url).toBe('http://test.com');
            expect(
              store.getState().recording.find('@AJAX/CALL_SENT')[0].payload.id
            ).toBe(callRequestedAction.payload.id);
            const callCompleteAction = store
              .getState()
              .recording.find('@AJAX/CALL_COMPLETE')[0];
            expect(callCompleteAction.payload.id).toBe(
              callRequestedAction.payload.id
            );
            expect(callCompleteAction.payload.status).toBe(500);
            expect(callCompleteAction.payload.request.url).toBe(
              'http://test.com'
            );
            const callFailedAction = store
              .getState()
              .recording.find('@AJAX/CALL_FAILED')[0];
            expect(callFailedAction.payload.error.status).toBe(500);
            expect(err.status).toBe(500);
            resolve();
          })
        );
      });
    });
    it('reports slow calls', () => {
      expect.assertions(3);
      ajax.forceResolve(
        new Promise((resolve) => {
          setTimeout(() => resolve({ status: 200 }), 100);
        })
      );
      return new Promise<void>((resolve) => {
        store.dispatch(
          post('http://test.com', () => {
            expect(
              store.getState().recording.find('@AJAX/CALL_SLOW').length
            ).toBe(1);
            expect(
              store.getState().recording.find('@AJAX/CALL_STATS')[0].payload
                .numSlow
            ).toBe(1);
            expect(
              store.getState().recording.find('@AJAX/CALL_STATS')[1].payload
                .numSlow
            ).toBe(0);
            resolve();
          })
        );
      });
    });
  });

  describe('ajax-stubbing', () => {
    it('can return static responses', async () => {
      const store = ajax.asStore({ record: true });
      ajax.forceResolve({
        data: 'the response',
      });
      store.dispatch(get('http://test.com'));
      const success = await store
        .getState()
        .recording.waitFor('@AJAX/CALL_SUCCESS');
      expect(success[0].payload.response.data).toBe('the response');
    });
    it('can return dynamic responses based on the request', async () => {
      const store = ajax.asStore({ record: true });
      ajax.forceResolve((req) => ({
        data: `the response for ${req.url}`,
      }));
      store.dispatch(get('http://test.com'));
      const success = await store
        .getState()
        .recording.waitFor('@AJAX/CALL_SUCCESS');
      expect(success[0].payload.response.data).toBe(
        'the response for http://test.com'
      );
    });
    it('can return dynamic errors based on the request', async () => {
      const store = ajax.asStore({ record: true });
      ajax.forceReject((req) => {
        throw `error: ${req.url}`;
      });
      store.dispatch(get('http://test.com'));
      store.dispatch(get('http://test2.com'));
      const failure = await store
        .getState()
        .recording.waitFor('@AJAX/CALL_FAILED');
      expect(failure[0].payload.error).toBe('error: http://test.com');
      expect(failure[1].payload.error).toBe('error: http://test2.com');
    });
  });
});
