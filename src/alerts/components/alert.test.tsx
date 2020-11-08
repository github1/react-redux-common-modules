import React from 'react';
import TestRenderer from 'react-test-renderer';
import AlertsModule, {displayAlert, requestConfirmation} from '../../alerts';
import {Alerts} from './alert';
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
  it('displays alerts with renderer as function', () => {
    const alerts = TestRenderer.create(<Alerts store={store}
                                               alertRenderer={(props, index) => {
                                                 return <div key={index}>
                                                   <div
                                                     data-name="id">{props.id}</div>
                                                   <div
                                                     data-name="message">{props.message}</div>
                                                 </div>;
                                               }}/>).toJSON();
    expect(findJson(alerts, withAttribute('data-name', 'id'))[0].children[0]).toBe(alertID);
    expect(findJson(alerts, withAttribute('data-name', 'message'))[0].children[0]).toBe('someMessage');
  });
  it('displays alerts with functional component', () => {
    const alerts = TestRenderer.create(<Alerts store={store}
                                               alertRenderer={React.memo(({id, message}) => {
                                                 return <div>
                                                   <div
                                                     data-name="id">{id}</div>
                                                   <div
                                                     data-name="message">{message}</div>
                                                 </div>;
                                               })}/>).toJSON();
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
    const alerts = TestRenderer.create(<Alerts store={store}
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
                                               }}/>).toJSON();
    const actions = findJson(alerts, withAttribute('data-alertType', 'confirmation'));
    expect(actions[0].children[0].children[0]).toBe('action-1');
    expect(actions[0].children[1].children[0]).toBe('action-2');
  });
});
