import nav, {
  extractQueryParams,
  findSection,
  hiddenSection,
  interceptNavigation,
  navigate,
  NAVIGATION_ACTION,
  NAVIGATION_COMPLETE,
  NAVIGATION_REQUESTED,
  NavigationLifecycleStage,
  NavigationPhase,
  OnBeforeNavigate,
  section,
  syncNavigation
} from './index';
import {createMemoryHistory} from 'history';

describe('navigation', () => {
  let store : { getState : () => { navigation : any, [s : string] : any }, [s : string] : any };
  let history = createMemoryHistory();
  let onBeforeNavigate : OnBeforeNavigate = () => {
  };
  const getNavSections = () => store.getState().navigation.sections;
  const getNavSection = index => getNavSections()[index];
  const container = {
    history,
    onBeforeNavigate: jest.fn(function () {
      return onBeforeNavigate.apply(null, Array.prototype.slice.call(arguments));
    }),
    sections: [
      section('VisibleSection', 'VisibleIcon', '/visible'),
      hiddenSection('HiddenSection', 'HiddenIcon', '/hidden'),
      hiddenSection('ActionSection', 'ActionIcon', 'action::some_action'),
      section('HasPathParams', 'VisibleIcon', '/visible/:id'),
      section('HasHandler', 'HandlerIcon', '/hasHandler')
        .handle((section, stage) => {
          return {type: 'HANDLER_ACTION', stage};
        }),
      section('HasHandlerRedirect', 'HandlerIcon', '/hasHandlerRedirect')
        .handle(() => navigate('/visible')),
      section('HasHandlerInterceptor', 'HandlerIcon', '/hasHandlerInterceptor')
        .handle((section, stage) => interceptNavigation((actions) => {
          return [...actions, {type: `ADDED_BY_INTERCEPTOR_${stage}`}];
        }))
    ]
  };
  beforeEach(() => {
    store = nav(container).enforceImmutableState().inRecordedStore();
  });
  describe('when the navigation module is initialized', () => {
    it('is in idle phase', () => {
      expect(store.getState().navigation.phase).toBe(NavigationPhase.IDLE);
    });
    it('has navigation entries', () => {
      expect(store.getState().navigation).toBeDefined();
      expect(getNavSections().length).toBe(5);
    });
    it('has a tasks section', () => {
      expect(getNavSection(0).title).toBe('VisibleSection');
      expect(getNavSection(0).path).toBe('/visible');
      expect(getNavSection(0).icon).toBe('VisibleIcon');
    });
  });
  describe('when a navigation request action is dispatched', () => {
    it('contains the section details', () => {
      store.dispatch(navigate('visible'));
      expect(store.getState().recording.actions[1].type).toBe(NAVIGATION_REQUESTED);
      expect(store.getState().recording.actions[1].section.title).toBe('VisibleSection');
    });
    it('is able to locate a section with query string parameters', () => {
      store.dispatch(navigate('visible?foo=bar'));
      expect(store.getState().recording.actions[1].type).toBe(NAVIGATION_REQUESTED);
      expect(store.getState().recording.actions[1].section.title).toBe('VisibleSection');
      expect(store.getState().recording.actions[1].section.queryParams.foo).toBe('bar');
    });
    it('sets the phase to navigation-requested', () => {
      store.dispatch(navigate('visible'));
      expect(container.onBeforeNavigate).toHaveBeenCalled();
      expect(store.getState().navigation.phase).toBe(NavigationPhase.REQUESTED)
    });
    describe('when the navigation request is denied', () => {
      beforeEach(() => {
        onBeforeNavigate = (section, cb) : void => {
          cb.deny();
        };
      });
      it('returns the phase to idle', () => {
        store.dispatch(navigate('visible'));
        expect(container.onBeforeNavigate).toHaveBeenCalled();
        expect(store.getState().navigation.phase).toBe(NavigationPhase.IDLE);
      });
      it('can navigate with the section object', () => {
        store.dispatch(navigate({path: '/foo'}));
        expect(container.onBeforeNavigate).toHaveBeenCalled();
        expect(store.getState().navigation.phase).toBe(NavigationPhase.IDLE);
      });
    });
    describe('when the navigation request is allowed', () => {
      beforeEach(() => {
        onBeforeNavigate = (section, cb) => {
          cb.allow();
        };
      });
      it('invokes the history api', () => {
        store.dispatch(navigate('visible'));
        expect(container.onBeforeNavigate).toHaveBeenCalled();
        expect(store.getState().recording.actions
          .filter(action => action.type === NAVIGATION_COMPLETE).length).toBe(1);
        expect(store.getState().navigation.phase).toBe(NavigationPhase.IDLE);
        expect(store.getState().navigation.path).toBe('/visible');
      });
      it('sets the section to active', () => {
        store.dispatch(navigate('visible'));
        expect(store.getState().navigation.sections[0].active).toBe(true);
      });
      describe('when the request contains queryParams', () => {
        it('invokes the history api with the params', async () => {
          store.dispatch(navigate('visible?foo=bar'));
          expect(container.onBeforeNavigate).toHaveBeenCalled();
          const found = await store.getState().recording.waitForType(NAVIGATION_COMPLETE);
          expect(found.length).toBe(1);
          expect(store.getState().navigation.phase).toBe(NavigationPhase.IDLE);
          expect(store.getState().navigation.path).toBe('/visible');
          expect(store.getState().navigation.queryParams.foo).toBe('bar');
        });
      });
      describe('when the navigation request is delayed', () => {
        it('executes after the delay', () => {
          jest.useFakeTimers();
          store.dispatch(navigate('tasks', 100));
          jest.runAllTimers();
          expect(container.onBeforeNavigate).toHaveBeenCalled();
        });
      });
      describe('when the navigation section has a NavigationSectionLifecycleHandler', () => {
        it('executes the handler on each phase', async () => {
          store.dispatch(navigate('hasHandler'));
          const found = await store.getState().recording.waitForType('HANDLER_ACTION');
          expect(found.length).toBe(2);
          expect(found[0].stage).toBe(NavigationLifecycleStage.BEFORE);
          expect(found[1].stage).toBe(NavigationLifecycleStage.AFTER);
        });
        it('aborts the navigation if a redirect happens in the handler', async () => {
          store.dispatch(navigate('hasHandlerRedirect'));
          const found = await store.getState().recording.waitForType(NAVIGATION_COMPLETE);
          expect(found.length).toBe(1);
          expect(found[0].section.path).toBe('/visible');
        });
        it('can intercept the default navigation actions', async () => {
          store.dispatch(navigate('HasHandlerInterceptor'));
          // await store.getState().recording.waitForType(NAVIGATION_REQUESTED);
          // expect(store.getState().navigation.phase).toBe(NavigationPhase.IN_PROGRESS);
          let found = await store.getState().recording.waitForType(NAVIGATION_COMPLETE);
          expect(found.length).toBe(1);
          found = await store.getState().recording.waitForType('ADDED_BY_INTERCEPTOR_before');
          expect(found.length).toBe(1);
          found = await store.getState().recording.waitForType('ADDED_BY_INTERCEPTOR_after');
          expect(found.length).toBe(1);
        });
      });
    });
  });
  describe('when a navigation with an action:: is dispatched', () => {
    it('dispatches the action parsed from the path', () => {
      store.dispatch(navigate({path: 'action::PRINT'}));
      expect(store.getState().recording.actions[1].type).toBe(NAVIGATION_ACTION);
      expect(store.getState().recording.actions[1].navigationAction).toBe('print');
    });
  });
  describe('when syncNavigation is called', () => {
    it('dispatches a navigation complete action for the initial path', () => {
      history.push('/foo');
      store.dispatch(syncNavigation());
      expect(store.getState().recording.actions[1].type).toBe(NAVIGATION_COMPLETE);
      expect(store.getState().recording.actions[1].section.path).toBe('/foo');
      expect(store.getState().recording.actions[3].sync).toBeTruthy();
      expect(store.getState().recording.actions[3].type).toBe(NAVIGATION_REQUESTED);
      expect(store.getState().recording.actions[3].section.path).toBe('/foo');
    });
  });
  describe('extractQueryParams', () => {
    it('returns an empty map when the value has no params', () => {
      const params = extractQueryParams('blah');
      expect(Object.keys(params).length).toBe(0);
    });
    it('extracts query params as a map', () => {
      const params = extractQueryParams('blah?foo=bar&baz=bux&qaz');
      expect(params.foo).toBe('bar');
      expect(params.baz).toBe('bux');
      expect(params.qaz).toBe(true);
    });
    it('extracts multi-value query params as a map with 2 values', () => {
      const params = extractQueryParams('blah?foo=bar&foo=baz');
      expect(params.foo[0]).toBe('bar');
      expect(params.foo[1]).toBe('baz');
    });
    it('extracts multi-value query params as a map with more than 2 values', () => {
      const params = extractQueryParams('blah?foo=bar&foo=baz&foo=bip');
      expect(params.foo[0]).toBe('bar');
      expect(params.foo[1]).toBe('baz');
      expect(params.foo[2]).toBe('bip');
    });
  });
  describe('findSection', () => {
    describe('finding by path', () => {
      it('find by path', () => {
        expect(findSection(container.sections, {path: '/visible'}).title).toBe('VisibleSection');
      });
      it('finds by path with extra slashes', () => {
        expect(findSection(container.sections, {path: '/visible/'}).title).toBe('VisibleSection');
      });
      it('can match on the title', () => {
        expect(findSection(container.sections, 'VisibleSection').path).toBe('/visible');
      });
      it('finds actions', () => {
        expect(findSection(container.sections, {path: 'action::SOME_ACTION'}).path).toBe('action::some_action');
      });
      it('parses query strings', () => {
        expect(findSection(container.sections, 'visible?foo=bar').path).toBe('/visible');
        expect(findSection(container.sections, 'visible?foo=bar').fullPath).toBe('/visible?foo=bar');
        expect(findSection(container.sections, 'visible?foo=bar').queryParams.foo).toBe('bar');
      });
      it('parses query strings from section path', () => {
        expect(findSection(container.sections, {path: '/visible?foo=bar'}).path).toBe('/visible');
        expect(findSection(container.sections, {path: '/visible?foo=bar'}).fullPath).toBe('/visible?foo=bar');
        expect(findSection(container.sections, {path: '/visible?foo=bar'}).queryParams.foo).toBe('bar');
      });
      it('parses path parameters', () => {
        const foundSection = findSection(container.sections, {path: '/visible/123'});
        expect(foundSection.path).toBe('/visible/123');
        expect(foundSection.pathPattern).toBe('/visible/:id');
        expect(foundSection.fullPath).toBe('/visible/123');
        expect(foundSection.pathParams.id).toBe('123');
      });
    });
  });
});
