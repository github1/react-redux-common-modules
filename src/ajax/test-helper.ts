import { ModuleLike } from '@github1/redux-modules';
import {Store} from 'redux';
import ajax from './index';
import {IDeferredPromise,DeferredPromise} from '@github1/build-tools';

let _ajaxResponseInternal;

export interface AjaxModuleTestHelper {
  ajaxResponse : IDeferredPromise;
  createStore? : (...module : Array<ModuleLike>) => Store;
  reset: () => void;
}

export const ajaxModuleTestHelper : AjaxModuleTestHelper = {
  ajaxResponse: {
    forceResolve(value : any) : void {
      _ajaxResponseInternal.forceResolve(value);
    },
    forceReject(value : any) : void {
      _ajaxResponseInternal.forceReject(value);
    }
  },
  reset: () => _ajaxResponseInternal = DeferredPromise.create()
};

export const createFakeAjaxModule = () => {
  _ajaxResponseInternal = DeferredPromise.create();
  return ajax({send: () => _ajaxResponseInternal});
};
ajaxModuleTestHelper.createStore = (...modules : Array<ModuleLike>) : Store => {
  return createFakeAjaxModule().enforceImmutableState().inRecordedStore(...modules);
};
