import resize from '.';
const { resized } = resize.actions;

describe('resize', () => {
  describe('when window is defined', () => {
    const store = resize.initialize({ window }).asStore({
      deferred: true,
      enforceImmutableState: true,
    });
    beforeEach(() => {
      store.reload();
    });
    it('updates the dimensions state when resized', () => {
      store.dispatch(resized(1, 2));
      expect(store.getState().resize.height).toBe(1);
      expect(store.getState().resize.width).toBe(2);
    });
  });
  describe('when window is undefined', () => {
    const store = resize.initialize({ window: 'none' }).asStore({
      deferred: true,
      enforceImmutableState: true,
    });
    beforeEach(() => {
      store.reload();
    });
    it('initializes the size to 0,0', () => {
      expect(store.getState().resize.height).toBe(0);
      expect(store.getState().resize.width).toBe(0);
    });
  });
});
