import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";

/**
 * Convex Auth configuration - replaces custom user authentication
 */
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password],
});
