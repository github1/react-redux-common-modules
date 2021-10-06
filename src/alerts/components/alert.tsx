import React from 'react';
import {
  alerts,
  AlertModuleAlertState,
  ConfirmAlertAction,
} from '../../alerts';
import { connectModule } from '../../connect';

export interface ConfirmAlertActionProps extends ConfirmAlertAction {
  trigger(): void;
}

export interface AlertProps {
  id: string;
  type: string;
  message: string;
  hide: boolean;
  dismiss: () => void;
  actions: Array<ConfirmAlertActionProps>;
}

export type AlertRenderer =
  | ((props: AlertProps, index?: number) => JSX.Element)
  | { type: any };

export interface AlertsProps {
  alertRenderer: AlertRenderer;
}

export const Alerts = connectModule<AlertsProps, typeof alerts>(
  alerts,
  (props) => {
    const { alerts, actions, alertRenderer } = props;
    const renderAlert = (alert: AlertModuleAlertState, index: number) => {
      const alertProps: AlertProps = {
        ...alert,
        hide: alert.hide,
        actions: (alert.actions || []).map((action) => {
          return {
            ...action,
            trigger: () => actions.alerts.triggerAlertAction(alert.id, action),
          };
        }),
        dismiss: () => actions.alerts.dismissAlert(alert.id),
      };
      if (typeof alertRenderer === 'function') {
        return alertRenderer(alertProps, index);
      } else {
        const AlertRenderer: any = alertRenderer;
        return <AlertRenderer key={alert.id} {...alertProps} />;
      }
    };
    return (
      <div>
        <div className="alert-container">
          {alerts
            .filter((alert) => alert.type !== 'confirmation')
            .map(renderAlert)}
        </div>
        {[...alerts]
          .reverse()
          .filter((alert) => alert.type === 'confirmation')
          .map(renderAlert)}
      </div>
    );
  }
);
