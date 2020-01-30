import nav, {
  extractQueryParams,
  findSection,
  hiddenSection,
  navigate,
  NAVIGATION_ACTION,
  NAVIGATION_REQUESTED,
  NAVIGATION_COMPLETE,
  NavigationPhase,
  NavigationLifecycleStage,
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
      hiddenSection('Login', '', '/'),
      section('Tasks', 'TaskIcon', '/tasks'),
      section('RFP Log', 'RFPLogIcon', '/rfp'),
      section('Proposals', 'ProposalIcon', '/proposals'),
      section('Projects', 'ProjectIcon', '/projects'),
      section('Project Details', 'ProjectIcon', '/projects/:id'),
      section('Purchase Orders', 'PurchaseOrderIcon', '/purchaseOrders'),
      section('Reports', 'ReportIcon', '/reports'),
      section('Print', 'PrintIcon', 'action::print'),
      section('Sign Out', 'SignOutIcon', 'action::signOut'),
      section('HasHandler', 'HandlerIcon', '/hasHandler')
        .handle((section, stage) => {
          return {type: 'HANDLER_ACTION', stage};
        }),
      section('HasHandlerRedirect', 'HandlerIcon', '/hasHandlerRedirect')
        .handle(() => navigate('/tasks'))
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
      expect(getNavSections().length).toBe(11);
    });
    it('has a tasks section', () => {
      expect(getNavSection(0).title).toBe('Tasks');
      expect(getNavSection(0).path).toBe('/tasks');
      expect(getNavSection(0).icon).toBe('TaskIcon');
    });
    it('has a rfp log section', () => {
      expect(getNavSection(1).title).toBe('RFP Log');
      expect(getNavSection(1).path).toBe('/rfp');
    });
    it('has a proposals section', () => {
      expect(getNavSection(2).title).toBe('Proposals');
      expect(getNavSection(2).path).toBe('/proposals');
    });
    it('has a projects section', () => {
      expect(getNavSection(3).title).toBe('Projects');
      expect(getNavSection(3).path).toBe('/projects');
    });
    it('has a project details section', () => {
      expect(getNavSection(4).title).toBe('Project Details');
      expect(getNavSection(4).path).toBe('/projects/:id');
    });
    it('has a purchase orders section', () => {
      expect(getNavSection(5).title).toBe('Purchase Orders');
      expect(getNavSection(5).path).toBe('/purchaseOrders');
    });
    it('has a reports section', () => {
      expect(getNavSection(6).title).toBe('Reports');
      expect(getNavSection(6).path).toBe('/reports');
    });
    it('has a print action', () => {
      expect(getNavSection(7).title).toBe('Print');
      expect(getNavSection(7).path).toBe('action::print');
    });
    it('has a sign out action', () => {
      expect(getNavSection(8).title).toBe('Sign Out');
      expect(getNavSection(8).path).toBe('action::signOut');
    });
  });
  describe('when a navigation request action is dispatched', () => {
    it('contains the section details', () => {
      store.dispatch(navigate('tasks'));
      expect(store.getState().recording.actions[1].type).toBe(NAVIGATION_REQUESTED);
      expect(store.getState().recording.actions[1].section.title).toBe('Tasks');
    });
    it('is able to locate a section with query string parameters', () => {
      store.dispatch(navigate('tasks?foo=bar'));
      expect(store.getState().recording.actions[1].type).toBe(NAVIGATION_REQUESTED);
      expect(store.getState().recording.actions[1].section.title).toBe('Tasks');
      expect(store.getState().recording.actions[1].section.queryParams.foo).toBe('bar');
    });
    it('sets the phase to navigation-requested', () => {
      store.dispatch(navigate('tasks'));
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
        store.dispatch(navigate('tasks'));
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
        store.dispatch(navigate('tasks'));
        expect(container.onBeforeNavigate).toHaveBeenCalled();
        expect(store.getState().recording.actions
          .filter(action => action.type === NAVIGATION_COMPLETE).length).toBe(1);
        expect(store.getState().navigation.phase).toBe(NavigationPhase.IDLE);
        expect(store.getState().navigation.path).toBe('/tasks');
      });
      it('sets the section to active', () => {
        store.dispatch(navigate('tasks'));
        expect(store.getState().navigation.sections[0].active).toBe(true);
      });
      describe('when the request contains queryParams', () => {
        it('invokes the history api with the params', async () => {
          store.dispatch(navigate('tasks?foo=bar'));
          expect(container.onBeforeNavigate).toHaveBeenCalled();
          const found = await store.getState().recording.waitForType(NAVIGATION_COMPLETE);
          expect(found.length).toBe(1);
          expect(store.getState().navigation.phase).toBe(NavigationPhase.IDLE);
          expect(store.getState().navigation.path).toBe('/tasks');
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
          expect(found[0].section.path).toBe('/tasks');
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
      expect(store.getState().recording.actions[2].sync).toBeTruthy();
      expect(store.getState().recording.actions[2].type).toBe(NAVIGATION_REQUESTED);
      expect(store.getState().recording.actions[2].section.path).toBe('/foo');
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
        expect(findSection(container.sections, {path: '/projects'}).title).toBe('Projects');
      });
      it('finds by path with extra slashes', () => {
        expect(findSection(container.sections, {path: '/projects/'}).title).toBe('Projects');
      });
      it('can match on the title', () => {
        expect(findSection(container.sections, {path: 'login'}).path).toBe('/');
      });
      it('finds actions', () => {
        expect(findSection(container.sections, {path: 'action::PRINT'}).path).toBe('action::print');
      });
      it('parses query strings', () => {
        expect(findSection(container.sections, 'projects?foo=bar').path).toBe('/projects');
        expect(findSection(container.sections, 'projects?foo=bar').fullPath).toBe('/projects?foo=bar');
        expect(findSection(container.sections, 'projects?foo=bar').queryParams.foo).toBe('bar');
      });
      it('parses query strings from section path', () => {
        expect(findSection(container.sections, {path: '/projects?foo=bar'}).path).toBe('/projects');
        expect(findSection(container.sections, {path: '/projects?foo=bar'}).fullPath).toBe('/projects?foo=bar');
        expect(findSection(container.sections, {path: '/projects?foo=bar'}).queryParams.foo).toBe('bar');
      });
      it('parses path parameters', () => {
        const foundSection = findSection(container.sections, {path: '/projects/123'});
        expect(foundSection.path).toBe('/projects/123');
        expect(foundSection.pathPattern).toBe('/projects/:id');
        expect(foundSection.fullPath).toBe('/projects/123');
        expect(foundSection.pathParams.id).toBe('123');
      });
    });
  });
});
