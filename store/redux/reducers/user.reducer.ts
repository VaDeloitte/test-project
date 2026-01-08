import { UserAction } from '../types/actions.types';
import { UserActionsType } from '../types/redux.enums';
import { InitialStateUser } from '../types/redux.types';

const initialState: InitialStateUser | undefined = {
  userDetails: { loggedIn: false },
};

const userReducer = (
  State: InitialStateUser = initialState,
  action: UserAction,
) => {
  switch (action.type) {
    case UserActionsType.USER_DETAILS:
      return {
        ...State,
        userDetails: { ...action.payload },
      };
    case UserActionsType.LOGOUT_USER:
      return {
        ...State,
        userDetails: { ...action.payload },
      };

    default:
      return State;
  }
};

export default userReducer;
