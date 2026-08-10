import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

/** True on native dev/standalone builds; false on web and Expo Go (SDK 53+). */
export function notificationsSupported(): boolean {
  if (Platform.OS === 'web') return false;
  return Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;
}
