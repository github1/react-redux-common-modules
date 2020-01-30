import {Module} from '@github1/redux-modules';
import {AnyAction} from 'redux';

export const ON_CONDITION = '@conditions/on_condition';

export interface ConditionActionProvider {
  (state : any) : Array<AnyAction> | AnyAction;
}

export type ConditionResult = AnyAction | ConditionActionProvider;

export interface StateCondition {
  (state : any) : boolean;
}

export class OnStateActionDefinition {
  public timeout: number = 5000;
  public timeoutActions : Array<ConditionResult>;

  constructor(public condition : StateCondition,
              public actions : Array<ConditionResult>) {
  }

  public onTimeout(timeout: number, ...actions : Array<ConditionResult>) : OnStateActionDefinition {
    this.timeout = timeout;
    this.timeoutActions = actions;
    return this;
  }
}

export const stateCondition = (condition : StateCondition,
                               ...actions : Array<ConditionResult>) : OnStateActionDefinition =>
  new OnStateActionDefinition(condition, actions);

export const waitFor = (definition : OnStateActionDefinition) : AnyAction => {
  return {
    type: ON_CONDITION,
    definition
  };
};

export default Module.create({
  name: 'conditions',
  middleware: store => next => action => {
    if (ON_CONDITION === action.type) {
      let timedout = false;
      const definition : OnStateActionDefinition = action.definition;
      const waitTimeout = setTimeout(() => {
        processConditionActions(definition.timeoutActions);
      }, definition.timeout);
      const processConditionActions = (conditionResults: Array<ConditionResult>) => {
        if (conditionResults) {
          const conditionActions : Array<AnyAction> = [];
          conditionResults.forEach((conditionResult : ConditionResult) => {
            let resultingActions : AnyAction | AnyAction[];
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
          conditionActions.forEach((conditionAction : AnyAction) => {
            store.dispatch(conditionAction);
          });
        }
      };
      const checkCondition = () => {
        if (definition.condition(store.getState())) {
          clearTimeout(waitTimeout);
          processConditionActions(definition.actions);
        } else {
          if (!timedout) {
            setTimeout(() => checkCondition(), 1);
          }
        }
      };
      checkCondition();
    }
    next(action);
  }
});
