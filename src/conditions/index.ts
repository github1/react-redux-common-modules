import { Module } from '@github1/redux-modules';
import { Action } from 'redux';

export const START_TIMER = '@timer/start';
export const TIMER_STARTED = '@timer/started';
export const TIMER_TICK = '@timer/tick';
export const STOP_TIMER = '@timer/stop';
export const TIMER_STOPPED = '@timer/stopped';

const timers = {};

export interface TimerDefinition {
  action? : Action | Array<Action>;
  interval? : number;
  dispatchOnTick? : number;
  stopOnDispatch? : boolean;
}

const clearTimerInterval = id => {
    if (typeof timers[id] !== 'undefined') {
        clearInterval(timers[id]);
    }
};

const storeTimerInterval = (id, func, interval) => {
    clearTimerInterval(id);
    timers[id] = setInterval(func, interval);
};

export const startTimer = (id : string, definition : TimerDefinition) : Action => {
    return {
        type: START_TIMER,
        id,
        ...definition
    } as Action;
};

export interface DebounceDefinition {
  action? : Action;
  interval? : number;
}

export const debounce = (id, { action, interval } : DebounceDefinition) => {
  return startTimer(id, { action, interval, stopOnDispatch: true});
};

export const stopTimer = (id) => ({type: STOP_TIMER, id});

export default Module.create({
    name: 'timer',
    reducer: (state = {}, action) => {
        if (action.type === TIMER_STARTED) {
            return {
                ...state,
                [action.id]: {
                    running: true,
                    tick: 0
                }
            }
        }
        if (action.type === TIMER_TICK) {
            const timerState = {
                ...state[action.id],
                tick: state[action.id].tick + 1
            };
            return {
                ...state,
                [action.id]: {...timerState}
            }
        }
        if (action.type === TIMER_STOPPED) {
            const timerState = {
                ...state[action.id],
                running: false
            };
            return {
                ...state,
                [action.id]: {...timerState}
            };
        }
        return state;
    },
    middleware: store => next => action => {
        next(action);
        if (START_TIMER === action.type) {
            clearTimerInterval(action.id);
            if (action.interval > 0) {
                store.dispatch({type: TIMER_STARTED, id: action.id});
                storeTimerInterval(action.id, () => {
                    store.dispatch({type: TIMER_TICK, id: action.id});
                    if (action.action && (typeof action.dispatchOnTick === 'undefined'
                      || (action.dispatchOnTick + 1) === store.getState().timer[action.id].tick)) {
                        if (action.stopOnDispatch) {
                            store.dispatch(stopTimer(action.id));
                            clearTimerInterval(action.id);
                        }
                        (Array.isArray(action.action) ?
                            action.action :
                            [action.action]).forEach(store.dispatch);
                    }
                }, action.interval);
            }
        } else if (STOP_TIMER === action.type) {
            store.dispatch({type: TIMER_STOPPED, id: action.id});
            clearTimerInterval(action.id);
        }
    }
});
