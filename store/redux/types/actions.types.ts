import {
    User
  } from '@/types';
  import {UserActionsType} from './redux.enums';
  
  export interface ISetUserDetails {
    type: UserActionsType.USER_DETAILS;
    payload: User;
  }
  
  export interface ILogoutUser {
    type: UserActionsType.LOGOUT_USER;
    payload: {loggedIn: false};
  }
  

  export type UserAction = ISetUserDetails | ILogoutUser;
  