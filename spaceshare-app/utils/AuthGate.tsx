import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useDispatch } from 'react-redux';
import { setAuth, logout } from '@/store/slices/authSlice';
import { userAPI } from '@/services/api';
import { registerPushToken } from '@/utils/registerPushToken';

export default function AuthGate({ onReady }: { onReady: () => void }) {
  const dispatch = useDispatch();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const token = await SecureStore.getItemAsync('token');

        if (!token) {
          setChecked(true);
          onReady();
          return;
        }

        // Validate the token is still good and pull fresh user data —
        // never trust a stored token blindly, it could be expired or revoked
        const res = await userAPI.getProfile(token);
        const user = res.data.user;

        dispatch(setAuth({ token, user }));
        registerPushToken(token);

        router.replace(user.role === 'HOST' ? '/host/home' : '/home');
      } catch (err) {
        // Token invalid/expired — clear it and fall through to the normal welcome flow
        await SecureStore.deleteItemAsync('token');
        dispatch(logout());
      } finally {
        setChecked(true);
        onReady();
      }
    };

    restoreSession();
  }, []);

  return null;
}