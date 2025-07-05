import NextAuth from "next-auth";
import EmailProvider from "next-auth/providers/email";
import { createUser, getUserByEmail, updateUser } from "lib/firestore";

const handler = NextAuth({
    providers: [
        EmailProvider({
            server: {
                host: process.env.EMAIL_SERVER_HOST,
                port: process.env.EMAIL_SERVER_PORT,
                auth: {
                    user: process.env.EMAIL_SERVER_USER,
                    pass: process.env.EMAIL_SERVER_PASSWORD,
                },
            },
            from: process.env.EMAIL_FROM,
        }),
    ],
    callbacks: {
        async signIn({ user, account, profile, email, credentials }) {
            // Allow sign in for all users
            return true;
        },
        async session({ session, user }) {
            // Add user role and ID to session
            if (session.user) {
                const firebaseUser = await getUserByEmail(session.user.email!)
                if (firebaseUser) {
                    (session.user as any).id = firebaseUser.id;
                    (session.user as any).role = firebaseUser.role;
                }
            }
            return session;
        },
        async jwt({ token, user, account, profile }) {
            // Add user role to JWT token
            if (user) {
                const firebaseUser = await getUserByEmail(user.email!)
                if (firebaseUser) {
                    token.role = firebaseUser.role;
                    token.id = firebaseUser.id;
                }
            }
            return token;
        },
    },
    events: {
        async signIn({ user, account, profile, isNewUser }) {
            if (isNewUser && user.email) {
                // Create user in Firestore if they don't exist
                const existingUser = await getUserByEmail(user.email)
                if (!existingUser) {
                    await createUser({
                        email: user.email,
                        name: user.name || undefined,
                        role: 'COMPETITOR' // Default role
                    })
                }
            }
        },
    },
    pages: {
        signIn: "/auth/signin",
        verifyRequest: "/auth/verify-request",
    },
    session: {
        strategy: "jwt",
    },
});

export { handler as GET, handler as POST }; 