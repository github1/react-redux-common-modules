import timer from './index';
const { startTimer, stopTimer, debounce } = timer.actions;

describe('timer', () => {
  const store = timer.asStore({
    deferred: true,
    record: true,
    enforceImmutableState: true,
  });
  beforeEach(() => {
    store.reload();
  });
  it('can start and stop a timer', () => {
    expect.assertions(2);
    store.dispatch(startTimer('timer1', { interval: 1 }));
    expect(store.getState().timer.timer1.running).toBe(true);
    store.dispatch(stopTimer('timer1'));
    expect(store.getState().timer.timer1.running).toBe(false);
  });
  it('can trigger arrays of actions', async () => {
    expect.assertions(2);
    store.dispatch(
      startTimer('timer1', {
        interval: 1,
        action: [{ type: 'TestAction1' }, { type: 'TestAction2' }],
      })
    );
    await delay(2);
    expect(
      store.getState().recording.find('TestAction1' as any).length
    ).toBeGreaterThanOrEqual(1);
    expect(
      store.getState().recording.find('TestAction2' as any).length
    ).toBeGreaterThanOrEqual(1);
  });
  it('can trigger actions on tick', () => {
    let maxTicks = 5;
    return new Promise<void>((resolve, reject) => {
      store.dispatch(
        startTimer('timer1', {
          interval: 1,
          action: { type: 'TestAction' },
        })
      );
      const check = setInterval(() => {
        maxTicks--;
        if (maxTicks === 0) {
          clearInterval(check);
          reject(new Error('action not found'));
        }
        if (store.getState().recording.find('TestAction' as any).length > 0) {
          clearInterval(check);
          resolve();
        }
      }, 1);
    });
  });
  it('can stop the timer before a tick', async () => {
    expect.assertions(3);
    let maxTicks = 5;
    await new Promise<void>((resolve, reject) => {
      store.dispatch(
        startTimer('timer1', {
          interval: 51,
          action: { type: 'TestAction' },
          dispatchOnTick: 2,
        })
      );
      const check = setInterval(() => {
        maxTicks--;
        if (maxTicks === 4) {
          store.dispatch(stopTimer('timer1'));
          clearInterval(check);
          resolve();
        }
        if (maxTicks === 0) {
          clearInterval(check);
          reject(new Error('action not found'));
        }
      }, 100);
    });
    expect(store.getState().recording.find('@timer/tick').length).toBe(1);
    expect(store.getState().recording.find('@timer/stopped').length).toBe(1);
    expect(store.getState().recording.find('TestAction' as any).length).toBe(0);
  });
  it('can debounce actions fired within internal', async () => {
    expect.assertions(4);
    const checks = [];
    await new Promise<void>((resolve) => {
      store.dispatch(
        debounce('timer1', {
          interval: 50,
          action: { type: 'TestAction1' },
        })
      );
      store.dispatch(
        debounce('timer1', {
          interval: 50,
          action: { type: 'TestAction2' },
        })
      );
      const check = setInterval(() => {
        checks.push({
          actionFired:
            store.getState().recording.find('TestAction2' as any).length === 1,
          isRunning: store.getState().timer.timer1.running,
        });
        if (checks[checks.length - 1].actionFired) {
          clearInterval(check);
          resolve();
        }
      }, 25);
    });
    expect(checks[0].actionFired).toBe(false);
    expect(checks[0].isRunning).toBe(true);
    expect(checks[1].actionFired).toBe(true);
    expect(checks[1].isRunning).toBe(false);
  });
  it('executes debounced timers which occur outside of interval', async () => {
    expect.assertions(2);
    store.dispatch(
      debounce('timer1', {
        interval: 1,
        action: { type: 'TestAction1' },
      })
    );
    await delay(2);
    store.dispatch(
      debounce('timer1', {
        interval: 1,
        action: { type: 'TestAction2' },
      })
    );
    await delay(5);
    expect(store.getState().recording.find('TestAction1' as any).length).toBe(
      1
    );
    expect(store.getState().recording.find('TestAction2' as any).length).toBe(
      1
    );
  });
});

const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(() => resolve(), ms));
