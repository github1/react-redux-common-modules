import { Module } from '@common/redux-modules';
import ajax, { success, failed } from './index';

const createDeferredPromise = () => DeferredPromise({
    onResolve(result) {
        ajaxModuleTestHelper.ajaxResponse = createDeferredPromise();
        return result;
    },
    onReject(err) {
        ajaxModuleTestHelper.ajaxResponse = createDeferredPromise();
        return err;
    }
});

export const ajaxModuleTestHelper = {
    ajaxResponse: createDeferredPromise()
};

export const createFakeAjaxModule = () => ajax({send: () => ajaxModuleTestHelper.ajaxResponse});
ajaxModuleTestHelper.createStore = (...modules) => {
    return createFakeAjaxModule().enforceImmutableState().inRecordedStore(...modules);
};