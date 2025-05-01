// app/api/auth/[...nextauth]/auth.ts
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import DiscordProvider from "next-auth/providers/discord";
import CredentialsProvider from "next-auth/providers/credentials";
import { SupabaseAdapter } from "@auth/supabase-adapter";
import { createClient } from "@supabase/supabase-js";
import bcryptjs from "bcryptjs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: SupabaseAdapter({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    secret: process.env.SUPABASE_SERVICE_ROLE_KEY!,
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
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        console.log("[authorize] Credenciales recibidas:", credentials);
        if (
          !credentials?.email ||
          !credentials?.password ||
          typeof credentials.password !== "string" ||
          !credentials.password
        ) {
          console.log("[authorize] Faltan credenciales válidas");

          return null;
        }
        // Buscar usuario en la tabla 'usuarios'
        const { data: user, error } = await supabase
          .from("usuarios")
          .select("id, correo, nombre_usuario, password")
          .eq("correo", credentials.email)
          .single();

        console.log("[authorize] Resultado de búsqueda de usuario:", {
          user,
          error,
        });

        if (
          error ||
          !user ||
          typeof user.password !== "string" ||
          !user.password
        ) {
          console.log(
            "[authorize] Usuario no encontrado o password inválido en la base de datos",
          );

          return null;
        }

        // Comparar la contraseña
        const isValid = await bcryptjs.compare(
          credentials.password,
          user.password,
        );

        console.log(
          "[authorize] Resultado de comparación de contraseña:",
          isValid,
        );
        if (!isValid) {
          console.log("[authorize] Contraseña incorrecta");

          return null;
        }

        // Devuelve el usuario en el formato que NextAuth espera
        const userObj = {
          id: user.id,
          email: user.correo,
          name: user.nombre_usuario,
          image: null,
        };

        console.log("[authorize] Usuario autenticado correctamente:", userObj);

        return userObj;
      },
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
    signIn: "/",
    signOut: "/",
    error: "/error",
  },
  secret: process.env.AUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
});
