// app/api/auth/[...nextauth]/auth.ts
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import DiscordProvider from "next-auth/providers/discord";
import CredentialsProvider from "next-auth/providers/credentials";
import { SupabaseAdapter } from "@auth/supabase-adapter";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: SupabaseAdapter({ 
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!, 
    secret: process.env.SUPABASE_SERVICE_ROLE_KEY! 
  }),
  providers: [
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
    DiscordProvider({
      clientId: process.env.AUTH_DISCORD_ID!,
      clientSecret: process.env.AUTH_DISCORD_SECRET!,
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        id: { label: 'ID', type: 'text' },
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.id || !credentials?.username) return null;
        
        try {
          // Aquí podemos validar las credenciales contra Supabase si es necesario
          const user = {
            id: String(credentials.id),
            email: String(credentials.email),
            name: String(credentials.username),
            image: null
          };
          return user;
        } catch (error) {
          console.error('Error en authorize:', error);
          return null;
        }
      }
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 días
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id && token.email && token.name) {
        session.user.id = String(token.id);
        session.user.email = String(token.email);
        session.user.name = String(token.name);
      }
      return session;
    },
  },
  pages: {
    signIn: '/',
    signOut: '/',
    error: '/error',
  },
  secret: process.env.AUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
});
