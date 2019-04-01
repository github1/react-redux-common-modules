import { Module } from '@github1/redux-modules';
import api, { DATA_FETCH_SUCCESS } from './index';
import { ajaxModuleTestHelper, createFakeAjaxModule } from '../ajax/test-helper';
import ajax, { success, failed } from '../ajax';

export const apiModuleTestHelper = ajaxModuleTestHelper;
apiModuleTestHelper.createStore = (...modules) => {
    const fakeAjaxModule = createFakeAjaxModule();
    const fetchCaptureModule = Module.fromReducer('fetchResults', (state = {}, action) => {
        if (action.type === DATA_FETCH_SUCCESS) {
            return {
                ...state,
                [action.queryName]: action.data
            };
        }
        return state;
    });
    return api.enforceImmutableState().inRecordedStore(...[fakeAjaxModule, fetchCaptureModule, ...modules]);
};
