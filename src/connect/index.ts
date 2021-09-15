import { ReduxModuleAny, ReduxModule } from '@github1/redux-modules';
import { ComponentType } from 'react';
import { bindActionCreators, Store } from 'redux';
import {
  connect,
  Connect,
  ConnectedComponent,
  MapStateToProps,
} from 'react-redux';

export interface ConnectModuleOptions<TMapStateToProps = undefined> {
  connect?: Connect;
  mapStateToProps: TMapStateToProps;
}

// <TPath extends string, TState, TAction extends Action | unknown, TActionCreators, TInitializer extends ModuleInitializer<any>, TStoreState = StoreStateAtPath<TState, TPath>>

// TMapDispatchToProps extends MapDispatchToProps<TActions, TOwnProps> = MapDispatchToProps<TActions, TOwnProps>,

// <IMapStateToProps, IMapDispatchToProps, IOwnProps, IReduxState>

// ConnectedComponent<C, DistributiveOmit<GetLibraryManagedProps<C>, keyof Shared<TInjectedProps, GetLibraryManagedProps<C>>> & TNeedsProps>

type ActionCreatorsBound<TActionCreators> = TActionCreators extends {
  [k: string]: (...args: any[]) => any;
}
  ? {
      [k in keyof TActionCreators]: (
        ...args: Parameters<TActionCreators[k]>
      ) => void;
    }
  : {};

type ReduxModuleState<TReduxModule extends ReduxModule<ReduxModuleAny>> =
  TReduxModule extends ReduxModule<infer TReduxModule>
    ? TReduxModule['_stateType']
    : {};

type ReduxModuleActionCreators<
  TReduxModule extends ReduxModule<ReduxModuleAny>
> = TReduxModule extends ReduxModule<infer TReduxModule>
  ? TReduxModule['_actionCreatorType']
  : {};

type ComponentState<TComponentType> = TComponentType extends ComponentType<
  infer TState
>
  ? TState
  : {};

type ComponentTypeConformingToReduxModule<
  TReduxModule extends ReduxModule<ReduxModuleAny>,
  TComponentOwnProps = {}
> = ComponentType<
  ReduxModuleState<TReduxModule> &
    TComponentOwnProps &
    ActionCreatorsBound<ReduxModuleActionCreators<TReduxModule>>
>;

type ReduxModuleConnectedComponent<TState, TActionCreators> =
  ConnectedComponent<
    ComponentType<TState & TActionCreators>,
    Partial<TState & TActionCreators & { store: Store }>
  >;

export function connectModule<
  TComponentOwnProps,
  TReduxModule extends ReduxModule<ReduxModuleAny>,
  TComponentType extends ComponentTypeConformingToReduxModule<
    TReduxModule,
    TComponentOwnProps
  > = ComponentTypeConformingToReduxModule<TReduxModule, TComponentOwnProps>
>(
  module: TReduxModule,
  component: TComponentType,
  opts?: Omit<ConnectModuleOptions, 'mapStateToProps'>
): ReduxModuleConnectedComponent<
  ReduxModuleState<TReduxModule> & TComponentOwnProps,
  ActionCreatorsBound<ReduxModuleActionCreators<TReduxModule>>
>;
export function connectModule<
  TComponent extends ComponentType<any>,
  TReduxModule extends ReduxModule<ReduxModuleAny>,
  TMapStateToProps extends MapStateToProps<
    TComponent extends ComponentType<infer TOwnProps> ? TOwnProps : never,
    TComponent extends ComponentType<infer TOwnProps> ? TOwnProps : never,
    TReduxModule extends ReduxModule<infer TReduxModule>
      ? TReduxModule['_storeStateType']
      : never
  >,
  TConnectModuleOptions extends ConnectModuleOptions<TMapStateToProps>
>(
  module: TReduxModule,
  component: TComponent,
  opts: TConnectModuleOptions
): ReduxModuleConnectedComponent<ComponentState<TComponent>, {}>;
export function connectModule(
  module: ReduxModule<ReduxModuleAny>,
  component: ComponentType,
  opts: any
) {
  const reduxConnect: Connect = opts?.connect || connect;
  const enhancer = reduxConnect(
    opts?.mapStateToProps ||
      ((state: any, ownProps: any) => {
        let keys: string[] = [...module.path];
        while (keys.length > 0) {
          state = state[keys.shift()];
        }
        return { ...state, ...module.actions, ...ownProps };
      }),
    (dispatch) =>
      bindActionCreators(opts?.actions || module.actions || {}, dispatch)
  );
  return enhancer(component);
}
