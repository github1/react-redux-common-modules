import { createModule, ReduxModuleStore } from '@github1/redux-modules';
import { AnyAction, Dispatch } from 'redux';

let navigationCounter: number = 0;

const allSections: { [k: string]: NavigationSectionInstance } = {};
const historyUnlisteners = [];

export enum NavigationSectionVisibility {
  VISIBLE = 'visible',
  HIDDEN = 'hidden',
}

export interface NavigationPath {
  path: string;
  queryString?: string;
}

export enum NavigationPhase {
  IDLE = 'idle',
  REQUESTED = 'navigation-requested',
  IN_PROGRESS = 'navigation-in-progress',
}

export enum NavigationLifecycleStage {
  ACTION = 'action',
  BEFORE = 'before',
  AFTER = 'after',
}

type AnyActions = AnyAction | AnyAction[];

type NavigationSectionLifecycleInterceptor = {
  interceptor: (actions: AnyAction[]) => AnyActions | Promise<AnyActions>;
};

type NavigationSectionLifecycleHandlerResult =
  | NavigationSectionLifecycleInterceptor
  | AnyActions
  | Promise<AnyActions | NavigationSectionLifecycleInterceptor>;

export interface NavigationSectionLifecycleHandler {
  (
    section?: NavigationSection,
    stage?: NavigationLifecycleStage,
    state?: any
  ): NavigationSectionLifecycleHandlerResult;
}

export const interceptNavigation = (
  interceptor: NavigationSectionLifecycleInterceptor['interceptor']
): NavigationSectionLifecycleInterceptor => {
  return {
    interceptor,
  };
};

export interface NavigationSection extends NavigationPath {
  index?: number;
  title: string;
  icon: string;
  visibility: NavigationSectionVisibility;
  handler?: NavigationSectionLifecycleHandler;
  handle?(handler: NavigationSectionLifecycleHandler): NavigationSection;
  active?: boolean;
  fullPath?: string;
  queryString?: string;
  queryParams?: { [key: string]: string };
  pathPattern?: string;
  pathParams?: { [key: string]: string };
  pathFound?: boolean;
  register?(): NavigationSection;
}

export interface NavigationQueryParams {
  [s: string]: any;
}

class NavigationSectionInstance implements NavigationSection {
  private _handler: NavigationSectionLifecycleHandler;

  constructor(
    public readonly title: string,
    public readonly icon: string,
    public readonly path: string,
    public readonly visibility: NavigationSectionVisibility
  ) {}

  public get handler(): NavigationSectionLifecycleHandler {
    return this._handler;
  }

  public register(): NavigationSectionInstance {
    allSections[this.path] = this;
    return this;
  }

