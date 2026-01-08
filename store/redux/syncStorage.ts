// @ts-ignore
import createWebStorage from 'redux-persist/lib/storage/createWebStorage';

const createDummyStorage = () => ({
  getItem() {
    return Promise.resolve(null);
  },
  setItem(_key: string, value: any) {
    return Promise.resolve(value);
  },
  removeItem() {
    return Promise.resolve();
  },
});

const storage =
  typeof window !== 'undefined'
    ? createWebStorage('local')
    : createDummyStorage();

export default storage;
