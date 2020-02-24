import { ModuleLike } from '@github1/redux-modules';
import {Store} from 'redux';
import ajax from './index';
import {IDeferredPromise,DeferredPromise} from '@github1/build-tools';

let _ajaxResponseInternal = DeferredPromise.create();

export interface AjaxModuleTestHelper {
  ajaxResponse : IDeferredPromise;
  createStore? : (...module : Array<ModuleLike>) => Store;
}

export const ajaxModuleTestHelper : AjaxModuleTestHelper = {
  ajaxResponse: {
    forceResolve(value : any) : void {
      _ajaxResponseInternal.forceResolve(value);
    },
    forceReject(value : any) : void {
      _ajaxResponseInternal.forceReject(value);
    }
  }
};

export const createFakeAjaxModule = () => ajax({send: () => _ajaxResponseInternal});
ajaxModuleTestHelper.createStore = (...modules : Array<ModuleLike>) : Store => {
  return createFakeAjaxModule().enforceImmutableState().inRecordedStore(...modules);
};
