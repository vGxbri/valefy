// app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/app/auth"; // Asegúrate que la ruta a auth.ts sea correcta
export const { GET, POST } = handlers;