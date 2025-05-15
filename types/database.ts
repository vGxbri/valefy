export interface User {
  id: string; // UUID
  nombre_usuario: string;
  correo: string;
  saldo: number;
  password: string;
  oauth?: string;
}

export interface Caja {
  id: string; // UUID
  nombre: string;
  precio: number;
}

export interface CajaSkin {
  id: string; // UUID
  caja_id: string; // UUID referencia a Caja
  skin_id: string; // UUID referencia a Skin
  skin_nombre?: string; // Nombre de la skin
  content_tier_id?: string; // UUID referencia a ContentTier

}

export interface Transaccion {
  id: string; // UUID
  usuario_id: string; // UUID referencia a User
  caja_id: string; // UUID referencia a Caja
  fecha: Date;
}