import {Module} from '@github1/redux-modules';
import {bindActionCreators} from 'redux';
import {connect} from 'react-redux'

export interface ConnectModuleOptions {
  mapStateToProps? : (state: any) => any;
  actions?: any;
  connect?: Function;
}

export const connectModule = (module : Module, opts : ConnectModuleOptions = {}) => {
  const reduxConnect = opts.connect || connect;
  const { mapStateToProps, actions } = opts;
  return reduxConnect(
    mapStateToProps || ((state) => state),
    dispatch => bindActionCreators(actions || (module as any as { actions : any }).actions, dispatch)
  );
};
