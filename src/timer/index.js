import { Module } from '@common/redux-modules';

export const START_TIMER = '@timer/start';
export const DEBOUNCE_ACTION = '@timer/debounce';
export const TIMER_STARTED = '@timer/started';
export const TIMER_TICK = '@timer/tick';
export const STOP_TIMER = '@timer/stop';
export const TIMER_STOPPED = '@timer/stopped';

const timers = {};

const clearTimerInterval = id => {
    if (timers[id]) {
        clearInterval(timers[id]);
    }
};

export const startTimer = (id, { action, interval, dispatchOnTick, stopOnDispatch }) => {
    return {
        type: START_TIMER,
        id,
        action,
        interval,
        dispatchOnTick,
        stopOnDispatch
    }
};

export const debounce = (id, { action, interval }) => {
    return {
        type: START_TIMER,
        id,
        action,
        interval,
        stopOnDispatch: true
    }
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
                timers[action.id] = setInterval(() => {
                    store.dispatch({type: TIMER_TICK, id: action.id});
                    if (action.action && (typeof action.dispatchOnTick === 'undefined' || (action.dispatchOnTick + 1) === store.getState().timer[action.id].tick)) {
                        if (action.stopOnDispatch) {
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