  public handle(
    handler: NavigationSectionLifecycleHandler
  ): NavigationSectionInstance {
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
export const section = (
  title: string,
  icon: string,
  path: string,
  visibility: NavigationSectionVisibility = NavigationSectionVisibility.VISIBLE
): NavigationSection =>
  new NavigationSectionInstance(title, icon, path, visibility);

/**
 * Creates a hidden section.
 *
 * @param title
 * @param icon
 * @param path
 */
export const hiddenSection = (
  title: string,
  icon: string,
  path: string
): NavigationSection =>
  section(title, icon, path, NavigationSectionVisibility.HIDDEN);

/**
 * Set section index and filter for visibility.
 *
 * @param sections
 */
function prepareSections<TSection extends NavigationSection>(
  sections: TSection[]
): TSection[] {
  return sections
    .map((section, index) => {
      section.index = index;
      return section;
    })
    .map((section) => section.register() as TSection);
}

/**
 * Extract query params from a path.
 *
 * @param value
 */
export function extractQueryParams(value: string): NavigationQueryParams {
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
}

export interface NavigationPermission {
  allow(): void;

  deny(): void;
}

export interface OnBeforeNavigate {
  (section: NavigationSection, permission: NavigationPermission): void;
}

function isType<TType>(
  obj: any,
  checker: (obj: TType) => boolean
): obj is TType {
  return checker(obj);
}

function toNonSparseArray<TType>(obj: TType[] | TType): TType[] {
  return (Array.isArray(obj) ? obj : [obj]).filter((obj) => obj);
}

const invokeNavigationSectionLifecycleHandler = async (
  section: NavigationSection,
  stage: NavigationLifecycleStage,
  store: { getState: NavigationModuleStore['getState']; dispatch: Dispatch },
  ...defaultActions: typeof NavigationModule['_types']['_actionType'][]
) => {
  const handlerActions: typeof NavigationModule['_types']['_actionType'][] = [];
  const handlerResult: NavigationSectionLifecycleHandlerResult = section.handler
    ? section.handler(section, stage, store.getState())
    : null;
  if (handlerResult) {
    // Resolve top level promise to either interceptor or actions
    const handlerActionsOrInterceptor:
      | AnyActions
      | NavigationSectionLifecycleInterceptor = await (isType<
      Promise<NavigationSectionLifecycleInterceptor | AnyActions>
    >(handlerResult, (obj) => typeof obj.then !== 'undefined')
      ? handlerResult
      : Promise.resolve(handlerResult));
    if (
      isType<NavigationSectionLifecycleInterceptor>(
        handlerActionsOrInterceptor,
        (obj) => typeof obj.interceptor !== 'undefined'
      )
    ) {
      // Execute interceptor
      const interceptorResult =
        handlerActionsOrInterceptor.interceptor(defaultActions);
      if (
        isType<Promise<AnyActions>>(
          interceptorResult,
          (obj) => typeof obj.then !== 'undefined'
        )
      ) {
        // Handle interceptor returning promise of actions
        handlerActions.push(...toNonSparseArray(await interceptorResult));
      } else {
        // Handle interceptor returning actions
        handlerActions.push(...toNonSparseArray(interceptorResult));
      }
    } else {
      // Handler returned actions
      handlerActions.push(...toNonSparseArray(handlerActionsOrInterceptor));
      if (
        handlerActions.filter(
          (action) => action.type === '@NAVIGATION/PRE_REQUEST'
        ).length === 0
      ) {
        // If resulting action is not a 'navigation' event, add default actions
        handlerActions.unshift(...defaultActions);
      }
    }
  } else {
    // Otherwise dispatch default actions
    handlerActions.push(...defaultActions);
  }
  // Dispatch the actions
  handlerActions.forEach((action) => {
    store.dispatch(action);
  });
};

type NavigationModuleOptions = {
  history: any;
  sections: NavigationSection[];
  interceptClicks?: boolean;
  onBeforeNavigate?: OnBeforeNavigate;
};

export const clickInterceptorCallback = (store: NavigationModuleStore) => {
  if (
    typeof window !== 'undefined' &&
    !(window as any)._clickInterceptorCallback
  ) {
    (window as any)._clickInterceptorCallback = true;
    document.addEventListener('click', (event: MouseEvent) => {
      let candidate = event.target as Element;
      let depth = 0;
      if (candidate && candidate.tagName) {
        while (
          candidate &&
          candidate.tagName &&
          !/^a$/i.test(candidate.tagName) &&
          depth < 3
        ) {
          depth++;
          candidate = candidate.parentNode as Element;
        }
        let windowOrigin = window.location.origin;
        if (!windowOrigin) {
          windowOrigin =
            window.location.protocol +
            '//' +
            window.location.hostname +
            (window.location.port ? ':' + window.location.port : '');
        }
        if (candidate.hasAttribute && candidate.hasAttribute('href')) {
          const candidateAnchor: HTMLAnchorElement =
            candidate as HTMLAnchorElement;
          if (
            candidateAnchor.href &&
            (candidateAnchor.href.indexOf(windowOrigin) > -1 ||
              /^action::/.test(candidateAnchor.href)) &&
            !/^http:\/\//.test(candidateAnchor.getAttribute('href')) &&
            candidateAnchor.getAttribute('href') !== '#' &&
            candidateAnchor.getAttribute('role') !== 'external-link'
          ) {
            event.preventDefault();
            store.dispatch(
              store.actions.navigation.navigate({
                path: candidateAnchor.getAttribute('href'),
              })
            );
          }
        }
      }
    });
  }
};

type NavigationModuleState = {
  path: string;
  fullPath: string;
  pathPattern: string;
  pathFound: boolean;
  title: string;
  sections: NavigationSection[];
  phase: string;
  queryParams: any;
  pathParams: any;
};

const NavigationModule = createModule('navigation', {
  initializer(options: NavigationModuleOptions): NavigationModuleOptions {
    return {
      ...options,
      onBeforeNavigate:
        options.onBeforeNavigate || ((section, cb) => cb.allow()),
      sections: prepareSections(options.sections),
    };
  },
  actionCreators: {
    navigate(
      search,
      delay?: number
    ): { type: '@NAVIGATION/PRE_REQUEST'; search: string; delay: number } {
      return {
        type: '@NAVIGATION/PRE_REQUEST',
        search,
        delay,
      };
    },
    navigationRequest(
      section: NavigationSection,
      sync: boolean,
      delay?: number
    ): {
      type: '@NAVIGATION/REQUESTED';
      section: NavigationSection;
      sync: boolean;
      delay: number;
      counter: number;
    } {
      return {
        type: '@NAVIGATION/REQUESTED',
        section,
        sync,
        delay,
        counter: ++navigationCounter,
      };
    },
    syncNavigation(): { type: '@NAVIGATION/SYNC' } {
      return {
        type: '@NAVIGATION/SYNC',
      };
    },
    deny(section: NavigationSection): {
      type: '@NAVIGATION/DENIED';
      section: NavigationSection;
    } {
      return {
        type: '@NAVIGATION/DENIED',
        section,
      };
    },
    allow(
      section: NavigationSection,
      delay?: number
    ): {
      type: '@NAVIGATION/ALLOWED';
      section: NavigationSection;
      delay: number;
    } {
      return {
        type: '@NAVIGATION/ALLOWED',
        section,
        delay,
      };
    },
    pushHistory(
      section: NavigationSection,
      delay?: number
    ): {
      type: '@NAVIGATION/PUSH_HISTORY';
      section: NavigationSection;
      delay: number;
    } {
      return { type: '@NAVIGATION/PUSH_HISTORY', section, delay };
    },
    complete(section: NavigationSection): {
      type: '@NAVIGATION/COMPLETE';
      section: NavigationSection;
    } {
      return {
        type: '@NAVIGATION/COMPLETE',
        section,
      };
    },
    phaseChanged(phase: NavigationPhase): {
      type: '@NAVIGATION/PHASE_CHANGED';
      phase: NavigationPhase;
    } {
      return {
        type: '@NAVIGATION/PHASE_CHANGED',
        phase,
      };
    },
    navigationAction(
      section: NavigationSection,
      navigationAction: string
    ): {
      type: '@NAVIGATION/ACTION';
      section: NavigationSection;
      navigationAction: string;
    } {
      return {
        type: '@NAVIGATION/ACTION',
        section,
        navigationAction,
      };
    },
  },
})
  .reduce(
    (state: NavigationModuleState, action, props): NavigationModuleState => {
      if (!state.sections) {
        state = { ...state, sections: [...props.sections] };
      }
      switch (action.type) {
        case '@NAVIGATION/COMPLETE':
          return {
            ...state,
            path: action.section.path,
            fullPath: action.section.fullPath,
            pathPattern: action.section.pathPattern,
            title: action.section.title,
            queryParams: action.section.queryParams,
            pathParams: action.section.pathParams,
            pathFound: action.section.pathFound,
            sections: state.sections.map((section) => {
              return {
                ...section,
                active:
                  action.section.path
                    .toLowerCase()
                    .indexOf(section.path.toLowerCase()) === 0,
              };
            }),
          };
        case '@NAVIGATION/PHASE_CHANGED':
          return {
            ...state,
            phase: action.phase,
          };
      }
      return state;
    }
  )
  .preloadedState({
    path: '',
    fullPath: '',
    phase: NavigationPhase.IDLE,
    queryParams: {},
    pathParams: {},
  })
  .configure((store) => {
    const { interceptClicks, history } = store.props;
    if (interceptClicks) {
      clickInterceptorCallback(store);
    }
    // Remove any history listeners
    while (historyUnlisteners.length > 0) {
      historyUnlisteners.pop()();
    }
    historyUnlisteners.push(
      history.listen(() => {
        const sections = Object.keys(allSections).map(
          (k: string) => allSections[k]
        );
        store.dispatch(
          store.actions.navigation.complete(
            findSection(sections, {
              path: history.location.pathname + history.location.search,
            })
          )
        );
      })
    );
  })
  .on((store) => {
    const { history, onBeforeNavigate } = store.props;
    return (next) => async (action) => {
      const sections = Object.keys(allSections).map(
        (k: string) => allSections[k]
      );
      if ('@NAVIGATION/PRE_REQUEST' === action.type) {
        // Find the section from the given input
        const section = findSection(sections, action.search);
        // Check if an action is associated with the nav section
        const navAction = /action::(.*)/.exec(section.path);
        // Delay before navigation
        const delay = action.delay;
        if (navAction === null) {
          store.dispatch(
            store.actions.navigationRequest(section, false, delay)
          );
        } else {
          await invokeNavigationSectionLifecycleHandler(
            section,
            NavigationLifecycleStage.ACTION,
            store,
            store.actions.navigationAction(section, navAction[1])
          );
        }
      } else if ('@NAVIGATION/REQUESTED' === action.type) {
        next(action);
        store.dispatch(store.actions.phaseChanged(NavigationPhase.REQUESTED));
        if (action.counter === navigationCounter) {
          if (action.sync) {
            store.dispatch(store.actions.complete(action.section));
          } else {
            onBeforeNavigate(action.section, {
              allow: () =>
                store.dispatch(
                  store.actions.allow(action.section, action.delay)
                ),
              deny: () => store.dispatch(store.actions.deny(action.section)),
            });
          }
        }
      } else if ('@NAVIGATION/SYNC' === action.type) {
        const section = findSection(sections, {
          path: history.location.pathname + history.location.search,
        });
        await invokeNavigationSectionLifecycleHandler(
          section,
          NavigationLifecycleStage.BEFORE,
          store,
          store.actions.navigationRequest(section, true)
        );
      } else if ('@NAVIGATION/ALLOWED' === action.type) {
        next(action);
        await invokeNavigationSectionLifecycleHandler(
          findSection(sections, action.section),
          NavigationLifecycleStage.BEFORE,
          store,
          store.actions.pushHistory(action.section, action.delay)
        );
      } else if ('@NAVIGATION/DENIED' === action.type) {
        next(action);
        store.dispatch(store.actions.phaseChanged(NavigationPhase.IDLE));
      } else if ('@NAVIGATION/PUSH_HISTORY' === action.type) {
        next(action);
        const fullPath = action.section.fullPath || '';
        const hashInfo = /#.*$/.exec(fullPath);
        const pathname = action.section.path.replace(/#.*$/, '');
        const search = action.section.queryString;
        const doHistoryPush = () => {
          history.push({
            pathname,
            search,
          });
          if (hashInfo) {
            history.replace(hashInfo[0]);
          }
        };
        if (action.delay > 0) {
          setTimeout(() => {
            doHistoryPush();
          }, action.delay);
        } else {
          doHistoryPush();
        }
      } else if ('@NAVIGATION/COMPLETE' === action.type) {
        next(action);
        store.dispatch(store.actions.phaseChanged(NavigationPhase.IDLE));
        await invokeNavigationSectionLifecycleHandler(
          findSection(sections, action.section),
          NavigationLifecycleStage.AFTER,
          store
        );
      } else {
        next(action);
      }
    };
  });

export const navigation = NavigationModule;

type NavigationModuleStore = ReduxModuleStore<
  typeof NavigationModule['_types']
>;

export interface NavigationMatchResult {
  found: NavigationSection;
  capturedParams: any;
  pathPattern: string;
  otherThanPathMatch: boolean;
}

export const findSection = (
  sections: NavigationSection[],
  search: string | NavigationPath
): NavigationSection => {
  let found: NavigationSection;
  let queryParams = {};
  let queryString = '';
  let pathParams = {};
  let pathPattern: string;
  let overridePath: string;
  const originalSearch: string | NavigationPath = search;
  let searchPath: string =
    typeof originalSearch === 'string'
      ? originalSearch
      : originalSearch.path + (originalSearch.queryString || '');
  const indexOfQueryParams = searchPath.indexOf('?');
  if (indexOfQueryParams > -1) {
    queryParams = extractQueryParams(searchPath);
    queryString = searchPath.substring(indexOfQueryParams).trim();
    searchPath = searchPath.substring(0, indexOfQueryParams).trim();
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
  const urlMatched: NavigationMatchResult = matchURL(sections, searchPath);
  const foundNavigationSection: NavigationSection = urlMatched.found;
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
      visibility: null,
    };
  }
  found = JSON.parse(
    JSON.stringify(foundNavigationSection ? foundNavigationSection : found)
  );
  found.queryParams = queryParams;
  found.queryString = queryString;
  found.pathParams = found.pathParams || pathParams;
  found.pathPattern = pathPattern || found.path;
  found.path = overridePath || searchPath || found.path;
  found.fullPath =
    (overridePath || searchPath || found.path) + found.queryString;
  found.pathFound = !!foundNavigationSection;
  found.handler = foundNavigationSection
    ? foundNavigationSection.handler
    : undefined;
  return found;
};

const matchURL = (
  sections: NavigationSection[],
  searchValue: string
): NavigationMatchResult => {
  const urlParts = searchValue.replace(/#.*$/, '').split(/\//);
  let capturedParams: Record<string, string>;
  let otherThanPathMatch = false;
  for (let i = 0; i < sections.length; i++) {
    capturedParams = {};
    let isMatch = false;
    const patternKey = sections[i].path;
    if (searchValue === patternKey.toLowerCase()) {
      isMatch = true;
    } else if (
      searchValue.toLowerCase() ===
      '/' + sections[i].title.toLowerCase()
    ) {
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
        otherThanPathMatch,
      };
    }
  }
  return {
    found: null,
    capturedParams: null,
    pathPattern: null,
    otherThanPathMatch: null,
  };
};
