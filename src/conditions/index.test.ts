import Conditions, {
  stateCondition,
  waitFor
} from './index';

describe('conditions', () => {
  let store;
  beforeEach(() => {
    store = Conditions.enforceImmutableState().inRecordedStore(stateManipulator);
  });
  describe('stateCondition', () => {
    it('fires an action when the state condition is met', async () => {
      store.dispatch(waitFor(stateCondition(
        (state) => state.someData.condition_value === true,
        {type: 'CONDITION_MET'})));
      store.dispatch({type: 'SET_CONDITION'});
      await store.getState().recording.waitForType('CONDITION_MET');
    });
    it('actions can be generated from a function', async () => {
      store.dispatch(waitFor(stateCondition(
        (state) => state.someData.condition_value === true,
        (state) => ({type: 'CONDITION_MET_' + state.someData.condition_value}))));
      store.dispatch({type: 'SET_CONDITION'});
      await store.getState().recording.waitForType('CONDITION_MET_true');
    });
    it('fires an array of action when the state condition is met', async () => {
      store.dispatch(waitFor(stateCondition(
        (state) => state.someData.condition_value === true,
        [{type: 'CONDITION_MET_1'}, {type: 'CONDITION_MET_2'}])));
      store.dispatch({type: 'SET_CONDITION'});
      await store.getState().recording.waitForType('CONDITION_MET_1');
      await store.getState().recording.waitForType('CONDITION_MET_2');
    });
    it('timesout if condition not met in a period of time', async () => {
      store.dispatch(waitFor(stateCondition(() => false, {type: 'CONDITION_METS'})
        .onTimeout(1, {type: 'CONDITION_TIMEOUT'})));
      await store.getState().recording.waitForType('CONDITION_TIMEOUT', 1000);
    }, 1000);
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
