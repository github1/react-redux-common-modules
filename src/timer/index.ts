import { createModule } from '@github1/redux-modules';
import { Optional } from 'utility-types';
import { Action } from 'redux';

const timers = {};

export interface TimerDefinition {
  action: Action | Action[];
  interval: number;
  dispatchOnTick: number;
  stopOnDispatch: boolean;
}

const clearTimerInterval = (id: string) => {
  if (typeof timers[id] !== 'undefined') {
    clearInterval(timers[id]);
  }
};

const storeTimerInterval = (id: string, func: () => void, interval: number) => {
  clearTimerInterval(id);
  timers[id] = setInterval(func, interval);
};

export type TimerModuleState = {
  [k: string]: {
    running: boolean;
    tick: number;
  };
};

export default createModule('timer', {
  actionCreators: {
    startTimer(
      id: string,
      definition: Optional<
        TimerDefinition,
        'action' | 'dispatchOnTick' | 'stopOnDispatch'
      >
    ): { type: '@timer/start'; id: string } & TimerDefinition {
      return {
        type: '@timer/start',
        id,
        ...(definition as TimerDefinition),
      };
    },
    timerStarted(id: string): { type: '@timer/started'; id: string } {
      return { type: '@timer/started', id };
    },
    stopTimer(id: string): { type: '@timer/stop'; id: string } {
      return {
        type: '@timer/stop',
        id,
      };
    },
    timerStopped(id: string): { type: '@timer/stopped'; id: string } {
      return { type: '@timer/stopped', id };
    },
    debounce(
      id: string,
      {
        action,
        interval,
      }: Omit<TimerDefinition, 'dispatchOnTick' | 'stopOnDispatch'>
    ) {
      return this.startTimer(id, { action, interval, stopOnDispatch: true });
    },
    tick(id): { type: '@timer/tick'; id: string } {
      return { type: '@timer/tick', id };
    },
  },
})
  .reduce((state: TimerModuleState = {}, action): TimerModuleState => {
    if (action.type === '@timer/started') {
      return {
        ...state,
        [action.id]: {
          running: true,
          tick: 0,
        },
      };
    }
    if (action.type === '@timer/tick') {
      const timerState = {
        ...state[action.id],
        tick: state[action.id].tick + 1,
      };
      return {
        ...state,
        [action.id]: { ...timerState },
      };
    }
    if (action.type === '@timer/stopped') {
      const timerState = {
        ...state[action.id],
        running: false,
      };
      return {
        ...state,
        [action.id]: { ...timerState },
      };
    }
    return state;
  })
  .on((store) => (next) => (action) => {
    next(action);
    if (action.type === '@timer/start') {
      clearTimerInterval(action.id);
      if (action.interval > 0) {
        store.dispatch(store.actions.timerStarted(action.id));
        storeTimerInterval(
          action.id,
          () => {
            store.dispatch(store.actions.tick(action.id));
            if (
              action.action &&
              (typeof action.dispatchOnTick === 'undefined' ||
                action.dispatchOnTick + 1 ===
                  store.getState().timer[action.id].tick)
            ) {
              if (action.stopOnDispatch) {
                store.dispatch(store.actions.stopTimer(action.id));
                clearTimerInterval(action.id);
              }
              (Array.isArray(action.action)
                ? action.action
                : [action.action]
              ).forEach(store.dispatch);
            }
          },
          action.interval
        );
      }
    } else if ('@timer/stop' === action.type) {
      store.dispatch(store.actions.timerStopped(action.id));
      clearTimerInterval(action.id);
    }
  });
