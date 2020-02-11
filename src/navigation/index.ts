import {Module} from '@github1/redux-modules';
import {AnyAction} from 'redux';

export const NAVIGATION_PHASE_CHANGED = '@NAVIGATION/PHASE_CHANGED';
export const NAVIGATION_PRE_REQUEST = '@NAVIGATION/PRE_REQUEST';
export const NAVIGATION_REQUESTED = '@NAVIGATION/REQUESTED';
export const NAVIGATION_DENIED = '@NAVIGATION/DENIED';
export const NAVIGATION_ALLOWED = '@NAVIGATION/ALLOWED';
export const NAVIGATION_PUSH_HISTORY = '@NAVIGATION/PUSH_HISTORY';
export const NAVIGATION_COMPLETE = '@NAVIGATION/COMPLETE';
export const NAVIGATION_ACTION = '@NAVIGATION/ACTION';
export const NAVIGATION_SYNC = '@NAVIGATION/SYNC';

let navigationCounter : number = 0;

const allSections : { [k : string] : NavigationSectionInstance } = {};

export enum NavigationSectionVisibility {
  VISIBLE = 'visible',
  HIDDEN = 'hidden'
}

export interface NavigationPath {
  path : string;
}

export enum NavigationPhase {
  IDLE = 'idle',
  REQUESTED = 'navigation-requested',
  IN_PROGRESS = 'navigation-in-progress'
}

export enum NavigationLifecycleStage {
  ACTION = 'action',
  BEFORE = 'before',
  AFTER = 'after'
}

export interface NavigationSectionLifecycleHandler {
  (section? : NavigationSectionConcrete, stage? : NavigationLifecycleStage, state? : any) : any | Promise<any>;
}

export const interceptNavigation = (interceptor : (actions : Array<AnyAction>) => any | Promise<any>) => {
  return {
    interceptor
  }
};

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
  pathFound? : boolean;
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

  public register() : NavigationSectionInstance {
    allSections[this.path] = this;
    return this;
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
                        visibility : NavigationSectionVisibility = NavigationSectionVisibility.VISIBLE) : NavigationSectionInstance =>
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
  path : string) : NavigationSectionInstance => section(title, icon, path, NavigationSectionVisibility.HIDDEN);

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

const phaseChanged = (phase : NavigationPhase) => {
  return {
    type: NAVIGATION_PHASE_CHANGED,
    phase
  }
};

export interface NavigationPermission {
  allow() : void;

  deny() : void;
}

export interface OnBeforeNavigate {
  (section : NavigationSection, permission : NavigationPermission) : void;
}

const invokeNavigationSectionLifecycleHandler = async (
  section : NavigationSectionConcrete,
  stage : NavigationLifecycleStage,
  store : any,
  ...defaultActions : Array<AnyAction>) => {
  let handlerResult : any;
  let wasIntercepted : boolean = false;
  if (section.handler) {
    handlerResult = section.handler(section, stage, store.getState());
    if (handlerResult) {
      if (handlerResult.interceptor) {
        wasIntercepted = true;
        handlerResult = handlerResult.interceptor(defaultActions);
      }
      if (handlerResult.then) {
        handlerResult = await handlerResult;
      }
    }
  }
  handlerResult = (Array.isArray(handlerResult) ? handlerResult : [handlerResult]).filter((action) => action);
  if (!wasIntercepted && handlerResult.filter((action) => action.type === NAVIGATION_PRE_REQUEST).length === 0) {
    handlerResult.push(...defaultActions);
  }
  handlerResult.forEach((action) => {
    store.dispatch(action);
  });
};

export interface NavigationModuleOptions {
  history : any,
  onBeforeNavigate : OnBeforeNavigate,
  sections : Array<NavigationSectionInstance>,
  interceptClicks? : boolean
}

