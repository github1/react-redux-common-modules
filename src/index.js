import React from 'react';
import ReactDOM from 'react-dom';
import Alerts, {displayAlert} from './alerts';
import {Alerts as AlertsContainer} from './alerts/components/alert';
import {Module} from '@github1/redux-modules';
import {Provider} from 'react-redux'
import 'bootstrap/scss/bootstrap.scss';

const store = Module.createStore(Alerts);

store.dispatch(displayAlert({
    title: 'hi',
    message: 'asdas'
}));

const root = document.createElement('div');
document.body.appendChild(root);

ReactDOM.render(<Provider store={store}><AlertsContainer/></Provider>, root);

