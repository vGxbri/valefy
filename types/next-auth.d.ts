import NextAuth from "next-auth"

declare module "next-auth" {
  interface User {
    id: string
    admin?: boolean
  }

  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      admin?: boolean
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string
    admin?: boolean
  }
} 