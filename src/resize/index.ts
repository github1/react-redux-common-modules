import { Module } from '@github1/redux-modules';

const REGISTER_RESIZE_LISTENER = '@resize/register-resize-listener';
export const RESIZED = '@resize/resized';

const registerResizeListener = () => ({type: REGISTER_RESIZE_LISTENER});

export const resized = (height, width) => {
    return {type: RESIZED, height, width};
};

export default (window? : Window) => Module.create({
    name: 'resize',
    reducer: (state = {}, action) => {
        if (action.type === RESIZED) {
            return {
                ...state,
                height: action.height,
                width: action.width
            }
        }
        return state;
    },
    middleware: store => next => action => {
        if (action.type === REGISTER_RESIZE_LISTENER) {
            if (typeof window === 'undefined') {
                store.dispatch(resized(0, 0));
            } else {
                const onResize = () => next(resized(window.innerHeight, window.innerWidth));
                onResize();
                window.addEventListener('resize', onResize);
            }
        }
        next(action);
    },
    postConfigure: store => {
      store.dispatch(registerResizeListener());
    }
});
