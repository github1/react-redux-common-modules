import { createModule } from '@github1/redux-modules';
import { Action, AnyAction } from 'redux';

export interface ConditionActionProvider {
  (state: any): Array<AnyAction> | AnyAction;
}

export type ConditionResult = AnyAction | AnyAction[] | ConditionActionProvider;

export interface StateCondition {
  (state: any): boolean;
}

export interface OnConditionAction extends Action<'@conditions/on_condition'> {
  condition: StateCondition;
  timeout: number;
  main: Array<ConditionResult>;
  alt: Array<ConditionResult>;
}

export interface OnConditionBuilder extends OnConditionAction {
  thenDispatch(...actions: Array<ConditionResult>): OnConditionAction;

  otherwiseDispatch(...actions: Array<ConditionResult>): OnConditionAction;
}

export default createModule('conditions', {
  actionCreators: {
    waitFor(
      condition: StateCondition,
      timeout: number = 1000
    ): OnConditionBuilder {
      const onCondition: OnConditionBuilder = {
        type: '@conditions/on_condition',
        condition,
        timeout,
        main: [],
        alt: [],
        thenDispatch: (...actions: Array<ConditionResult>) => {
          onCondition.main = actions;
          return onCondition;
        },
        otherwiseDispatch: (...actions: Array<ConditionResult>) => {
          onCondition.alt = actions;
          return onCondition;
        },
      };
      return onCondition;
    },
    onlyIf(condition: StateCondition): OnConditionBuilder {
      return this.waitFor(condition, 0);
    },
  },
}).on((store) => (next) => (action: OnConditionAction) => {
  if ('@conditions/on_condition' === action.type) {
    const processConditionActions = (
      conditionResults: Array<ConditionResult>
    ) => {
      if (conditionResults) {
        const conditionActions: Array<AnyAction> = [];
        conditionResults.forEach((conditionResult: ConditionResult) => {
          let resultingActions: AnyAction | AnyAction[];
          if (typeof conditionResult === 'function') {
            resultingActions = conditionResult(store.getState());
          } else {
            resultingActions = conditionResult;
          }
          if (Array.isArray(resultingActions)) {
            conditionActions.push(...resultingActions);
          } else {
            conditionActions.push(resultingActions);
          }
        });
        conditionActions.forEach((conditionAction: AnyAction) => {
          store.dispatch(conditionAction as any);
        });
      }
    };

    const definition: OnConditionAction = action;
    if (definition.timeout > 0) {
      let timedout = false;
      const waitTimeout = setTimeout(() => {
        timedout = true;
        processConditionActions(definition.alt);
      }, definition.timeout);
      const checkCondition = () => {
        if (definition.condition(store.getState())) {
          clearTimeout(waitTimeout);
          processConditionActions(definition.main);
        } else {
          if (!timedout) {
            setTimeout(() => checkCondition(), 1);
          }
        }
      };
      checkCondition();
    } else {
      if (definition.condition(store.getState())) {
        processConditionActions(definition.main);
      } else {
        processConditionActions(definition.alt);
      }
    }
  }
  next(action);
});
