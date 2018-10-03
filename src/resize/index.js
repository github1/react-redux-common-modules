import { Module } from '@common/redux-modules';

const REGISTER_RESIZE_LISTENER = '@resize/register-resize-listener';
export const RESIZED = '@resize/resized';

export const registerResizeListener = () => ({type: REGISTER_RESIZE_LISTENER});

export const resized = (height, width) => {
    return {type: RESIZED, height, width};
};

let listenerRegistered = false;

export default (window) => Module.create({
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
        if (!listenerRegistered) {
            listenerRegistered = true;
            store.dispatch(registerResizeListener());
        }
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
    }
});