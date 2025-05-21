import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Función para extraer el nombre del bundle de una skin
export const extractBundleName = (skinName: string): string => {
  const parts = skinName.split(' ');
  // Asumimos que el nombre del bundle es la primera parte si no es "Standard" o "Estándar"
  // y si hay más de una palabra (para evitar nombres de armas simples).
  if (parts.length > 1 && parts[0].toLowerCase() !== "standard" && parts[0].toLowerCase() !== "estándar") {
    // Intenta unir partes que forman un nombre de bundle, un enfoque heurístico
    let bundleName = parts[0];
    for (let i = 1; i < parts.length -1; i++) { // Detenerse antes de la última palabra (posible nombre del arma)
      // Típicamente los nombres de los bundles están en formato Título (Mayúscula Inicial)
      if (parts[i][0] === parts[i][0].toUpperCase()) { 
        bundleName += ` ${parts[i]}`;
      } else {
        break;
      }
    }
    return bundleName;
  }
  return ''; // Devuelve vacío si no hay un bundle claro o es estándar
};
