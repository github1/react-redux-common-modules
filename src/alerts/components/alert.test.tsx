import React from 'react';
import AlertsModule, {
  displayAlert,
  hideAlert,
  requestConfirmation
} from '../../alerts';
import {
  Alert,
  Alerts
} from './alert';
import renderToJson from 'react-render-to-json';
import {
  findJson,
  withAttribute
} from '@github1/build-tools';

describe('Alerts', () => {
  let store;
  let alertID;
  beforeEach(() => {
    store = AlertsModule.inRecordedStore();
    store.dispatch(displayAlert({
      title: 'someTitle',
      message: 'someMessage',
      type: 'success'
    }));
    alertID = store.getState().recording.actions[1].payload.id;
  });
  it('displays alerts', () => {
    const alerts = renderToJson(<Alerts store={store}/>);
    const alert = findJson(alerts, withAttribute('name', 'Alert'))[0];
    expect(alert).toBeDefined();
    expect(alert.attributes.title).toBe('someTitle');
    expect(findJson(alert, child => /fadeIn/.test(child.attributes.className)).length).toBe(1);
  });
  it('hides the alert when the close button is clicked', () => {
    const alerts = renderToJson(<Alerts store={store}/>);
    const evt = {
      preventDefault: jest.fn()
    };
    findJson(alerts, withAttribute('className', 'close'))[0].attributes.onClick(evt);
    expect(evt.preventDefault).toHaveBeenCalled();
    expect(store.getState().recording.findType('@ALERT/HIDE')[0].payload.id).toBe(alertID);
  });
  it('displays alerts without a title', () => {
    const alert = renderToJson(<Alert message="foo" isShowing={true}/>);
    expect(findJson(alert, withAttribute('className', 'alert-title')).length).toBe(0);
  });
  it('hides alerts', () => {
    store.dispatch(hideAlert(alertID));
    const alerts = renderToJson(<Alerts store={store}/>);
    const alert = findJson(alerts, withAttribute('name', 'Alert'))[0];
    expect(findJson(alert, child => /fadeOut/.test(child.attributes.className)).length).toBe(1);
  });
  it('displays confirmation dialogs', () => {
    store.dispatch(requestConfirmation({
      title: 'Confirmation',
      message: 'Confirm?'
    }));
    const alerts = renderToJson(<Alerts store={store}/>);
    const alert = findJson(alerts, withAttribute('name', 'ConfirmAlert'))[0];
    expect(alert.attributes.title).toBe('Confirmation');
  });
});
