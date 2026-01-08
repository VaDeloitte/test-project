/* eslint-disable import/no-mutable-exports */
import {createWrapper} from 'next-redux-wrapper';
import {legacy_createStore as createStore, applyMiddleware, combineReducers} from 'redux';
import thunkMiddleware from 'redux-thunk';

import storage from './syncStorage';
import userReducer from './reducers/user.reducer';
import { compose } from '@reduxjs/toolkit';

declare global {
  interface Window {
    __REDUX_DEVTOOLS_EXTENSION_COMPOSE__?: typeof compose;
    __REDUX_DEVTOOLS_EXTENSION__: any;
  }
}

export let configureStore: any;

// COMBINING ALL REDUCERS
const combinedReducer = combineReducers({
  User: userReducer
});

type rootState = ReturnType<typeof combinedReducer>;

// BINDING MIDDLEWARE
const bindMiddleware = (middleware: any) => {
  if (process.env.NODE_ENV !== 'production') {
    const {composeWithDevTools} = require('redux-devtools-extension');
    return composeWithDevTools(applyMiddleware(...middleware));
  }
  return applyMiddleware(...middleware);
};

const makeStore = ({isServer}: any) => {
  if (isServer) {
    // If it's on server side, create a store
    return createStore(combinedReducer, bindMiddleware([thunkMiddleware]));
  }
  // If it's on client side, create a store which will persist
  const {persistStore, persistReducer} = require('redux-persist');

  const persistConfig = {
    key: 'genie_ai_store',
    whitelist: ['User', 'userData'], // add other reducers if needed to be persisted
    storage, // if needed, use a safer storage
    version: 1,
  };

  //@ts-ignore
  const persistedReducer = persistReducer<rootState>(persistConfig, combinedReducer);

  const store = createStore(
    persistedReducer,
    bindMiddleware([thunkMiddleware]),
  );

  // @ts-ignore
  store.__persistor = persistStore(store);

  configureStore = store;

  return store;
};

export const wrapper = createWrapper(makeStore, {debug: false});
// export type IRootState = ReturnType<typeof reduxStore.getState>;
