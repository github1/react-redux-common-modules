import resize, {resized} from './index';

describe('resize', () => {
  let store;
  describe('when window is defined', () => {
    beforeEach(() => {
      store = resize(window).enforceImmutableState().inRecordedStore();
    });
    it('updates the dimensions state when resized', () => {
      store.dispatch(resized(1, 2));
      expect(store.getState().resize.height).toBe(1);
      expect(store.getState().resize.width).toBe(2);
    });
  });
  describe('when window is undefined', () => {
    beforeEach(() => {
      store = resize().inRecordedStore();
    });
    it('initializes the size to 0,0', () => {
      expect(store.getState().resize.height).toBe(0);
      expect(store.getState().resize.width).toBe(0);
    });
  });
});
