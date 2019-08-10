import timer, {
  debounce,
  startTimer,
  stopTimer,
  TIMER_STOPPED,
  TIMER_TICK
} from './index';

describe('timer', () => {
  let store;
  beforeEach(() => {
    store = timer.enforceImmutableState().inRecordedStore();
  });
  it('can start and stop a timer', () => {
    store.dispatch(startTimer('timer1', {interval: 1}));
    expect(store.getState().timer['timer1'].running).toBe(true);
    store.dispatch(stopTimer('timer1'));
    expect(store.getState().timer['timer1'].running).toBe(false);
  });
  it('can trigger arrays of actions', () => {
    store.dispatch(startTimer('timer1', {
      interval: 1,
      action: [{type: 'TestAction1'}, {type: 'TestAction2'}]
    }));
    return delay(2).then(() => {
      expect(store.getState().recording.findType('TestAction1').length).toBe(1);
      expect(store.getState().recording.findType('TestAction2').length).toBe(1);
    });
  });
  it('can trigger actions on tick', () => {
    let maxTicks = 5;
    return new Promise((resolve, reject) => {
      store.dispatch(startTimer('timer1', {
        interval: 1,
        action: {type: 'TestAction'}
      }));
      const check = setInterval(() => {
        maxTicks--;
        if (maxTicks === 0) {
          clearInterval(check);
          reject(new Error('action not found'));
        }
        if (store.getState().recording.findType('TestAction').length > 0) {
          clearInterval(check);
          resolve();
        }
      }, 1);
    });
  });
  it('can stop the timer before a tick', () => {
    let maxTicks = 5;
    return new Promise((resolve, reject) => {
      store.dispatch(startTimer('timer1', {
        interval: 51,
        action: {type: 'TestAction'},
        dispatchOnTick: 2
      }));
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
    }).then(() => {
      expect(store.getState().recording.findType(TIMER_TICK).length).toBe(1);
      expect(store.getState().recording.findType(TIMER_STOPPED).length).toBe(1);
      expect(store.getState().recording.findType('TestAction').length).toBe(0);
    });
  });
  it('can debounce actions fired within internal', () => {
    const checks = [];
    return new Promise((resolve) => {
      store.dispatch(debounce('timer1', {
        interval: 50,
        action: {type: 'TestAction1'}
      }));
      store.dispatch(debounce('timer1', {
        interval: 50,
        action: {type: 'TestAction2'}
      }));
      const check = setInterval(() => {
        checks.push({
          actionFired: store.getState().recording.findType('TestAction2').length === 1,
          isRunning: store.getState().timer.timer1.running
        });
        if (checks[checks.length -1].actionFired) {
          clearInterval(check);
          resolve();
        }
      }, 25);
    }).then(() => {
      expect(checks[0].actionFired).toBe(false);
      expect(checks[0].isRunning).toBe(true);
      expect(checks[1].actionFired).toBe(true);
      expect(checks[1].isRunning).toBe(false);
    });
  });
  it('executes debounced timers which occur outside of interval', () => {
    store.dispatch(debounce('timer1', {
      interval: 1,
      action: {type: 'TestAction1'}
    }));
    return delay(2)
      .then(() => {
        store.dispatch(debounce('timer1', {
          interval: 1,
          action: {type: 'TestAction2'}
        }));
        return delay(5);
      })
      .then(() => {
        expect(store.getState().recording.findType('TestAction1').length).toBe(1);
        expect(store.getState().recording.findType('TestAction2').length).toBe(1);
      })
  });
});

const delay = ms => new Promise(resolve => setTimeout(() => resolve(), ms));
