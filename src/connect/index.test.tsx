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
      someActionCreator: () => { type: 'SOME_ACTION' };
      actions: {
        something: () => { type: 'SOMETHING' };
      };
    };
    const TestComponent: React.FC<TestComponentProps> = (props) => {
      return React.createElement(
        'div',
        {},
        `${props.componentProp}-${props.anotherComponentProp}`
      );
    };
    const TestModule = createModule('root', {
      actionCreators: {
        something(): { type: 'SOMETHING' } {
          return { type: 'SOMETHING' };
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
      {
        mapStateToProps: (state, ownProps) => {
          // should not need to map props to action creators from component props type
          expectType<TypeEqual<typeof state, { root: { test: string } }>>(true);
          return {
            componentProp: state.root.test,
            anotherComponentProp: `another-${ownProps.anotherComponentProp}`,
          };
        },
        actions: {
          someActionCreator() {
            return { type: 'SOME_ACTION' };
          },
          actions: {
            something() {
              return TestModule.actions.something();
            },
          },
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
  it('can be provided a mapActionsToProps function', () => {
    let actionCalled = false;
    const TestModule = createModule('root', {
      actionCreators: {
        something(): { type: 'SOMETHING' } {
          actionCalled = true;
          return { type: 'SOMETHING' };
        },
      },
    });
    const TestComponentConnected = connectModule(
      TestModule,
      {
        mapStateToProps: () => {
          return {
            foo: 'something',
          };
        },
        mapActionsToProps: (actions, ownProps) => {
          return {
            doSomethingBlah: () => {
              expectType<TypeEqual<typeof ownProps, { foo: string }>>(true);
              actions.root.something();
            },
          };
        },
      },
      (props: { foo: string; doSomethingBlah: () => void }) => {
        props.doSomethingBlah();
        return <div>{props.foo}</div>;
      }
    );
    const res = TestRenderer.create(
      createElement(TestComponentConnected, {
        store: TestModule.asStore(),
      })
    );
    expect(res.toJSON().children[0]).toBe('something');
    expect(actionCalled).toBeTruthy();
  });
  it('can be map dispatch to actions', () => {
    const TestComponentConformsToModuleState: React.FC<{
      test: string;
      actions: {
        root: {
          doSomething: (val: number) => void;
        };
      };
    }> = (props) => {
      return React.createElement(
        'div',
        {},
        `${props.test}-${props.actions.root.doSomething
          .toString()
          .replace(/\n|[ ]+/g, '')}`
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
    type DefaultPropsType =
      typeof TestComponentConnected['WrappedComponent']['defaultProps'];
    expectType<DefaultPropsType>({
      test: 'string',
      actions: {
        root: {
          doSomething: (val: number) => {
            if (val) {
            }
          },
        },
      },
    });
    const res = TestRenderer.create(
      createElement(TestComponentConnected, { store: TestModule.asStore() })
    );
    expect(res.toJSON().children[0]).toContain(
      'from-store-state-function(){returndispatch(actionCreator.apply(this,arguments));}'
    );
  });
  it('exposes actions of combined modules', () => {
    const TestModule = createModule('root', {
      actionCreators: {
        rootAction(): { type: 'ROOT1' } {
          return { type: 'ROOT1' };
        },
      },
    })
      .reduce((state: { test: number }) => {
        return { ...state, test: 100 };
      })
      .with(
        createModule('sub1', {
          actionCreators: {
            sub1Action(): { type: 'SUB1' } {
              return { type: 'SUB1' };
            },
          },
        })
      );
    const TestComponentConnected = connectModule(TestModule, (props) => {
      return (
        <div>
          {`${
            props.actions.root.rootAction.toString() +
            '|' +
            props.actions.sub1.sub1Action.toString()
          }`.replace(/\n/g, '')}
        </div>
      );
    });
    const res = TestRenderer.create(
      createElement(TestComponentConnected, { store: TestModule.asStore() })
    );
    expect(res.toJSON().children[0]).toMatch(
      /actionCreator\.apply.*actionCreator\.apply/
    );
  });
});
