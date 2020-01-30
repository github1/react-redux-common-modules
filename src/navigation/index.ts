import {Module} from '@github1/redux-modules';

export const NAVIGATION_PRE_REQUEST = '@NAVIGATION/PRE_REQUEST';
export const NAVIGATION_REQUESTED = '@NAVIGATION/REQUESTED';
export const NAVIGATION_DENIED = '@NAVIGATION/DENIED';
export const NAVIGATION_ALLOWED = '@NAVIGATION/ALLOWED';
export const NAVIGATION_PUSH_HISTORY = '@NAVIGATION/PUSH_HISTORY';
export const NAVIGATION_COMPLETE = '@NAVIGATION/COMPLETE';
export const NAVIGATION_ACTION = '@NAVIGATION/ACTION';
export const NAVIGATION_SYNC = '@NAVIGATION/SYNC';

let navigationCounter : number = 0;

export type NavigationSectionVisibility = 'visible' | 'hidden';

export interface NavigationPath {
  path : string;
}

export interface NavigationSectionLifecycleHandler {
  (section? : NavigationSectionConcrete, action? : any, state? : any) : any | PromiseLike<any>;
}

export interface NavigationSection extends NavigationPath {
  index? : number;
  title : string;
  icon : string;
  visibility : NavigationSectionVisibility;
  handler? : NavigationSectionLifecycleHandler;
}

export interface NavigationSectionConcrete extends NavigationSection {
  fullPath? : string;
  queryString? : string;
  queryParams? : any;
  pathPattern? : string;
  pathParams? : any;
}

export interface NavigationQueryParams {
  [s : string] : any;
}

class NavigationSectionInstance implements NavigationSection {
  private _handler : NavigationSectionLifecycleHandler;

  constructor(public readonly title : string,
              public readonly icon : string,
              public readonly path : string,
              public readonly visibility : NavigationSectionVisibility) {
  }

  public get handler() : NavigationSectionLifecycleHandler {
    return this._handler;
  }

  public handle(handler : NavigationSectionLifecycleHandler) : NavigationSectionInstance {
    this._handler = handler;
    return this;
  }
}

/**
 * Creates a section.
 *
 * @param title
 * @param icon
 * @param path
 * @param visibility
 */
export const section = (title : string,
                        icon : string,
                        path : string,
                        visibility : NavigationSectionVisibility = 'visible') : NavigationSectionInstance =>
  new NavigationSectionInstance(title, icon, path, visibility);

/**
 * Creates a hidden section.
 *
 * @param title
 * @param icon
 * @param path
 */
export const hiddenSection = (
  title : string,
  icon : string,
  path : string) : NavigationSectionInstance => section(title, icon, path, 'hidden');

/**
 * Set section index and filter for visibility.
 *
 * @param sections
 */
const prepareSections = (sections : Array<NavigationSection>) : Array<NavigationSection> => sections
  .map((section, index) => {
    section.index = index;
    return section;
  }).filter(section => section.visibility === 'visible');

/**
 * Extract query params from a path.
 *
 * @param value
 */
export const extractQueryParams = (value : string) : NavigationQueryParams => {
  const queryParams = /\?(.*)$/.exec(value);
  if (queryParams === null) {
    return {};
  }
  return queryParams[1].split(/&/).reduce((res, cur) => {
    const parts = cur.split(/=/) as Array<any>;
    if (parts.length === 1) {
      parts.push(true);
    }
    if (Array.isArray(res[parts[0]])) {
      res[parts[0]].push(parts[1]);
    } else if (res[parts[0]]) {
      res[parts[0]] = [res[parts[0]]];
      res[parts[0]].push(parts[1]);
    } else {
      res[parts[0]] = parts[1];
    }
    return res;
  }, {});
};

/**
 * Action creator to request navigation.
 *
 * @param search
 * @param delay
 */
export const navigate = (search, delay? : number) => {
  return {
    type: NAVIGATION_PRE_REQUEST,
    search,
    delay
  };
};

/**
 * Action creator to synchronize navigation state.
 */
export const syncNavigation = () => {
  return {
    type: NAVIGATION_SYNC
  }
};

/**
 * Action creator to deny a navigation request.
 *
 * @param section
 */
const deny = (section : NavigationSection) => {
  return {
    type: NAVIGATION_DENIED,
    section
  };
};

