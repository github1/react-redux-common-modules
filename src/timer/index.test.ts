import timer, {
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
  it('can invoke actions on tick', () => {
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
});
