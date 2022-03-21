import {
  ReduxModuleTypeContainerAny,
  ReduxModuleMayRequireInitialization,
  ReduxModuleTypeContainer,
  ReduxModuleBase,
} from '@github1/redux-modules';

export * from './ajax';
export * from './alerts';
export * from './alerts/components/alert';
export * from './api';
export * from './conditions';
export * from './connect';
export * from './datasource';
export * from './navigation';
export * from './resize';
export * from './scrollbars';
export * from './timer';

import {
  ajax,
  alerts,
  api,
  conditions,
  datasource,
  navigation,
  resize,
  timer,
} from '.';

const modules: Record<string, any> = {
  ajax,
  alerts,
  api,
  conditions,
  datasource,
  navigation,
  resize,
  timer,
};

type AllTypes =
  | typeof ajax
  | typeof alerts
  | typeof api
  | typeof conditions
  | typeof datasource
  | typeof navigation
  | typeof resize
  | typeof timer;

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never;

type AllTypesWithName<
  N extends string,
  T extends AllTypes
> = T extends ReduxModuleBase<infer TReduxModuleTypeContainer>
  ? TReduxModuleTypeContainer extends ReduxModuleTypeContainerAny
    ? N extends TReduxModuleTypeContainer['_nameType']
      ? T
      : never
    : never
  : never;

type ModuleInitializerPropsTypeOfTypes<T extends AllTypes> =
  UnionToIntersection<T['_types']['_initializerPropsType']>;

export function commonModules<
  TName extends AllTypes['_types']['_nameType'],
  TTypes extends AllTypes = AllTypesWithName<TName, AllTypes>,
  TInitializerPropsType = ModuleInitializerPropsTypeOfTypes<TTypes>
>(
  ...name: TName[]
): ReduxModuleMayRequireInitialization<
  ReduxModuleTypeContainer<
    '_',
    {},
    TTypes['_types']['_actionType'],
    {},
    TInitializerPropsType
  >
> {
  return name
    .map((name) => modules[name])
    .reduce((combined, mod) => {
      if (combined) {
        combined = combined.with(mod);
      } else {
        combined = mod;
      }
      return combined;
    });
}