/**
 * Action creator allow a navigation request.
 *
 * @param section
 * @param delay
 */
const allow = (section : NavigationSection, delay? : number) => {
  return {
    type: NAVIGATION_ALLOWED,
    section,
    delay
  };
};

/**
 * Action creator to indicate a navigation request is complete.
 *
 * @param section
 */
const complete = (section : NavigationSection) => {
  return {
    type: NAVIGATION_COMPLETE,
    section
  };
};

export interface NavigationPermission {
  allow() : void;

  deny() : void;
}

export interface OnBeforeNavigate {
  (section : NavigationSection, permission : NavigationPermission) : void;
}

const invokeNavigationSectionLifecycleHandler = async (
  sections : Array<NavigationSection>,
  action : any,
  store : any,
  ...defaultActions : Array<any>) => {
  let handlerResult : any;
  const section = findSection(sections, action.section);
  if (section.handler) {
    handlerResult = section.handler(section, action, store.getState());
    if (handlerResult) {
      if (handlerResult.then) {
        handlerResult = await handlerResult;
      }
    }
  }
  handlerResult = (Array.isArray(handlerResult) ? handlerResult : [handlerResult]).filter((action) => action);
  if (handlerResult.filter((action) => action.type === NAVIGATION_PRE_REQUEST).length === 0) {
    handlerResult.push(...defaultActions);
  }
  handlerResult.forEach((action) => {
    store.dispatch(action);
  });
};

export interface NavigationModuleOptions {
  history : any,
  onBeforeNavigate : OnBeforeNavigate,
  sections : Array<NavigationSection>
}

export default ({history, onBeforeNavigate, sections} : NavigationModuleOptions) : Module => {
  onBeforeNavigate = onBeforeNavigate || ((section, cb) => cb.allow());
  return Module.create({
    name: 'navigation',
    preloadedState: {
      sections: prepareSections(sections),
      phase: 'idle'
    },
    reducer: (state = {}, action) => {
      switch (action.type) {
        case NAVIGATION_REQUESTED:
          return {
            ...state,
            phase: 'navigation-requested'
          };
        case NAVIGATION_COMPLETE:
          return {
            ...state,
            phase: 'idle',
            path: action.section.path,
            fullPath: action.section.fullPath,
            pathPattern: action.section.pathPattern,
            title: action.section.title,
            queryParams: action.section.queryParams,
            pathParams: action.section.pathParams,
            sections: state.sections.map(section => {
              return {
                ...section,
                active: action.section.path.toLowerCase().indexOf(section.path.toLowerCase()) === 0
              };
            })
          };
        case NAVIGATION_DENIED:
          return {
            ...state,
            phase: 'idle'
          };
        case NAVIGATION_ALLOWED:
          return {
            ...state,
            phase: 'navigation-in-progress'
          };
      }
      return state;
    },
    middleware: store => {
      history.listen(() => {
        store.dispatch(complete(findSection(sections, {path: history.location.pathname + history.location.search})));
      });
      return next => async (action) => {
        if (NAVIGATION_PRE_REQUEST === action.type) {
          // Find the section from the given input
          const section = findSection(sections, action.search);
          // Check if an action is associated with the nav section
          const navAction = /action::(.*)/.exec(section.path);
          // Delay before navigation
          const delay = action.delay;
          if (navAction === null) {
            store.dispatch({
              type: NAVIGATION_REQUESTED,
              section,
              delay,
              counter: ++navigationCounter
            });
          } else {
            store.dispatch({
              type: NAVIGATION_ACTION,
              navigationAction: navAction[1],
              section
            });
          }
        } else if (NAVIGATION_REQUESTED === action.type) {
          next(action);
          if (action.counter === navigationCounter) {
            if (action.sync) {
              store.dispatch(complete(action.section))
            } else {
              onBeforeNavigate(action.section, {
                allow: () => store.dispatch(allow(action.section, action.delay)),
                deny: () => store.dispatch(deny(action.section))
              });
            }
          }
        } else if (NAVIGATION_SYNC === action.type) {
          const section = findSection(sections, {path: history.location.pathname + history.location.search});
          store.dispatch({
            type: NAVIGATION_REQUESTED,
            section,
            sync: true,
            counter: ++navigationCounter
          });
        } else if (NAVIGATION_ALLOWED === action.type) {
          next(action);
          await invokeNavigationSectionLifecycleHandler(
            sections,
            action,
            store,
            {...action, type: NAVIGATION_PUSH_HISTORY});
        } else if (NAVIGATION_PUSH_HISTORY === action.type) {
          next(action);
          if (action.delay > 0) {
            setTimeout(() => {
              history.push(action.section.fullPath);
            }, action.delay);
          } else {
            history.push(action.section.fullPath);
          }
        } else if (NAVIGATION_COMPLETE === action.type) {
          next(action);
          await invokeNavigationSectionLifecycleHandler(sections, action, store);
        } else {
          next(action);
        }
      }
    }
  });
};

