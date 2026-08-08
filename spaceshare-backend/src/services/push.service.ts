import axios from 'axios';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export const sendPushNotification = async (pushToken: string, title: string, body: string) => {
  try {
    await axios.post(EXPO_PUSH_URL, {
      to: pushToken,
      sound: 'default',
      title,
      body,
    }, {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.log('Failed to send push notification:', err?.response?.data ?? err.message);
  }
};