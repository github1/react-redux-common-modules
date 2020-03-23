import Conditions, {
  onlyIf,
  waitFor
} from './index';

describe('conditions', () => {
  let store;
  beforeEach(() => {
    store = Conditions.enforceImmutableState().inRecordedStore(stateManipulator);
  });
  describe('stateCondition', () => {
    describe('waitFor', () => {
      it('dispatches an action when the state condition is met', async () => {
        store
          .dispatch(waitFor((state) => state.someData.condition_value === true)
            .thenDispatch({type: 'CONDITION_MET'}));
        store.dispatch({type: 'SET_CONDITION'});
        await store.getState().recording.waitForType('CONDITION_MET');
      });
      it('actions can be generated from a function', async () => {
        store.dispatch(waitFor((state) => state.someData.condition_value === true)
          .thenDispatch((state) => ({type: 'CONDITION_MET_' + state.someData.condition_value})));
        store.dispatch({type: 'SET_CONDITION'});
        await store.getState().recording.waitForType('CONDITION_MET_true');
      });
      it('dispatches an array of action when the state condition is met', async () => {
        store.dispatch(waitFor((state) => state.someData.condition_value === true)
          .thenDispatch([{type: 'CONDITION_MET_1'}, {type: 'CONDITION_MET_2'}]));
        store.dispatch({type: 'SET_CONDITION'});
        await store.getState().recording.waitForType('CONDITION_MET_1');
        await store.getState().recording.waitForType('CONDITION_MET_2');
      });
      it('timesout if condition not met in a period of time', async () => {
        store.dispatch(waitFor(() => false, 100)
          .otherwiseDispatch({type: 'CONDITION_TIMEOUT'}));
        await store.getState().recording.waitForType('CONDITION_TIMEOUT', 1000);
      }, 1000);
    });
    describe('onlyIf', () => {
      it('dispatches an array of actions if the state condition is met at the time of dispatch', async () => {
        store
          .dispatch(onlyIf(() => true)
            .thenDispatch({type: 'CONDITION_MET'}));
        await store.getState().recording.waitForType('CONDITION_MET');
      });
      it('dispatches alternative actions if the state condition is not met at the time of dispatch', async () => {
        store
          .dispatch(onlyIf(() => false)
            .otherwiseDispatch({type: 'CONDITION_NOT_MET'}));
        await store.getState().recording.waitForType('CONDITION_NOT_MET');
      });
    });
  });
});

const stateManipulator = {
  name: 'someData',
  reducer: (state = {}, action) => {
    if (action.type === 'SET_CONDITION') {
      return {
        ...state,
        condition_value: true
      }
    }
    return state;
  }
};
