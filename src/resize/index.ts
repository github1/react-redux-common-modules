import { createModule } from '@github1/redux-modules';

function isWindow(w: any): w is Window {
  return typeof w !== 'undefined' && w.location;
}

export const resize = createModule('resize', {
  initializer(props: { window: Window | 'none' }): { window: Window | 'none' } {
    return {
      window:
        props.window === 'none'
          ? undefined
          : props.window ||
            (typeof window === 'undefined' ? undefined : window),
    };
  },
  actionCreators: {
    registerResizeListener(): { type: '@resize/register-resize-listener' } {
      return {
        type: '@resize/register-resize-listener',
      };
    },
    resized(
      height: number,
      width: number
    ): { type: '@resize/resized'; height: number; width: number } {
      return { type: '@resize/resized', height, width };
    },
  },
})
  .reduce(
    (
      state: { height: number; width: number } = {
        height: 0,
        width: 0,
      },
      action
    ) => {
      if (action.type === '@resize/resized') {
        return {
          ...state,
          height: action.height,
          width: action.width,
        };
      }
      return state;
    }
  )
  .on((store) => (next) => (action) => {
    if (action.type === '@resize/register-resize-listener') {
      const { window } = store.props;
      if (isWindow(window)) {
        const onResize = () =>
          next(store.actions.resized(window.innerHeight, window.innerWidth));
        onResize();
        window.addEventListener('resize', onResize);
      } else {
        store.dispatch(store.actions.resized(0, 0));
      }
    }
    next(action);
  })
  .configure((store) => {
    store.dispatch(store.actions.resize.registerResizeListener());
  });
