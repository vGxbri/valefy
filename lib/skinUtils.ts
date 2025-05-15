/**
 * Utilidades para el manejo de skins de Valorant en la aplicación
 */
import { Skin as ValorantSkin, getBestDisplayIcon } from './valorantApi';

/**
 * Formatea una skin de Valorant al formato usado en la aplicación
 * @param skin Skin de Valorant a formatear
 * @param tierData Datos del tier (nombre y color), puede ser null
 * @returns Skin formateada para la aplicación
 */
export const formatSkinForApp = (
  skin: ValorantSkin, 
  tierData: { nombre: string; color: string } | null
) => {
  // Obtener el mejor icono disponible (primero del nivel 1, luego el principal)
  const bestIcon = getBestDisplayIcon(skin);
  
  // Valores predeterminados para tier si no se proporciona
  const defaultTierName = 'Desconocido';
  const defaultTierColor = '#5a9fe2'; // Azul por defecto

  return {
    id: skin.uuid,
    nombre: skin.displayName,
    bundleName: skin.displayName.split(' ')[0],
    content_tier_id: skin.contentTierUuid || '',
    uuid: skin.uuid,
    imagen_url: bestIcon || '', // Usar cadena vacía como fallback
    content_tier: {
      id: skin.contentTierUuid || '',
      nombre: tierData ? tierData.nombre : defaultTierName,
      descripcion: '',
      color: tierData ? tierData.color : defaultTierColor,
      uuid: skin.contentTierUuid || ''
    }
  };
};
