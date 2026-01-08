import { UserActionsType } from '../types/redux.enums';

import { User } from '@/types';

export const AppActions = {
  USER_DETAILS: UserActionsType.USER_DETAILS,
  LOGOUT_USER: UserActionsType.LOGOUT_USER,
};

export const setUserDetails = (userDetails: User) => {
  return {
    type: UserActionsType.USER_DETAILS,
    payload: userDetails,
  };
};

export const logoutUser = () => {
    return {
      type: UserActionsType.LOGOUT_USER,
      payload: {loggedIn: false},
    };
  };
