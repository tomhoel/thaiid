import { AuthenticateWithRedirectCallback } from '@clerk/clerk-react';

/**
 * Landing route for the Google OAuth redirect. Clerk reads the callback
 * parameters out of the URL, finalises the session and then routes onward, so
 * this only has to render while that settles.
 */
export function AuthCallback() {
  return (
    <AuthenticateWithRedirectCallback
      signInFallbackRedirectUrl="/"
      signUpFallbackRedirectUrl="/"
    />
  );
}
