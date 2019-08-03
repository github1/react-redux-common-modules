import { Module } from '@github1/redux-modules';

export const NAVIGATION_PRE_REQUEST = '@NAVIGATION/PRE_REQUEST';
export const NAVIGATION_REQUESTED = '@NAVIGATION/REQUESTED';
export const NAVIGATION_DENIED = '@NAVIGATION/DENIED';
export const NAVIGATION_ALLOWED = '@NAVIGATION/ALLOWED';
export const NAVIGATION_PUSH_HISTORY = '@NAVIGATION/PUSH_HISTORY';
export const NAVIGATION_COMPLETE = '@NAVIGATION/COMPLETE';
export const NAVIGATION_ACTION = '@NAVIGATION/ACTION';
export const NAVIGATION_SYNC = '@NAVIGATION/SYNC';

const VISIBLE = 'visible';
const HIDDEN = 'hidden';

let navigationCounter = 0;

export const hiddenSection = (title, icon, path) => section(title, icon, path, HIDDEN);

export const section = (title, icon, path, visibility = VISIBLE) => ({
    title,
    icon,
    path,
    visibility
});

const createInitialState = sections => ({
    phase: 'idle',
    pathParams: {},
    sections: sections
        .map((section, index) => {
            section.index = index;
            return section;
        }).filter(section => section.visibility === VISIBLE)
});

export const extractQueryParams = value => {
    const queryParams = /\?(.*)$/.exec(value);
    if (queryParams === null) {
        return {};
    }
    return queryParams[1].split(/&/).reduce((res, cur) => {
        const parts = cur.split(/=/);
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

export const navigate = (search, delay) => {
    return {
        type: NAVIGATION_PRE_REQUEST,
        search,
        delay
    };
};

export const syncNavigation = () => {
    return {
        type: NAVIGATION_SYNC
    }
};

const deny = section => {
    return {
        type: NAVIGATION_DENIED,
        section
    };
};

const allow = (section, delay) => {
    return {
        type: NAVIGATION_ALLOWED,
        section,
        delay
    };
};

const complete = section => {
    return {
        type: NAVIGATION_COMPLETE,
        section
    };
};

export default ({history, onBeforeNavigate, pathState = {}, sections}) => {
    onBeforeNavigate = onBeforeNavigate || ((section, cb) => cb.allow());
    return Module.create({
        name: 'navigation',
        reducer: (state = {...createInitialState(sections), ...pathState}, action) => {
            switch (action.type) {
                case NAVIGATION_REQUESTED:
                    return {
                        ...state,
                        phase: 'navigation-requested'
                    };
                case NAVIGATION_COMPLETE:
                    const newState = {
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
                    return newState;
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
            return next => action => {
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
                    //store.dispatch(complete(section));
                    store.dispatch({
                        type: NAVIGATION_REQUESTED,
                        section,
                        sync: true,
                        counter: ++navigationCounter
                    });
                } else if (NAVIGATION_ALLOWED === action.type) {
                    next(action);
                    store.dispatch({...action, type: NAVIGATION_PUSH_HISTORY});
                } else if (NAVIGATION_PUSH_HISTORY === action.type) {
                    next(action);
                    if (action.delay > 0) {
                        setTimeout(() => {
                            history.push(action.section.fullPath);
                        }, action.delay);
                    } else {
                        history.push(action.section.fullPath);
                    }
                } else {
                    next(action);
                }
            }
        }
    });
};

export const findSection = (sections, search) => {
    let found;
    let queryParams = {};
    let queryString = '';
    let pathParams = {};
    let pathPattern;
    let overridePath;
    const originalSearch = search;
    search = typeof originalSearch === 'string' ? originalSearch : search.path;
    const indexOfQueryParams = search.indexOf('?');
    if (typeof search === 'string' && indexOfQueryParams > -1) {
        queryParams = extractQueryParams(search);
        queryString = search.substring(indexOfQueryParams).trim();
        search = search.substring(0, indexOfQueryParams).trim()
    }
    const isAction = /::/.test(search);
    if (!/^\//.test(search) && !isAction) {
        search = `/${search}`;
    }
    if (search !== '/') {
        search = search.replace(/[\/]+$/, '');
    }
    if (isAction) {
        search = search.toLowerCase();
    }
    const urlMatched = matchURL(sections, search);
    found = urlMatched.found;
    if (found) {
        pathParams = urlMatched.capturedParams;
        pathPattern = urlMatched.pathPattern;
        if (urlMatched.otherThanPathMatch) {
            overridePath = pathPattern;
        }
    } else {
        found = {path: search};
    }
    if (found) {
        found = JSON.parse(JSON.stringify(found));
        found.queryParams = queryParams;
        found.queryString = queryString;
        found.pathParams = found.pathParams || pathParams;
        found.pathPattern = pathPattern || found.path;
        found.path = (overridePath || search || found.path);
        found.fullPath = (overridePath || search || found.path) + found.queryString;
    }
    return found;
};

const matchURL = (sections, searchValue) => {
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
    return {};
};
