import {
  ReduxModuleTypeContainerAny,
  ReduxModuleTypeContainerStoreState,
  ReduxModuleTypeContainerStoreActionCreatorDispatchBound,
  ReduxModuleBase,
} from '@github1/redux-modules';
import { ComponentType } from 'react';
import { Action, bindActionCreators, Store } from 'redux';
import { connect, ConnectedComponent, MapStateToProps } from 'react-redux';

export type ConnectModuleOptions<
  TMapStateToProps extends MapStateToProps<any, any> = MapStateToProps<
    any,
    any
  >,
  TMapActionsToProps extends MapStateToProps<any, any> = MapStateToProps<
    any,
    any
  >,
  TActionCreators = any
> = {
  mapStateToProps?: TMapStateToProps;
  mapActionsToProps?: TMapActionsToProps;
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
  TReduxModuleTypeContainer extends ReduxModuleBase<ReduxModuleTypeContainerAny>,
  TMapStateToProps extends MapStateToProps<
    TMapStateToPropsState,
    PropsExcludingFunctions<TComponentOwnProps>,
    TReduxModuleTypeContainerStoreState
  >,
  TMapActionsToProps extends MapStateToProps<
    TMapActionsToPropsState,
    PropsExcludingFunctions<TComponentOwnProps>,
    TReduxModuleTypeContainerStoreActionsDispatchBound
  >,
  TConnectModuleOptions extends ConnectModuleOptions<
    TMapStateToProps,
    TMapActionsToProps,
    PropsOnlyActionCreators<TComponentOwnProps>
  >,
  TComponentOwnProps = TComponent extends ComponentType<infer TOwnProps>
    ? TOwnProps
    : never,
  TMapActionsToPropsState = PropsOnlyFunctions<TComponentOwnProps>,
  TMapStateToPropsState = PropsExcludingFunctions<TComponentOwnProps>,
  TReduxModuleTypeContainerStoreActionsDispatchBound = TReduxModuleTypeContainer extends ReduxModuleBase<
    infer TReduxModuleTypeContainer
  >
    ? ReduxModuleTypeContainerStoreActionCreatorDispatchBound<TReduxModuleTypeContainer>
    : never,
  TReduxModuleTypeContainerStoreState = TReduxModuleTypeContainer extends ReduxModuleBase<
    infer TReduxModuleTypeContainer
  >
    ? ReduxModuleTypeContainerStoreState<TReduxModuleTypeContainer>
    : never
>(
  module: TReduxModuleTypeContainer,
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
          return opts.mapActionsToProps(combinedActionCreators, ownProps);
        } else {
          return {
            actions: Object.keys(combinedActionCreators).reduce(
              (creators, key) => {
                const bound = bindActionCreators(
                  combinedActionCreators[key],
                  dispatch
                );
                return { ...creators, [key]: bound };
              },
              {}
            ),
          };
        }
      }
    }
  );
  return enhancer(component);
}

function isConnectModuleOptions(
  maybeOpts: any
): maybeOpts is Partial<ConnectModuleOptions> {
  return (
    maybeOpts.mapStateToProps ||
    maybeOpts.mapActionsToProps ||
    maybeOpts.actions
  );
}
