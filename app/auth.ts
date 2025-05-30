// app/api/auth/[...nextauth]/auth.ts
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import DiscordProvider from "next-auth/providers/discord";
import CredentialsProvider from "next-auth/providers/credentials";
import { createClient } from "@supabase/supabase-js";
import bcryptjs from "bcryptjs";
import { inicializarMisionesUsuario } from "@/lib/missionUtils";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export const { handlers, signIn, signOut, auth } = NextAuth({
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
          .select("id, correo, nombre_usuario, password, oauth")
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
          // Verificar si es una cuenta OAuth sin contraseña
          if (user && !user.password && user.oauth) {
            console.log("[authorize] Intento de login con credenciales en cuenta OAuth");
            return null;
          }
          
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
    async jwt({ token, user, account, profile }) {
      // Si es login con OAuth
      if (
        account &&
        (account.provider === "google" || account.provider === "discord") &&
        profile &&
        profile.email
      ) {
        let { data: usuario, error: searchError } = await supabase
          .from("usuarios")
          .select("*")
          .eq("correo", profile.email)
          .maybeSingle();

        if (!usuario) {
          // Usuario no existe, crear nuevo usuario OAuth
          const { data: nuevo, error: insertError } = await supabase
            .from("usuarios")
            .insert([
              {
                correo: profile.email,
                nombre_usuario: profile.name || profile.email.split("@")[0],
                password: null,
                saldo: 0,
                oauth: true,
              },
            ])
            .select()
            .single();

          if (insertError || !nuevo) {
            throw new Error(
              "No se pudo crear el usuario OAuth en la tabla usuarios: " +
                (insertError?.message || "Desconocido"),
            );
          }
          usuario = nuevo;
          inicializarMisionesUsuario(usuario.id);
        } else {
          // Usuario ya existe, verificar si necesita actualización para OAuth
          if (!usuario.oauth) {
            // Usuario existe pero no es OAuth, actualizar para permitir ambos métodos
            const { data: updated, error: updateError } = await supabase
              .from("usuarios")
              .update({ oauth: true })
              .eq("id", usuario.id)
              .select()
              .single();

            if (updateError) {
              console.error("[OAuth] Error al actualizar usuario para OAuth:", updateError);
              throw new Error("No se pudo actualizar el usuario para OAuth");
            }

            usuario = updated || usuario;
            inicializarMisionesUsuario(usuario.id);
          }
        }

        token.id = usuario.id;
        token.email = usuario.correo;
        token.name = usuario.nombre_usuario;
      }

      // Si es login con credentials, ya tienes el user en el token
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
      }

      // Verificar consistencia del token con la base de datos
      if (token.id && token.email && !account && !user) {
        // Verificar si el usuario del token existe en la base de datos
        const { data: tokenUser, error: tokenCheckError } = await supabase
          .from("usuarios")
          .select("*")
          .eq("id", token.id)
          .maybeSingle();

        if (tokenCheckError || !tokenUser) {
          // Si el usuario del token no existe, buscar por email
          const { data: emailUser, error: emailSearchError } = await supabase
            .from("usuarios")
            .select("*")
            .eq("correo", token.email)
            .maybeSingle();

          if (emailUser) {
            // Actualizar token con la información correcta
            token.id = emailUser.id;
            token.email = emailUser.correo;
            token.name = emailUser.nombre_usuario;
          } else {
            // Token totalmente inconsistente, forzar re-login
            throw new Error("Token inconsistente, necesario re-login");
          }
        }
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