export interface NavigationMatchResult {
  found : NavigationSection,
  capturedParams : any,
  pathPattern : string,
  otherThanPathMatch : boolean
}

export const findSection = (sections : Array<NavigationSection>, search : string | NavigationPath) : NavigationSectionConcrete => {
  let found : NavigationSectionConcrete;
  let queryParams = {};
  let queryString = '';
  let pathParams = {};
  let pathPattern;
  let overridePath;
  const originalSearch : string | NavigationPath = search;
  let searchPath : string = typeof originalSearch === 'string' ? originalSearch : originalSearch.path;
  const indexOfQueryParams = searchPath.indexOf('?');
  if (indexOfQueryParams > -1) {
    queryParams = extractQueryParams(searchPath);
    queryString = searchPath.substring(indexOfQueryParams).trim();
    searchPath = searchPath.substring(0, indexOfQueryParams).trim()
  }
  const isAction = /::/.test(searchPath);
  if (!/^\//.test(searchPath) && !isAction) {
    searchPath = `/${searchPath}`;
  }
  if (searchPath !== '/') {
    searchPath = searchPath.replace(/[\/]+$/, '');
  }
  if (isAction) {
    searchPath = searchPath.toLowerCase();
  }
  const urlMatched : NavigationMatchResult = matchURL(sections, searchPath);
  const foundNavigationSection : NavigationSection = urlMatched.found;
  if (foundNavigationSection) {
    pathParams = urlMatched.capturedParams;
    pathPattern = urlMatched.pathPattern;
    if (urlMatched.otherThanPathMatch) {
      overridePath = pathPattern;
    }
  } else {
    found = {
      title: null,
      icon: null,
      path: searchPath,
      visibility: null
    };
  }
  if (foundNavigationSection) {
    found = JSON.parse(JSON.stringify(foundNavigationSection));
    found.queryParams = queryParams;
    found.queryString = queryString;
    found.pathParams = found.pathParams || pathParams;
    found.pathPattern = pathPattern || found.path;
    found.path = (overridePath || searchPath || found.path);
    found.fullPath = (overridePath || searchPath || found.path) + found.queryString;
    found.handler = foundNavigationSection.handler;
  }
  return found;
};

const matchURL = (sections : Array<NavigationSection>, searchValue : string) : NavigationMatchResult => {
  const urlParts = searchValue.split(/\//);
  let capturedParams;
  let otherThanPathMatch = false;
  for (let i = 0; i < sections.length; i++) {
    capturedParams = {};
    let isMatch = false;
    const patternKey = sections[i].path;
    if (searchValue === patternKey.toLowerCase()) {
      isMatch = true;
    } else if (searchValue === ('/' + sections[i].title.toLowerCase())) {
      isMatch = true;
      otherThanPathMatch = true;
    } else {
      const patternParts = patternKey.split(/\//);
      let matchingParts = 0;
      if (patternParts.length === urlParts.length) {
        for (let j = 0; j < patternParts.length; j++) {
          const patternPart = patternParts[j];
          const isParamPattern = /^:/.exec(patternPart);
          if (patternPart === urlParts[j] || isParamPattern !== null) {
            matchingParts++;
            if (isParamPattern !== null) {
              capturedParams[patternPart.substring(1)] = urlParts[j];
            }
          }
        }
        if (matchingParts === patternParts.length) {
          isMatch = true;
        }
      }
    }
    if (isMatch) {
      return {
        found: sections[i],
        capturedParams,
        pathPattern: patternKey,
        otherThanPathMatch
      };
    }
  }
  return {
    found: null,
    capturedParams: null,
    pathPattern: null,
    otherThanPathMatch: null
  };
};
