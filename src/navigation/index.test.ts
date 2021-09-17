import {
  navigation,
  extractQueryParams,
  findSection,
  hiddenSection,
  interceptNavigation,
  NavigationLifecycleStage,
  NavigationPhase,
  OnBeforeNavigate,
  section,
  clickInterceptorCallback,
} from './index';
import { createMemoryHistory } from 'history';
const { navigate, syncNavigation } = navigation.actions;

describe('navigation', () => {
  let onBeforeNavigate: OnBeforeNavigate = () => {};
  const container = () => ({
    history: createMemoryHistory(),
    onBeforeNavigate: jest.fn(function () {
      return onBeforeNavigate.apply(
        null,
        Array.prototype.slice.call(arguments)
      );
    }),
    sections: [
      section('VisibleSection', 'VisibleIcon', '/visible'),
      hiddenSection('HiddenSection', 'HiddenIcon', '/hidden'),
      hiddenSection('ActionSection', 'ActionIcon', 'action::some_action'),
      section('HasPathParams', 'VisibleIcon', '/visible/:id'),
      section('HasHandler', 'HandlerIcon', '/hasHandler').handle(
        (section, stage) => {
          return { type: 'HANDLER_ACTION', stage, id: Math.random() };
        }
      ),
      section(
        'HasHandlerRedirect',
        'HandlerIcon',
        '/hasHandlerRedirect'
      ).handle(() => navigate('/visible')),
      section(
        'HasHandlerInterceptor',
        'HandlerIcon',
        '/hasHandlerInterceptor'
      ).handle((section, stage) =>
        interceptNavigation((actions) => {
          return [...actions, { type: `ADDED_BY_INTERCEPTOR_${stage}` }];
        })
      ),
    ],
  });
  const store = navigation.initialize(container).asStore({
    deferred: true,
    record: true,
    enforceImmutableState: true,
  });
  const getNavSections = () => store.getState().navigation.sections;
  const getNavSection = (index: number) => getNavSections()[index];
  beforeEach(() => {
    store.reload();
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
      expect(
        store.getState().recording.find('@NAVIGATION/REQUESTED')[0].section
          .title
      ).toBe('VisibleSection');
    });
    it('is able to locate a section with query string parameters', () => {
      store.dispatch(navigate('visible?foo=bar'));
      const navRequestedAction = store
        .getState()
        .recording.find('@NAVIGATION/REQUESTED')[0];
      expect(navRequestedAction.section.title).toBe('VisibleSection');
      expect(navRequestedAction.section.queryParams.foo).toBe('bar');
    });
    it('sets the phase to navigation-requested', () => {
      store.dispatch(navigate('visible'));
      expect(store.props.onBeforeNavigate).toHaveBeenCalled();
      expect(store.getState().navigation.phase).toBe(NavigationPhase.REQUESTED);
    });
    describe('when the navigation request is denied', () => {
      beforeEach(() => {
        onBeforeNavigate = (section, cb): void => {
          cb.deny();
        };
      });
      it('returns the phase to idle', () => {
        store.dispatch(navigate('visible'));
        expect(store.props.onBeforeNavigate).toHaveBeenCalled();
        expect(store.getState().navigation.phase).toBe(NavigationPhase.IDLE);
      });
      it('can navigate with the section object', () => {
        store.dispatch(navigate({ path: '/foo' }));
        expect(store.props.onBeforeNavigate).toHaveBeenCalled();
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
        store.dispatch(navigate('/visible'));
        expect(store.props.onBeforeNavigate).toHaveBeenCalled();
        expect(
          store
            .getState()
            .recording.actions.filter(
              (action) => action.type === '@NAVIGATION/COMPLETE'
            ).length
        ).toBe(1);
        expect(store.getState().navigation.phase).toBe(NavigationPhase.IDLE);
        expect(store.getState().navigation.path).toBe('/visible');
      });
      it('can navigate with a hash', () => {
        store.dispatch(navigate('visible#123'));
        expect(store.props.onBeforeNavigate).toHaveBeenCalled();
        expect(store.props.history.location.hash).toBe('#123');
      });
      it('sets the section to active', () => {
        store.dispatch(navigate('visible'));
        expect(store.getState().navigation.sections[0].active).toBe(true);
      });
      describe('when no section is found', () => {
        it('navigates to a pseudo default section', () => {
          store.dispatch(navigate({ path: '/does_not_exist' }));
          expect(store.getState().navigation.path).toBe('/does_not_exist');
          expect(store.getState().navigation.queryParams).toEqual({});
        });
      });
      describe('when the request contains queryParams', () => {
        it('invokes the history api with the params', async () => {
          store.dispatch(navigate('visible?foo=bar'));
          expect(store.props.onBeforeNavigate).toHaveBeenCalled();
          const found = await store
            .getState()
            .recording.waitFor('@NAVIGATION/COMPLETE');
          expect(found.length).toBe(1);
          expect(store.getState().navigation.phase).toBe(NavigationPhase.IDLE);
          expect(store.getState().navigation.path).toBe('/visible');
          expect(store.getState().navigation.queryParams.foo).toBe('bar');
        });
        it('drops the query params when navigating to a new url without query params after syncing', async () => {
          store.dispatch(navigate({ path: '/visible?foo=bar' }));
          let navigationCompleteAction = await store
            .getState()
            .recording.waitFor('@NAVIGATION/COMPLETE');
          expect(store.getState().navigation.path).toBe('/visible');
          expect(store.getState().navigation.fullPath).toBe('/visible?foo=bar');
          expect(store.getState().navigation.queryParams.foo).toBe('bar');
          expect(navigationCompleteAction[0].section.fullPath).toBe(
            '/visible?foo=bar'
          );
          store.dispatch(navigate({ path: '/visible' }));
          navigationCompleteAction = await store
            .getState()
            .recording.waitFor('@NAVIGATION/COMPLETE');
          expect(navigationCompleteAction[1].section.fullPath).toBe('/visible');
          expect(store.getState().navigation.path).toBe('/visible');
          expect(store.getState().navigation.fullPath).toBe('/visible');
          expect(store.getState().navigation.queryParams.foo).toBeUndefined();
        });
      });
      describe('when the navigation request is delayed', () => {
        it('executes after the delay', async () => {
          store.dispatch(navigate('tasks', 100));
          expect(store.props.onBeforeNavigate).toHaveBeenCalled();
          const found = await store
            .getState()
            .recording.waitFor('@NAVIGATION/COMPLETE');
          expect(found).toHaveLength(1);
          expect(found[0].section.path).toBe('/tasks');
        });
      });
      describe('when the navigation section has a NavigationSectionLifecycleHandler', () => {
        it('executes the handler on each phase', async () => {
          store.dispatch(navigate('hasHandler?abc=123'));
          const found = (await store
            .getState()
            .recording.waitFor('HANDLER_ACTION' as any)) as any;
          expect(found.length).toBe(2);
          expect(found[0].stage).toBe(NavigationLifecycleStage.BEFORE);
          expect(found[1].stage).toBe(NavigationLifecycleStage.AFTER);
        }, 10000);
        it('aborts the navigation if a redirect happens in the handler', async () => {
          store.dispatch(navigate('hasHandlerRedirect'));
          const found = await store
            .getState()
            .recording.waitFor('@NAVIGATION/COMPLETE');
          expect(found.length).toBe(1);
          expect(found[0].section.path).toBe('/visible');
        });
        it('can intercept the default navigation actions', async () => {
          store.dispatch(navigate('HasHandlerInterceptor'));
          let found = await store
            .getState()
            .recording.waitFor('@NAVIGATION/COMPLETE');
          expect(found.length).toBe(1);
          found = await store
            .getState()
            .recording.waitFor('ADDED_BY_INTERCEPTOR_before' as any);
          expect(found.length).toBe(1);
          found = await store
            .getState()
            .recording.waitFor('ADDED_BY_INTERCEPTOR_after' as any);
          expect(found.length).toBe(1);
        });
        it('can handle sections created outside of the module initialization', async () => {
          const newSection = section(
            'NewSection',
            'NewIcon',
            '/newPath'
          ).register();
          store.dispatch(navigate('NewSection'));
          const found = await store
            .getState()
            .recording.waitFor('@NAVIGATION/COMPLETE');
          expect(found.length).toBe(1);
          expect(found[0].section.title).toBe(newSection.title);
        }, 1000);
      });
    });
  });
  describe('when a navigation with an action:: is dispatched', () => {
    it('dispatches the action parsed from the path', () => {
      store.dispatch(navigate({ path: 'action::PRINT' }));
      expect(
        store.getState().recording.find('@NAVIGATION/ACTION')[0]
          .navigationAction
      ).toBe('print');
    });
  });
  describe('when syncNavigation is called', () => {
    it('dispatches a navigation complete action for the initial path', () => {
      store.props.history.push('/foo');
      store.dispatch(syncNavigation());
      expect(
        store.getState().recording.find('@NAVIGATION/COMPLETE')[0]
      ).toEqual(
        expect.objectContaining({
          section: expect.objectContaining({
            path: '/foo',
          }),
        })
      );
      expect(
        store.getState().recording.find('@NAVIGATION/REQUESTED')[0]
      ).toEqual(
        expect.objectContaining({
          section: expect.objectContaining({
            path: '/foo',
            queryParams: {},
          }),
          sync: true,
        })
      );
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
        const foundSection = findSection(store.props.sections, {
          path: '/visible',
        });
        expect(foundSection.pathFound).toBe(true);
        expect(foundSection.title).toBe('VisibleSection');
      });
      it('finds by path with extra slashes', () => {
        expect(
          findSection(store.props.sections, { path: '/visible/' }).title
        ).toBe('VisibleSection');
      });
      it('can match on the title', () => {
        expect(findSection(store.props.sections, 'VisibleSection').path).toBe(
          '/visible'
        );
      });
      it('finds actions', () => {
        expect(
          findSection(store.props.sections, { path: 'action::SOME_ACTION' })
            .path
        ).toBe('action::some_action');
      });
      it('parses query strings', () => {
        expect(findSection(store.props.sections, 'visible?foo=bar').path).toBe(
          '/visible'
        );
        expect(
          findSection(store.props.sections, 'visible?foo=bar').fullPath
        ).toBe('/visible?foo=bar');
        expect(
          findSection(store.props.sections, 'visible?foo=bar').queryParams.foo
        ).toBe('bar');
      });
      it('parses query strings from section path', () => {
        expect(
          findSection(store.props.sections, { path: '/visible?foo=bar' }).path
        ).toBe('/visible');
        expect(
          findSection(store.props.sections, { path: '/visible?foo=bar' })
            .fullPath
        ).toBe('/visible?foo=bar');
        expect(
          findSection(store.props.sections, { path: '/visible?foo=bar' })
            .queryParams.foo
        ).toBe('bar');
      });
      it('parses path parameters', () => {
        let foundSection = findSection(store.props.sections, {
          path: '/visible/123',
        });
        expect(foundSection.path).toBe('/visible/123');
        expect(foundSection.pathPattern).toBe('/visible/:id');
        expect(foundSection.fullPath).toBe('/visible/123');
        expect(foundSection.pathParams.id).toBe('123');
        foundSection = findSection(store.props.sections, {
          path: '/visible/123#somehash',
        });
        expect(foundSection.pathParams.id).toBe('123');
      });
      it('returns valid data for unmatched search', () => {
        let foundSection = findSection(store.props.sections, {
          path: '/does_not_exist',
        });
        expect(foundSection.path).toBe('/does_not_exist');
        expect(foundSection.pathPattern).toBe('/does_not_exist');
        expect(foundSection.fullPath).toBe('/does_not_exist');
        expect(foundSection.pathFound).toBe(false);
      });
    });
  });
  describe('clickInterceptor', () => {
    it('dispatches a navigation action on click', async () => {
      onBeforeNavigate = (section, cb) => {
        cb.allow();
      };
      store.dispatch(navigate('visible'));
      let found = await store
        .getState()
        .recording.waitFor('@NAVIGATION/COMPLETE');
      expect(found.length).toBe(1);
      const a = document.createElement('a');
      a.setAttribute('href', '/visible/123');
      document.body.appendChild(a);
      clickInterceptorCallback(store);
      const evt = document.createEvent('MouseEvents');
      evt.initEvent('click', true, true);
      a.dispatchEvent(evt);
      found = await store.getState().recording.waitFor('@NAVIGATION/COMPLETE');
      expect(found.length).toBe(2);
      expect(found[1].section.path).toBe('/visible/123');
    });
  });
});
