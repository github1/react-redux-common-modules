import {
  ReduxModuleTypeContainerAny,
  ReduxModule,
  ReduxModuleTypeContainerStoreState,
} from '@github1/redux-modules';
import { ComponentType } from 'react';
import { bindActionCreators, Store } from 'redux';
import { connect, ConnectedComponent, MapStateToProps } from 'react-redux';

export type ConnectModuleOptions<TMapStateToProps = undefined> = {
  mapStateToProps: TMapStateToProps;
};

type ActionCreatorsBound<TActionCreators> = TActionCreators extends undefined
  ? {}
  : TActionCreators extends Record<string, (...args: any[]) => any>
  ? {
      [k in keyof TActionCreators]: (
        ...args: Parameters<TActionCreators[k]>
      ) => void;
    }
  : {};

type ReduxModuleState<
  TReduxModuleTypeContainer extends ReduxModule<ReduxModuleTypeContainerAny>
> = TReduxModuleTypeContainer extends ReduxModule<
  infer TReduxModuleTypeContainer
>
  ? TReduxModuleTypeContainer['_stateType']
  : {};

type ReduxModuleActionCreators<
  TReduxModuleTypeContainer extends ReduxModule<ReduxModuleTypeContainerAny>
> = TReduxModuleTypeContainer extends ReduxModule<
  infer TReduxModuleTypeContainer
>
  ? TReduxModuleTypeContainer['_actionCreatorType']
  : {};

type ComponentState<TComponentType> = TComponentType extends ComponentType<
  infer TState
>
  ? TState
  : {};

type ComponentTypeConformingToReduxModule<
  TReduxModuleTypeContainer extends ReduxModule<ReduxModuleTypeContainerAny>,
  TComponentOwnProps = {}
> = ComponentType<
  ReduxModuleState<TReduxModuleTypeContainer> &
    TComponentOwnProps &
    ActionCreatorsBound<ReduxModuleActionCreators<TReduxModuleTypeContainer>>
>;

type ReduxModuleConnectedComponent<TState, TActionCreators> =
  ConnectedComponent<
    ComponentType<TState & TActionCreators>,
    Partial<TState & TActionCreators & { store: Store }>
  >;

export function connectModule(
  module: any,
  component: () => JSX.Element
): ReduxModuleConnectedComponent<unknown, unknown>;
export function connectModule<
  TComponentOwnProps,
  TReduxModuleTypeContainer extends ReduxModule<ReduxModuleTypeContainerAny>,
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
  ActionCreatorsBound<ReduxModuleActionCreators<TReduxModuleTypeContainer>>
>;
export function connectModule<
  TComponent extends ComponentType<any>,
  TReduxModuleTypeContainer extends ReduxModule<ReduxModuleTypeContainerAny>,
  TMapStateToProps extends MapStateToProps<
    TComponent extends ComponentType<infer TOwnProps> ? TOwnProps : never,
    TComponent extends ComponentType<infer TOwnProps> ? TOwnProps : never,
    TReduxModuleTypeContainer extends ReduxModule<
      infer TReduxModuleTypeContainer
    >
      ? ReduxModuleTypeContainerStoreState<TReduxModuleTypeContainer>
      : never
  >,
  TConnectModuleOptions extends ConnectModuleOptions<TMapStateToProps>
>(
  module: TReduxModuleTypeContainer,
  opts: TConnectModuleOptions,
  component: TComponent
): ReduxModuleConnectedComponent<ComponentState<TComponent>, {}>;
export function connectModule(
  module: ReduxModule<ReduxModuleTypeContainerAny>,
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
        return { ...state, ...module.actions, ...ownProps };
      }),
    (dispatch) => bindActionCreators(module.actions || {}, dispatch)
  );
  return enhancer(component);
}

function isConnectModuleOptions(
  maybeOpts: any
): maybeOpts is Partial<ConnectModuleOptions> {
  return maybeOpts.connect || maybeOpts.mapStateToProps;
}
