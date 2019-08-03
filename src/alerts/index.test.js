import alert, {
    displayAlert, requestConfirmation, hideAlert
} from './index';


jest.useFakeTimers();

describe('when an alert is displayed', () => {
    let store;
    beforeEach(() => {
        store = alert.enforceImmutableState().inStore()
    });
    it('adds the alert to state', () => {
        store.dispatch(displayAlert({ title: 'SomeTitle', message: 'SomeMessage', timeout: 1 }));
        expect(store.getState().alerts.alerts[0].title).toBe('SomeTitle');
    });
    it('eventually hides the alert', () => {
        store.dispatch(displayAlert({ title: 'SomeTitle', message: 'SomeMessage', timeout: 1 }));
        jest.runOnlyPendingTimers();
        expect(store.getState().alerts.alerts[0].title).toBe('SomeTitle');
        expect(store.getState().alerts.alerts[0].hide).toBe(true);
    });
    it('eventually removes the alert', () => {
        store.dispatch(displayAlert({ title: 'SomeTitle', message: 'SomeMessage', timeout: 1 }));
        jest.runAllTimers();
        expect(store.getState().alerts.alerts.length).toBe(0);
    });
    it('does nothing if alertID not found when hiding', () => {
        store.dispatch(displayAlert({ title: 'SomeTitle', message: 'SomeMessage', timeout: 1 }));
        store.dispatch(hideAlert('blarp'));
        expect(store.getState().alerts.alerts.length).toBe(1);
    });
    it('displays confirmation dialogs', () => {
        store.dispatch(requestConfirmation({ title: 'SomeTitle', message: 'SomeMessage' }));
        expect(store.getState().alerts.alerts.length).toBe(1);
    });
});

