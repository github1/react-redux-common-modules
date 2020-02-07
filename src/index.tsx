import React from 'react';
import ReactDOM from 'react-dom';
import {Store} from 'redux';
import Alerts, {
  displayAlert,
  hideAllAlerts,
  requestConfirmation
} from './alerts';
import {Alerts as AlertsContainer} from './alerts/components/alert';
import {Module} from '@github1/redux-modules';
import {Provider} from 'react-redux'
import './index.scss';

const store : Store = Module.createStore(Alerts);

store.dispatch(displayAlert({
  title: 'hi',
  message: 'asdas',
  timeout: 5000
}));

store.dispatch(requestConfirmation({
  title: 'Hello',
  message: 'Test message',
  actions: [{
    label: 'some action'
  }]
}));

const root : HTMLDivElement = document.createElement('div');
document.body.appendChild(root);

ReactDOM.render(<Provider store={store}>
  <div>
    <button onClick={() => {
      store.dispatch(hideAllAlerts())
    }}>Hide
      Alerts
    </button>
    <AlertsContainer alertRenderer={(alert, index) => <div key={index}>
      <button onClick={() => {
        alert.dismiss();
      }}>dismiss</button>
      <div>{alert.message}</div>
      {
        alert.actions.map((action, index) => {
          return <button key={index}
                         onClick={() => action.trigger()}>k{action.label}</button>
        })
      }
    </div>}/>
  </div>
</Provider>, root);

