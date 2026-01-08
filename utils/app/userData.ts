import { User } from '@/types';

const STORAGE_KEY = 'user_data';

export const getUser = (): User => {
  let user: User = {
    loggedIn: false,
  };
  try {
  const userJson = localStorage.getItem(STORAGE_KEY)
  if (userJson) {
      let savedUser = JSON.parse(userJson) as User;
      user = Object.assign(user, savedUser);
  }
  } catch (e) {
    console.error(e);
  }
  finally
  {
    console.log("useruser",user);
    return user;
  }
};

export const saveUser = (user: User) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
};

export const logoutUser = () => {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.setItem(STORAGE_KEY, JSON.stringify({loggedIn: false}));
};
