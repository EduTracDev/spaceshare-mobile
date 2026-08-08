import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { userAPI } from '@/services/api';

export async function registerPushToken(token: string) {
  if (!Device.isDevice) {
    // Push tokens don't work on simulators/emulators
    return;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

  const projectId = '22f84d2b-28f8-405b-b5d0-f41f046d90a3';
    const pushTokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
    const expoPushToken = pushTokenResponse.data;

    await userAPI.savePushToken(token, expoPushToken);
  } catch (err) {
    console.log('Failed to register push token:', err);
  }
}