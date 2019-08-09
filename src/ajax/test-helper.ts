import { ModuleLike } from '@github1/redux-modules';
import {Store} from 'redux';
import ajax from './index';
import {DeferredPromise} from '@github1/build-tools';

const createDeferredPromise = () => DeferredPromise.create({
  onResolve(result) {
    ajaxModuleTestHelper.ajaxResponse = createDeferredPromise();
    return result;
  },
  onReject(err) {
    ajaxModuleTestHelper.ajaxResponse = createDeferredPromise();
    return err;
  }
});

export interface AjaxModuleTestHelper {
  ajaxResponse : DeferredPromise;
  createStore? : (...module : Array<ModuleLike>) => Store;
}

export const ajaxModuleTestHelper : AjaxModuleTestHelper = {
  ajaxResponse: createDeferredPromise()
};

export const createFakeAjaxModule = () => ajax({send: () => ajaxModuleTestHelper.ajaxResponse});
ajaxModuleTestHelper.createStore = (...modules : Array<ModuleLike>) : Store => {
  return createFakeAjaxModule().enforceImmutableState().inRecordedStore(...modules);
};
