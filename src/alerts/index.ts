import { createModule } from '@github1/redux-modules';
import { Action, AnyAction } from 'redux';

export const DISPLAY_ALERT = '@ALERT/DISPLAY';
export const HIDE_ALERT = '@ALERT/HIDE';
export const HIDE_ALL_ALERTS = '@ALERT/HIDE_ALL_ALERTS';
export const REMOVE_ALERT = '@ALERT/REMOVE';
export const TRIGGER_ALERT_ACTION = '@ALERT/TRIGGER_ALERT_ACTION';
const CONFIRMATION_ALERT_TYPE = 'confirmation';

export interface DisplayAlertOptions {
  id: string;
  title: string;
  message: string;
  timeout: number;
  type: string;
  actions: ConfirmAlertAction[];
}

export interface ConfirmAlertAction {
  [key: string]: any;
  label: string;
  className?: string;
  action?: AnyAction;
}

export type AlertModuleAlertState = DisplayAlertOptions & { hide?: boolean };

export interface AlertModuleState {
  alerts: Array<AlertModuleAlertState>;
}

export interface DisplayAlertAction extends Action<typeof DISPLAY_ALERT> {
  payload: DisplayAlertOptions;
}

export interface HideAlertAction extends Action<typeof HIDE_ALERT> {
  payload: {
    id: string;
  };
}

export interface HideAllAlertsAction extends Action<typeof HIDE_ALL_ALERTS> {}

export interface RemoveAlertAction extends Action<typeof REMOVE_ALERT> {
  payload: {
    id: string;
  };
}

export interface TriggerAlertAction
  extends Action<typeof TRIGGER_ALERT_ACTION> {
  payload: {
    id: string;
    action: ConfirmAlertAction;
  };
}

const timeouts = {
  hide: {},
  remove: {},
};

export const alerts = createModule('alerts', {
  actionCreators: {
    displayAlert({
      title,
      message,
      type = 'success',
      timeout = 3000,
      id,
    }: Partial<DisplayAlertOptions>): DisplayAlertAction {
      id = id || guid();
      return {
        type: DISPLAY_ALERT,
        payload: { title, message, type, timeout, id, actions: [] },
      };
    },
    requestConfirmation({
      title,
      message,
      actions = [],
    }: Partial<DisplayAlertOptions>): DisplayAlertAction {
      const id = guid();
      if (actions.length === 0) {
        actions.push({ label: 'Ok' });
      }
      return {
        type: DISPLAY_ALERT,
        payload: {
          title,
          message,
          type: CONFIRMATION_ALERT_TYPE,
          timeout: -1,
          id,
          actions,
        },
      };
    },
    hideAlert(id: string): HideAlertAction {
      return { type: HIDE_ALERT, payload: { id } };
    },
    dismissAlert(id: string): HideAlertAction {
      return this.hideAlert(id);
    },
    hideAllAlerts(): HideAllAlertsAction {
      return { type: HIDE_ALL_ALERTS };
    },
    removeAlert(id: string): RemoveAlertAction {
      return { type: REMOVE_ALERT, payload: { id } };
    },
    triggerAlertAction(
      id: string,
      action: ConfirmAlertAction
    ): TriggerAlertAction {
      return {
        type: TRIGGER_ALERT_ACTION,
        payload: {
          id,
          action,
        },
      };
    },
  },
})
  .reduce(
    (state: AlertModuleState = { alerts: [] }, action): AlertModuleState => {
      switch (action.type) {
        case DISPLAY_ALERT: {
          if (
            state.alerts.filter((alert) => alert.id === action.payload.id)
              .length === 0
          ) {
            return {
              alerts: [...state.alerts, action.payload],
            };
          }
          break;
        }
        case HIDE_ALERT: {
          return {
            alerts: state.alerts.map((alert) => {
              if (alert.id === action.payload.id) {
                alert = {
                  ...alert,
                  hide: true,
                };
              }
              return alert;
            }),
          };
        }
        case REMOVE_ALERT: {
          return {
            alerts: state.alerts.filter(
              (alert) => alert.id !== action.payload.id
            ),
          };
        }
      }
      return state;
    }
  )
  .on((store) => (next) => (action) => {
    const alertState: AlertModuleState = store.getState().alerts;
    if (action.type === DISPLAY_ALERT) {
      clearTimeout(timeouts.hide[action.payload.id]);
      clearTimeout(timeouts.remove[action.payload.id]);
      if (action.payload.timeout > -1) {
        timeouts.hide[action.payload.id] = setTimeout(() => {
          store.dispatch(store.actions.hideAlert(action.payload.id));
        }, action.payload.timeout);
      }
    }
    if (action.type === HIDE_ALERT) {
      const foundAlert = alertState.alerts.filter(
        (alert) => alert.id === action.payload.id
      )[0];
      if (foundAlert) {
        timeouts.remove[action.payload.id] = setTimeout(
          () => {
            store.dispatch(store.actions.removeAlert(action.payload.id));
          },
          foundAlert.type === CONFIRMATION_ALERT_TYPE ? 500 : 0
        );
      }
    }
    if (action.type === HIDE_ALL_ALERTS) {
      alertState.alerts.forEach((alert) => {
        store.dispatch(store.actions.removeAlert(alert.id));
      });
    }
    if (action.type === TRIGGER_ALERT_ACTION && action.payload.action.action) {
      store.dispatch(action.payload.action.action);
    }
    next(action);
  });

const guidS4 = () =>
  Math.floor((1 + Math.random()) * 0x10000)
    .toString(16)
    .substring(1);

const guid = () =>
  guidS4() +
  guidS4() +
  '-' +
  guidS4() +
  '-' +
  guidS4() +
  '-' +
  guidS4() +
  '-' +
  guidS4() +
  guidS4() +
  guidS4();
