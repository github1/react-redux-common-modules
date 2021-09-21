import { createModule } from '@github1/redux-modules';
import { api, DATA_FETCH_SUCCESS } from './index';
import { ajax } from '../ajax';

export const apiModuleTestHelper = ajax.with(api).with(
  createModule('fetchResults').reduce(
    (
      state: { [k: string]: any } = {},
      action: typeof api['_types']['_actionType']
    ) => {
      if (action.type === DATA_FETCH_SUCCESS) {
        return {
          ...state,
          [action.queryName]: action.data,
        };
      }
      return state;
    }
  )
);
