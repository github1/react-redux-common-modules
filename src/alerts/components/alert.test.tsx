import React from 'react';
import AlertsModule, {
  displayAlert,
  requestConfirmation
} from '../../alerts';
import {Alerts} from './alert';
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
    const alerts = renderToJson(<Alerts store={store}
                                        alertRenderer={(props, index) => {
                                          return <div key={index}>
                                            <div
                                              data-name="id">{props.id}</div>
                                            <div
                                              data-name="message">{props.message}</div>
                                          </div>;
                                        }}/>);
    expect(findJson(alerts, withAttribute('data-name', 'id'))[0].children[0]).toBe(alertID);
    expect(findJson(alerts, withAttribute('data-name', 'message'))[0].children[0]).toBe('someMessage');
  });
  it('displays confirmation dialogs', () => {
    store.dispatch(requestConfirmation({
      title: 'Confirmation',
      message: 'Confirm?',
      actions: [{
        label: 'action-1'
      }, {
        label: 'action-2'
      }]
    }));
    const alerts = renderToJson(<Alerts store={store}
                                        alertRenderer={(props, index) => {
                                          return <div key={index}
                                                      data-alertType={props.type}>
                                            {
                                              props.actions.map((action, i) => {
                                                return <div key={i}
                                                            data-name='label'>{action.label}</div>;
                                              })
                                            }
                                          </div>;
                                        }}/>);
    const actions = findJson(alerts, withAttribute('data-alertType', 'confirmation'));
    expect(actions[0].attributes.children[0].props.children).toBe('action-1');
    expect(actions[0].attributes.children[1].props.children).toBe('action-2');
  });
});
