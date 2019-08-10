import React from 'react';
import {
  Button,
  Modal
} from 'react-bootstrap';
import alerts, {ConfirmAlertAction} from '../../alerts';

export interface HtmlAlertMessage {
  __html?: string;
}

export interface AlertPropTypes {
  title? : string;
  message? : string | HtmlAlertMessage;
  type? : string;
  isShowing? : boolean;
  dismiss? : () => void;
}

export const Alert = ({title, message, type, isShowing, dismiss} : AlertPropTypes) => {
  const classNames = ['alert', 'alert-dismissible', 'alert-floating', `alert-${type}`, 'animated', 'faster'];
  if (typeof isShowing !== 'undefined') {
    if (isShowing) {
      classNames.push('fadeIn');
    } else {
      classNames.push('fadeOut');
    }
  }
  const alertMessage = title ?
    <div className="alert-message"><strong
      className="alert-title">{title}</strong>, {message}.</div> :
    <div>{message}</div>;
  return (
    <div
      className={classNames.join(' ')}>
      {dismiss ? <a href="javascript:void(0);"
                    className="close"
                    data-dismiss="alert"
                    aria-label="close"
                    onClick={dismiss}>&times;</a> : null}
      {alertMessage}
    </div>
  );
};

export interface ConfirmAlertPropTypes extends AlertPropTypes {
  triggerAlertAction? : (action : ConfirmAlertAction) => void;
  actions? : Array<ConfirmAlertAction>;
}

export const ConfirmAlert = ({title, message, isShowing, dismiss, triggerAlertAction, actions} : ConfirmAlertPropTypes) => {
  const messageBody = (message as HtmlAlertMessage).__html ?
    <div dangerouslySetInnerHTML={message}></div> : <div>{message}</div>;
  return <Modal show={isShowing} onHide={dismiss}>
    <Modal.Header closeButton>
      <Modal.Title>{title}</Modal.Title>
    </Modal.Header>
    <Modal.Body>
      {messageBody}
    </Modal.Body>
    <Modal.Footer>
      {
        actions.map((action, index) => {
          return <Button key={index}
                         className={action.className}
                         onClick={() => triggerAlertAction(action)}>{action.label}</Button>
        })
      }
    </Modal.Footer>
  </Modal>;
};

export const Alerts = alerts._(({alerts, dismissAlert, triggerAlertAction}) => {
  return <div>
    <div className="alert-container">
      {
        alerts.alerts
          .filter((alert) => alert.type !== 'confirmation')
          .map((alert, index) => (
            <Alert key={index} name='Alert' {...alert}
                   isShowing={!alert.hide}
                   dismiss={() => dismissAlert(alert.id)}
            />
          ))
      }
    </div>
    {
      alerts.alerts
        .reverse()
        .filter((alert) => alert.type === 'confirmation')
        .map((alert, index) => (
          <ConfirmAlert key={index} name='ConfirmAlert' {...alert}
                        isShowing={!alert.hide}
                        dismiss={() => dismissAlert(alert.id)}
                        triggerAlertAction={(action) => triggerAlertAction(alert.id, action)}/>
        ))
    }
  </div>;
});
