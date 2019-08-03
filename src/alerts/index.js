import { Module } from '@common/redux-modules';

export const DISPLAY_ALERT = '@ALERT/DISPLAY';
export const HIDE_ALERT = '@ALERT/HIDE';
export const HIDE_ALL_ALERTS = '@ALERT/HIDE_ALL_ALERTS';
export const REMOVE_ALERT = '@ALERT/REMOVE';
export const TRIGGER_ALERT_ACTION = '@ALERT/TRIGGER_ALERT_ACTION';
const CONFIRMATION_ALERT_TYPE = 'confirmation';

export const displayAlert = ({title, message, type = 'success', timeout = 3000, componentProps}) => {
    const id = guid();
    return {
        type: DISPLAY_ALERT,
        payload: {title, message, type, timeout, id, componentProps}
    };
};

export const requestConfirmation = ({title, message, actions}) => {
    const id = guid();
    actions = (actions || []);
    if (actions.length === 0) {
        actions.push({label: 'Ok'});
    }
    return {
        type: DISPLAY_ALERT,
        payload: {
            title,
            message,
            type: CONFIRMATION_ALERT_TYPE,
            timeout: -1,
            id,
            actions
        }
    };
};

export const hideAlert = id => ({type: HIDE_ALERT, payload: {id}});

export const hideAllAlerts = id => ({type: HIDE_ALL_ALERTS});

const removeAlert = id => ({type: REMOVE_ALERT, payload: {id}});

const triggerAlertAction = (id, action) => ({
    type: TRIGGER_ALERT_ACTION,
    payload: {
        id,
        action
    }
});

const reducer = (state = {alerts: []}, action) => {
    switch (action.type) {
        case DISPLAY_ALERT:
        {
            return {
                alerts: state.alerts.concat([action.payload])
            };
        }
        case HIDE_ALERT:
        {
            return {
                alerts: state.alerts.map(alert => {
                    if (alert.id === action.payload.id) {
                        alert = {
                            ...alert,
                            hide: true
                        }
                    }
                    return alert;
                })
            };
        }
        case REMOVE_ALERT:
        {
            return {
                alerts: state.alerts.filter(alert => alert.id !== action.payload.id)
            };
        }
    }
    return state;
};

const middleware = store => next => action => {
    if (action.type === DISPLAY_ALERT) {
        if (action.payload.timeout > -1) {
            setTimeout(() => {
                store.dispatch(hideAlert(action.payload.id));
            }, action.payload.timeout);
        }
    }
    if (action.type === HIDE_ALERT) {
        const foundAlert = store.getState().alerts.alerts.filter(alert => alert.id === action.payload.id)[0];
        if (foundAlert) {
            setTimeout(() => {
                store.dispatch(removeAlert(action.payload.id));
            }, foundAlert.type === CONFIRMATION_ALERT_TYPE ? 500 : 1000);
        }
    }
    if (action.type === TRIGGER_ALERT_ACTION) {
        if (action.payload.action.action) {
            store.dispatch(action.payload.action.action);
        }
        store.dispatch(hideAlert(action.payload.id));
    }
    if (action.type === HIDE_ALL_ALERTS) {
        store.getState().alerts.alerts.forEach(alert => {
            store.dispatch(removeAlert(alert.id));
        });
    }
    next(action);
};

export default Module.create({
    name: 'alerts',
    reducer,
    middleware,
    actions: {
        dismissAlert: id => hideAlert(id),
        triggerAlertAction: (id, action) => triggerAlertAction(id, action)
    }
});

const guidS4 = () => Math.floor((1 + Math.random()) * 0x10000)
    .toString(16)
    .substring(1);

const guid = () => guidS4() + guidS4() + '-' + guidS4() + '-' + guidS4() + '-' + guidS4() + '-' + guidS4() + guidS4() + guidS4();