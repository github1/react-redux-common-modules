import {
  ReduxModuleTypeContainerAny,
  ReduxModuleTypeContainerStoreState,
  ReduxModuleTypeContainerStoreActionCreatorDispatchBound,
  ReduxModuleBase,
  ReduxModuleTypeContainerStoreActionCreator,
  ADD_ACTION_LISTENER,
  REMOVE_ACTION_LISTENER,
} from '@github1/redux-modules';
import React, { ComponentType, useEffect } from 'react';
import { Action, bindActionCreators, Store } from 'redux';
import {
  connect,
  ConnectedComponent,
  MapStateToProps,
  useStore,
} from 'react-redux';
import { ThunkAction } from 'redux-thunk';

type ReduxModuleActionCreatorizedFunctions<
  TOwnPropsWhichAreFunctions,
  TStoreState,
  TAction extends Action
> = {
  [k in keyof TOwnPropsWhichAreFunctions]: TOwnPropsWhichAreFunctions[k] extends (
    ...args: infer TArgs
  ) => infer TReturn
    ? (
        ...args: TArgs
      ) => ThunkAction<TReturn, TStoreState, {}, TAction> | TAction
    : never;
};

type ReduxModuleMapActionsToProps<
  TStateProps,
  TOwnPropsExcludingFunctions,
  TStoreActionCreators extends Record<string, (...args: any) => Action>,
  TStoreState,
  TAction extends Action
> = (
  actions: TStoreActionCreators,
  ownProps: TOwnPropsExcludingFunctions
) => ReduxModuleActionCreatorizedFunctions<TStateProps, TStoreState, TAction>;

type ReduxModuleInterceptor<
  TStoreActionCreators extends Record<string, (...args: any) => Action>,
  TStoreState,
  TAction extends Action,
  TInterceptorContext = { actions: TStoreActionCreators; state: TStoreState }
> = (
  action: TAction,
  context: TInterceptorContext
) => ThunkAction<any, TStoreState, {}, TAction> | TAction | void;

type ReduxModuleStoreState<TReduxModule> = TReduxModule extends ReduxModuleBase<
  infer TReduxModuleTypeContainer
>
  ? ReduxModuleTypeContainerStoreState<TReduxModuleTypeContainer>
  : never;

type ReduxModuleStoreActionCreator<TReduxModule> =
  TReduxModule extends ReduxModuleBase<infer TReduxModuleTypeContainer>
    ? ReduxModuleTypeContainerStoreActionCreator<TReduxModuleTypeContainer>
    : never;

type ReduxModuleStoreActionType<TReduxModule> =
  TReduxModule extends ReduxModuleBase<infer TReduxModuleTypeContainer>
    ? TReduxModuleTypeContainer['_actionType']
    : never;

export type ConnectModuleOptions<
  TMapStateToProps extends MapStateToProps<any, any> = MapStateToProps<
    any,
    any
  >,
  TMapActionsToProps extends ReduxModuleMapActionsToProps<
    any,
    any,
    any,
    any,
    any
  > = ReduxModuleMapActionsToProps<any, any, any, any, any>,
  TReduxModuleInterceptor extends ReduxModuleInterceptor<
    any,
    any,
    any
  > = ReduxModuleInterceptor<any, any, any>,
  TActionCreators = any
> = {
  mapStateToProps?: TMapStateToProps;
  mapActionsToProps?: TMapActionsToProps;
  interceptor?: TReduxModuleInterceptor;
  actions?: TActionCreators;
};

type ReduxModuleState<
  TReduxModuleTypeContainer extends ReduxModuleBase<ReduxModuleTypeContainerAny>
> = TReduxModuleTypeContainer extends ReduxModuleBase<
  infer TReduxModuleTypeContainer
>
  ? TReduxModuleTypeContainer['_stateType'] extends undefined
    ? {}
    : TReduxModuleTypeContainer['_stateType']
  : {};

type ComponentState<TComponentType> = TComponentType extends ComponentType<
  infer TState
>
  ? TState
  : {};

type ReduxModuleTypeContainerStoreActionCreatorDispatchBoundForComponent<
  TReduxModuleTypeContainer extends ReduxModuleTypeContainerAny
> = {
  actions: ReduxModuleTypeContainerStoreActionCreatorDispatchBound<TReduxModuleTypeContainer>;
};

type ComponentTypeConformingToReduxModule<
  TReduxModuleTypeContainer extends ReduxModuleBase<ReduxModuleTypeContainerAny>,
  TComponentOwnProps = {}
> = ComponentType<
  ReduxModuleState<TReduxModuleTypeContainer> &
    TComponentOwnProps &
    ReduxModuleTypeContainerStoreActionCreatorDispatchBoundForComponent<
      TReduxModuleTypeContainer['_types']
    >
>;

type ReduxModuleConnectedComponent<TState, TActionCreators> =
  ConnectedComponent<
    ComponentType<TState & TActionCreators>,
    Partial<TState & TActionCreators & { store: Store }>
  >;

type IsActionCreator<T> = T extends (...args: any) => infer R
  ? R extends Action
    ? true
    : false
  : T extends Record<string, infer TRecordItemType>
  ? IsActionCreator<TRecordItemType>
  : false;

type PropsWhichAreActionCreators<TProps> = TProps extends Record<any, any>
  ? {
      [k in keyof TProps]: true extends IsActionCreator<TProps[k]> ? k : never;
    }[keyof TProps]
  : never;

type PropsOnlyActionCreators<TProps> = Omit<
  TProps,
  Exclude<keyof TProps, PropsWhichAreActionCreators<TProps>>
