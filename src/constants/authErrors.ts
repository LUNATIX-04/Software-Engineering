export const AUTH_ERROR_MESSAGES = {
  invalidJsonBody: "Invalid JSON body.",
  emailHasExistingPassword: "This email already has an ASAP password. Please sign in instead.",
  emailRequiresSocialSignIn:
    "This email already uses Google sign-in. Please sign in with Google, then set an ASAP password from Account Settings.",
  noPasswordConfigured:
    "No password is set for this account. Please use Google sign-in instead and set a password from Account Settings.",
  incorrectCredentials: "Incorrect email or password.",
  oldPasswordRequired: "Please confirm your current password before choosing a new one.",
  oldPasswordIncorrect: "The current password you entered is incorrect.",
  profileNoChanges: "No profile changes were provided.",
  unableToResolveUser: "Unable to resolve user record.",
  unableToCompleteSignup: "Unable to complete signup.",
} as const
