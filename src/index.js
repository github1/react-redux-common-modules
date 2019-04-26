import React from 'react';
import ReactDOM from 'react-dom';
import Alerts, {displayAlert, hideAllAlerts, requestConfirmation} from './alerts';
import {Alerts as AlertsContainer} from './alerts/components/alert';
import {Module} from '@github1/redux-modules';
import {Provider} from 'react-redux'
import './index.scss';

const store = Module.createStore(Alerts);

store.dispatch(displayAlert({
    title: 'hi',
    message: 'asdas',
    timeout: 5000
}));

store.dispatch(requestConfirmation({
    title: 'Hello',
    message: 'Test message'
}));

const root = document.createElement('div');
document.body.appendChild(root);

ReactDOM.render(<Provider store={store}>
    <div>
        <button onClick={ () => { store.dispatch(hideAllAlerts()) } }>Hide
            Alerts
        </button>
        <AlertsContainer/>
    </div>
</Provider>, root);

