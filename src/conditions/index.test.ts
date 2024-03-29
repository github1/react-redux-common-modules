import { createModule } from '@github1/redux-modules';
import { AnyAction } from 'redux';
import { conditions } from './index';
const { onlyIf, waitFor } = conditions.actions;

describe('conditions', () => {
  const stateManipulator = createModule('someData').reduce(
    (state: any, action: AnyAction) => {
      if (action.type === 'SET_CONDITION') {
        return {
          ...state,
          condition_value: true,
        };
      }
    }
  );
  const store = conditions.with(stateManipulator).asStore({
    record: true,
    enforceImmutableState: true,
    deferred: true,
  });
  beforeEach(() => {
    store.reload();
  });
  describe('stateCondition', () => {
    describe('waitFor', () => {
      it('dispatches an action when the state condition is met', async () => {
        store.dispatch(
          waitFor(
            (state) => state.someData.condition_value === true
          ).thenDispatch({ type: 'CONDITION_MET' })
        );
        store.dispatch({ type: 'SET_CONDITION' } as any);
        await store.getState().recording.waitFor('CONDITION_MET' as any);
      });
      it('actions can be generated from a function', async () => {
        store.dispatch(
          waitFor(
            (state) => state.someData.condition_value === true
          ).thenDispatch((state) => ({
            type: 'CONDITION_MET_' + state.someData.condition_value,
          }))
        );
        store.dispatch({ type: 'SET_CONDITION' } as any);
        await store.getState().recording.waitFor('CONDITION_MET_true' as any);
      });
      it('dispatches an array of action when the state condition is met', async () => {
        store.dispatch(
          waitFor(
            (state) => state.someData.condition_value === true
          ).thenDispatch([
            { type: 'CONDITION_MET_1' },
            { type: 'CONDITION_MET_2' },
          ])
        );
        store.dispatch({ type: 'SET_CONDITION' } as any);
        await store.getState().recording.waitFor('CONDITION_MET_1' as any);
        await store.getState().recording.waitFor('CONDITION_MET_2' as any);
      });
      it('timesout if condition not met in a period of time', async () => {
        store.dispatch(
          waitFor(() => false, 100).otherwiseDispatch({
            type: 'CONDITION_TIMEOUT',
          })
        );
        await store
          .getState()
          .recording.waitFor('CONDITION_TIMEOUT' as any, 1000);
      }, 1000);
    });
    describe('onlyIf', () => {
      it('dispatches an array of actions if the state condition is met at the time of dispatch', async () => {
        store.dispatch(
          onlyIf(() => true).thenDispatch({ type: 'CONDITION_MET' })
        );
        await store.getState().recording.waitFor('CONDITION_MET' as any);
      });
      it('dispatches alternative actions if the state condition is not met at the time of dispatch', async () => {
        store.dispatch(
          onlyIf(() => false).otherwiseDispatch({ type: 'CONDITION_NOT_MET' })
        );
        await store.getState().recording.waitFor('CONDITION_NOT_MET' as any);
      });
    });
  });
});
