import React from 'react';
import {Store} from 'redux';
import alerts, {
  AlertModuleAlertState,
  AlertModuleState,
  ConfirmAlertAction
} from '../../alerts';

export interface ConfirmAlertActionProps extends ConfirmAlertAction {
  trigger();
}

export interface AlertProps {
  id : string;
  type : string;
  message : string;
  hide : boolean;
  dismiss : () => void;
  actions : Array<ConfirmAlertActionProps>;
}

export interface AlertsProps {
  store? : Store;
  alertRenderer : (props : AlertProps, index? : number) => JSX.Element;
}

export interface AlertsConnectedProps {
  alerts : AlertModuleState;
  dismissAlert : (alertId : string) => void;
  triggerAlertAction : (alertId : string, action : ConfirmAlertAction) => void;
}

export const Alerts = ({store, alertRenderer} : AlertsProps) => {
  const Connected = alerts._((props : AlertsConnectedProps) => {
    const {alerts, dismissAlert} = props;
    const renderAlert = (alert : AlertModuleAlertState, index : number) => {
      return alertRenderer({
        ...alert,
        actions: (alert.actions || []).map((action) => {
          return {
            ...action,
            trigger: () => props.triggerAlertAction(alert.id, action)
          };
        }),
        dismiss: () => dismissAlert(alert.id)
      }, index);
    };
    return <div>
      <div className="alert-container">
        {
          alerts.alerts
            .filter((alert) => alert.type !== 'confirmation')
            .map(renderAlert)
        }
      </div>
      {
        alerts.alerts
          .reverse()
          .filter((alert) => alert.type === 'confirmation')
          .map(renderAlert)
      }
    </div>;
  });
  return <Connected store={store}/>;
};