export default ({history, onBeforeNavigate, sections = [], interceptClicks = false} : NavigationModuleOptions) : Module => {
  onBeforeNavigate = onBeforeNavigate || ((section, cb) => cb.allow());
  sections.forEach((section) => section.register());
  let clickInterceptorConfigured : boolean = false;
  return Module.create({
    name: 'navigation',
    preloadedState: {
      sections: prepareSections(sections),
      phase: NavigationPhase.IDLE,
      queryParams: {},
      pathParams: {}
    },
    reducer: (state = {}, action) => {
      switch (action.type) {
        case NAVIGATION_COMPLETE:
          return {
            ...state,
            path: action.section.path,
            fullPath: action.section.fullPath,
            pathPattern: action.section.pathPattern,
            title: action.section.title,
            queryParams: action.section.queryParams,
            pathParams: action.section.pathParams,
            pathFound: action.section.pathFound,
            sections: state.sections.map(section => {
              return {
                ...section,
                active: action.section.path.toLowerCase().indexOf(section.path.toLowerCase()) === 0
              };
            })
          };
        case NAVIGATION_PHASE_CHANGED:
          return {
            ...state,
            phase: action.phase
          }
      }
      return state;
    },
    middleware: store => {
      if (interceptClicks && !clickInterceptorConfigured) {
        clickInterceptorConfigured = true;
        registerClickInterceptor(store);
      }
      history.listen(() => {
        store.dispatch(complete(findSection(sections, {path: history.location.pathname + history.location.search})));
      });
      return next => async (action) => {
        sections = Object.keys(allSections).map((k : string) => allSections[k]);
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
            await invokeNavigationSectionLifecycleHandler(
              section,
              NavigationLifecycleStage.ACTION,
              store,
              {
                type: NAVIGATION_ACTION,
                navigationAction: navAction[1],
                section
              });
          }
        } else if (NAVIGATION_REQUESTED === action.type) {
          next(action);
          store.dispatch(phaseChanged(NavigationPhase.REQUESTED));
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
          await invokeNavigationSectionLifecycleHandler(
            section,
            NavigationLifecycleStage.BEFORE,
            store,
            {
              type: NAVIGATION_REQUESTED,
              section,
              sync: true,
              counter: ++navigationCounter
            });
        } else if (NAVIGATION_ALLOWED === action.type) {
          next(action);
          await invokeNavigationSectionLifecycleHandler(
            findSection(sections, action.section),
            NavigationLifecycleStage.BEFORE,
            store,
            {...action, type: NAVIGATION_PUSH_HISTORY});
        } else if (NAVIGATION_DENIED === action.type) {
          next(action);
          store.dispatch(phaseChanged(NavigationPhase.IDLE));
        } else if (NAVIGATION_PUSH_HISTORY === action.type) {
          next(action);
          let fullPath = action.section.fullPath || '';
          const hashInfo = /#.*$/.exec(fullPath);
          fullPath = fullPath.replace(/#.*$/, '');
          const doHistoryPush = () => {
            history.push(fullPath);
            if (hashInfo) {
              window.location.replace(hashInfo[0]);
            }
          };
          if (action.delay > 0) {
            setTimeout(() => {
              doHistoryPush();
            }, action.delay);
          } else {
            doHistoryPush();
          }
        } else if (NAVIGATION_COMPLETE === action.type) {
          next(action);
          store.dispatch(phaseChanged(NavigationPhase.IDLE));
          await invokeNavigationSectionLifecycleHandler(
            findSection(sections, action.section),
            NavigationLifecycleStage.AFTER,
            store);
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
      path: searchPath,
      icon: null,
      visibility: null
    };
  }
  found = JSON.parse(JSON.stringify(foundNavigationSection ? foundNavigationSection : found));
  found.queryParams = queryParams;
  found.queryString = queryString;
  found.pathParams = found.pathParams || pathParams;
  found.pathPattern = pathPattern || found.path;
  found.path = (overridePath || searchPath || found.path);
  found.fullPath = (overridePath || searchPath || found.path) + found.queryString;
  found.pathFound = !!foundNavigationSection;
  found.handler = foundNavigationSection ? foundNavigationSection.handler : undefined;
  return found;
};

const matchURL = (sections : Array<NavigationSection>, searchValue : string) : NavigationMatchResult => {
  const urlParts = searchValue.replace(/#.*$/, '').split(/\//);
  let capturedParams;
  let otherThanPathMatch = false;
  for (let i = 0; i < sections.length; i++) {
    capturedParams = {};
    let isMatch = false;
    const patternKey = sections[i].path;
    if (searchValue === patternKey.toLowerCase()) {
      isMatch = true;
    } else if (searchValue.toLowerCase() === ('/' + sections[i].title.toLowerCase())) {
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

const registerClickInterceptor = (store) => {
  if (typeof window !== 'undefined') {
    document.addEventListener('click', (event : MouseEvent) => {
      let candidate = event.target as Element;
      let depth = 0;
      if (candidate && candidate.tagName) {
        while (candidate && candidate.tagName && !/^a$/i.test(candidate.tagName) && depth < 3) {
          depth++;
          candidate = candidate.parentNode as Element;
        }
        let windowOrigin = window.location.origin;
        if (!windowOrigin) {
          windowOrigin = window.location.protocol + "//"
            + window.location.hostname
            + (window.location.port ? ':' + window.location.port : '');
        }
        if (candidate.hasAttribute && candidate.hasAttribute('href')) {
          const candidateAnchor : HTMLAnchorElement = candidate as HTMLAnchorElement;
          if (candidateAnchor.href
            && (candidateAnchor.href.indexOf(windowOrigin) > -1 || /^action::/.test(candidateAnchor.href))
            && !/^http:\/\//.test(candidateAnchor.getAttribute('href'))
            && candidateAnchor.getAttribute('href') !== '#'
            && candidateAnchor.getAttribute('role') !== 'external-link') {
            event.preventDefault();
            store.dispatch(navigate({path: candidateAnchor.getAttribute('href')}));
          }
        }
      }
    });
  }
};
