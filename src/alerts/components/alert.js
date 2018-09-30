import React from 'react';
import { Modal, Button } from 'react-bootstrap';
import alerts from '../../alerts';

export const Alert = ({title, message, type, isShowing, dismiss}) => {
    const classNames = ['alert', 'alert-dismissible', 'alert-floating', `alert-${type}`, 'animated'];
    if (isShowing) {
        classNames.push('fadeIn');
    } else {
        classNames.push('fadeOut');
    }
    const alertMessage = title ?
        <div className="alert-message"><strong
            className="alert-title">{ title }</strong>, { message }.</div> :
        <div>{message}</div>;
    return (
        <div
            className={ classNames.join(' ') }>
            <a href="javascript:void(0);"
               className="close"
               data-dismiss="alert"
               aria-label="close"
               onClick={ dismiss }>&times;</a>
            { alertMessage }
        </div>
    );
};

export const ConfirmAlert = ({title, message, isShowing, dismiss, triggerAlertAction, actions}) => {
    const messageBody = message.__html ?
        <div dangerouslySetInnerHTML={message}></div> : <div>{message}</div>;
    return <Modal show={isShowing} onHide={dismiss}>
        <Modal.Header closeButton>
            <Modal.Title>{ title }</Modal.Title>
        </Modal.Header>
        <Modal.Body>
            { messageBody }
        </Modal.Body>
        <Modal.Footer>
            {
                actions.map((action, index) => {
                    return <Button key={ index }
                                   className={ action.className }
                                   onClick={ () => triggerAlertAction(action) }>{ action.label }</Button>
                })
            }
        </Modal.Footer>
    </Modal>;
};

export const Alerts = alerts._(({ alerts, dismissAlert, triggerAlertAction }) => {
    return <div>
        {
            alerts.alerts.map((alert, index) => (
                alert.type === 'confirmation' ? (
                    <ConfirmAlert key={index} {...alert}
                                  isShowing={ !alert.hide }
                                  dismiss={ () => dismissAlert(alert.id) }
                                  triggerAlertAction={ (action) => triggerAlertAction(alert.id, action) }/>
                ) : (
                    <Alert key={index} {...alert}
                           isShowing={ !alert.hide }
                           dismiss={ () => dismissAlert(alert.id) }
                    />
                )
            ))
        }
    </div>;
});