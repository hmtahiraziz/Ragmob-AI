import * as SplashScreen from 'expo-splash-screen';
import { useAuth } from '@clerk/clerk-expo';

SplashScreen.preventAutoHideAsync();

/** Hides the splash screen once Clerk has finished loading the session. */
export function SplashScreenController() {
  const { isLoaded } = useAuth();

  if (isLoaded) {
    SplashScreen.hideAsync();
  }

  return null;
}
