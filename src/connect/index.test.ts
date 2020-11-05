import {connectModule} from '.';
import {Module} from '@github1/redux-modules';

describe('when connecting modules', () => {
  it('uses a default mapStateToProps function', () => {
    const connect = jest.fn();
    connectModule(Module.fromReducer(() => {
    }), {connect});
    expect(connect.mock.calls[0][0]('a')).toBe('a');
    expect(connect.mock.calls[0][1]()).toEqual({});
  });
  it('can be provided a mapStateToProps function', () => {
    const connect = jest.fn();
    connectModule(Module.fromReducer(() => {
    }), { mapStateToProps: () => 'hi', connect });
    expect(connect.mock.calls[0][0]()).toBe('hi');
    expect(connect.mock.calls[0][1]()).toEqual({});
  });
});
