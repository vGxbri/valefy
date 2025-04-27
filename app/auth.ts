// app/api/auth/[...nextauth]/auth.ts
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import DiscordProvider from "next-auth/providers/discord";
import { SupabaseAdapter } from "@auth/supabase-adapter"; // Usa el nuevo paquete correcto
import { createClient } from "@supabase/supabase-js";

// Crear cliente de Supabase solo si lo necesitas (para cosas personalizadas, no necesario para el adapter)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! // Para cliente normal, no el service role
);

// Exportar NextAuth handlers
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
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
  secret: process.env.AUTH_SECRET,
});