>;

type IsFunction<T> = T extends (...args: any) => any
  ? true
  : T extends Record<string, infer TRecordItemType>
  ? IsFunction<TRecordItemType>
  : false;

type PropsWhichAreFunctions<TProps> = TProps extends Record<any, any>
  ? {
      [k in keyof TProps]: true extends IsFunction<TProps[k]> ? k : never;
    }[keyof TProps]
  : never;

type PropsExcludingFunctions<TProps> = Omit<
  TProps,
  PropsWhichAreFunctions<TProps>
>;

type PropsOnlyFunctions<TProps> = Omit<
  TProps,
  Exclude<keyof TProps, PropsWhichAreFunctions<TProps>>
>;

export function connectModule<
  TComponentOwnProps,
  TReduxModuleTypeContainer extends ReduxModuleBase<ReduxModuleTypeContainerAny>,
  TComponentType extends ComponentTypeConformingToReduxModule<
    TReduxModuleTypeContainer,
    TComponentOwnProps
  > = ComponentTypeConformingToReduxModule<
    TReduxModuleTypeContainer,
    TComponentOwnProps
  >
>(
  module: TReduxModuleTypeContainer,
  component: TComponentType
): ReduxModuleConnectedComponent<
  ReduxModuleState<TReduxModuleTypeContainer> & TComponentOwnProps,
  ReduxModuleTypeContainerStoreActionCreatorDispatchBoundForComponent<
    TReduxModuleTypeContainer['_types']
  >
>;
export function connectModule<
  TComponent extends ComponentType<any>,
  TReduxModule extends ReduxModuleBase<ReduxModuleTypeContainerAny>,
  TMapStateToProps extends MapStateToProps<
    Partial<PropsExcludingFunctions<TComponentOwnProps>>,
    Partial<PropsExcludingFunctions<TComponentOwnProps>>,
    ReduxModuleStoreState<TReduxModule>
  >,
  TMapActionsToProps extends ReduxModuleMapActionsToProps<
    PropsOnlyFunctions<TComponentOwnProps>,
    PropsExcludingFunctions<TComponentOwnProps>,
    ReduxModuleStoreActionCreator<TReduxModule>,
    ReduxModuleStoreState<TReduxModule>,
    ReduxModuleStoreActionType<TReduxModule>
  >,
  TInterceptor extends ReduxModuleInterceptor<
    ReduxModuleStoreActionCreator<TReduxModule>,
    ReduxModuleStoreState<TReduxModule>,
    ReduxModuleStoreActionType<TReduxModule>
  >,
  TConnectModuleOptions extends ConnectModuleOptions<
    TMapStateToProps,
    TMapActionsToProps,
    TInterceptor,
    PropsOnlyActionCreators<TComponentOwnProps>
  >,
  TComponentOwnProps = TComponent extends ComponentType<
    infer TComponentOwnProps
  >
    ? TComponentOwnProps
    : {}
>(
  module: TReduxModule,
  opts: TConnectModuleOptions,
  component: TComponent
): ReduxModuleConnectedComponent<ComponentState<TComponent>, {}>;
export function connectModule(
  module: ReduxModuleBase<ReduxModuleTypeContainerAny>,
  componentOrOpts: ComponentType | Partial<ConnectModuleOptions>,
  component?: ComponentType
) {
  const opts: Partial<ConnectModuleOptions> = isConnectModuleOptions(
    componentOrOpts
  )
    ? componentOrOpts
    : {};
  component = isConnectModuleOptions(componentOrOpts)
    ? component
    : componentOrOpts;
  const enhancer = connect(
    opts?.mapStateToProps ||
      ((state: any, ownProps: any) => {
        let keys: string[] = [...module.path];
        while (keys.length > 0) {
          state = state[keys.shift()];
        }
        return { ...state, ...ownProps };
      }),
    (dispatch, ownProps) => {
      if (opts?.actions) {
        return bindActionCreators(opts?.actions, dispatch);
      } else {
        const combinedActionCreators = (
          module as any
        ).getCombinedActionCreators();
        if (opts?.mapActionsToProps) {
          const mappedActions = opts.mapActionsToProps(
            combinedActionCreators,
            ownProps
          );
          return bindActionCreators(mappedActions, dispatch);
        } else {
          const combinedActionCreatorsBound = Object.keys(
            combinedActionCreators
          ).reduce((creators, key) => {
            const bound = bindActionCreators(
              combinedActionCreators[key],
              dispatch
            );
            return { ...creators, [key]: bound };
          }, {});
          return {
            actions: combinedActionCreatorsBound,
          };
        }
      }
    }
  );
  const wrapped: React.FC = (props) => {
    const store = (props as any).store || useStore();
    if (opts.interceptor) {
      useEffect(() => {
        const listener = (action: Action) => {
          const resultingAction = opts.interceptor(action, {
            state: store.getState(),
            actions: (store as any).actions,
          });
          if (resultingAction) {
            store.dispatch(resultingAction);
          }
        };
        store.dispatch({ type: ADD_ACTION_LISTENER, listener });
        return () => {
          store.dispatch({ type: REMOVE_ACTION_LISTENER, listener });
        };
      }, []);
    }
    return React.createElement(component as any, props);
  };
  return enhancer(wrapped);
}

function isConnectModuleOptions(
  maybeOpts: any
): maybeOpts is Partial<ConnectModuleOptions> {
  return (
    maybeOpts.mapStateToProps ||
    maybeOpts.mapActionsToProps ||
    maybeOpts.interceptor ||
    maybeOpts.actions
  );
}
