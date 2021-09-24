import React, { createElement } from 'react';
import TestRenderer from 'react-test-renderer';
import { connectModule } from '.';
import { createModule } from '@github1/redux-modules';
import { expectType, TypeEqual } from 'ts-expect';

describe('when connecting modules', () => {
  it('uses a default mapStateToProps function', () => {
    const TestComponentConformsToModuleState: React.FC<{ test: number }> = (
      props
    ) => {
      return <div>{`inside connected comp: ${props.test}`}</div>;
    };
    const TestModule = createModule('root').reduce(
      (state: { test: number }) => {
        return { ...state, test: 100 };
      }
    );
    const TestComponentConnected = connectModule(
      TestModule,
      TestComponentConformsToModuleState
    );
    const res = TestRenderer.create(
      createElement(TestComponentConnected, { store: TestModule.asStore() })
    );
    expect(res.toJSON().children[0]).toBe('inside connected comp: 100');
  });
  it('ownProps take precendence with default mapStateToProps function', () => {
    const TestComponentConformsToModuleState: React.FC<{ test: number }> = (
      props
    ) => {
      return React.createElement(
        'div',
        {},
        `inside connected comp: ${props.test}`
      );
    };
    const TestModule = createModule('root')
      .reduce((state: { test: number }) => {
        return state;
      })
      .preloadedState({
        test: 55,
      });
    const TestComponentConnected = connectModule(
      TestModule,
      TestComponentConformsToModuleState
    );
    const res = TestRenderer.create(
      createElement(TestComponentConnected, {
        test: 12,
        store: TestModule.asStore(),
      })
    );
    expect(res.toJSON().children[0]).toBe('inside connected comp: 12');
  });
  it('can be provided a mapStateToProps function', () => {
    type TestComponentProps = {
      componentProp: string;
      anotherComponentProp?: string;
    };
    const TestComponent: React.FC<TestComponentProps> = (props) => {
      return React.createElement(
        'div',
        {},
        `${props.componentProp}-${props.anotherComponentProp}`
      );
    };
    const TestModule = createModule('root')
      .reduce((state: { test: string }) => {
        return state;
      })
      .preloadedState({
        test: 'from-store-state',
      });
    const TestComponentConnected = connectModule(
      TestModule,
      {
        mapStateToProps: (state, ownProps) => {
          expectType<TypeEqual<typeof state, { root: { test: string } }>>(true);
          return {
            componentProp: state.root.test,
            anotherComponentProp: `another-${ownProps.anotherComponentProp}`,
          };
        },
      },
      TestComponent
    );
    expectType<
      typeof TestComponentConnected['WrappedComponent']['defaultProps']
    >({
      componentProp: 'a',
      anotherComponentProp: 'another-a',
    });
    const res = TestRenderer.create(
      createElement(TestComponentConnected, {
        anotherComponentProp: 'from-own-props',
        store: TestModule.asStore(),
      })
    );
    expect(res.toJSON().children[0]).toBe(
      'from-store-state-another-from-own-props'
    );
  });
  it('can be map dispatch to actions', () => {
    const TestComponentConformsToModuleState: React.FC<{
      test: string;
      doSomething: (val: number) => void;
    }> = (props) => {
      return React.createElement(
        'div',
        {},
        `${props.test}-${props.doSomething.toString().replace(/\n|[ ]+/g, '')}`
      );
    };
    const TestModule = createModule('root', {
      actionCreators: {
        doSomething(actionCreatorArg: number): { type: 'SOME_ACTION' } {
          return actionCreatorArg > 0
            ? {
                type: 'SOME_ACTION',
              }
            : null;
        },
      },
    })
      .reduce((state: { test: string }) => {
        return state;
      })
      .preloadedState({
        test: 'from-store-state',
      });
    const TestComponentConnected = connectModule(
      TestModule,
      TestComponentConformsToModuleState
    );
    expectType<
      typeof TestComponentConnected['WrappedComponent']['defaultProps']
    >({
      test: 'string',
      doSomething: (val: number) => {
        if (val) {
        }
      },
    });
    const res = TestRenderer.create(
      createElement(TestComponentConnected, { store: TestModule.asStore() })
    );
    expect(res.toJSON().children[0]).toContain(
      'from-store-state-function(){returndispatch(actionCreator.apply(this,arguments));}'
    );
  });
});
