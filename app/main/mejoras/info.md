# Sistema de mejoras de skins en Valefy

## Funcionamiento

El sistema de mejoras permite a los usuarios intercambiar múltiples skins de su inventario para intentar obtener una skin específica. Este proceso es aleatorio, pero tiene mayor probabilidad de éxito dependiendo de la cantidad y calidad de las skins seleccionadas.

## Probabilidad de mejora

La probabilidad de obtener una skin mediante mejora se calcula con la siguiente fórmula:

- **Base del 10%** por seleccionar al menos una skin
- **+5%** por cada skin seleccionada adicional
- **+10%** por cada nivel de grado acumulado entre todas las skins seleccionadas
- **-20%** por cada nivel de diferencia entre el grado máximo seleccionado y el de la skin objetivo

Los grados de las skins son:
- **Grado 1**: Select Edition (Azul)
- **Grado 2**: Deluxe Edition (Verde)
- **Grado 3**: Premium Edition (Rosa)
- **Grado 4**: Ultra/Exclusive Edition (Dorado/Naranja)

## Ejemplos

1. **Mejorar 3 skins Select (Grado 1) para obtener una skin Select (Grado 1)**:
   - Base: 10%
   - 3 skins: +15%
   - 3 grados acumulados (1+1+1): +30%
   - Sin penalización (mismo grado): 0%
   - **Total**: 55% de probabilidad

2. **Mejorar 2 skins Select (Grado 1) para obtener una skin Premium (Grado 3)**:
   - Base: 10%
   - 2 skins: +10%
   - 2 grados acumulados (1+1): +20%
   - Penalización por diferencia (3-1): -40%
   - **Total**: 0% de probabilidad (mínimo aplicado)

3. **Mejorar 1 skin Ultra (Grado 4) y 2 Deluxe (Grado 2) para obtener una Premium (Grado 3)**:
   - Base: 10%
   - 3 skins: +15%
   - 8 grados acumulados (4+2+2): +80%
   - Sin penalización (4 > 3): 0%
   - **Total**: 95% de probabilidad (máximo aplicado)

## Notas importantes

- Las skins seleccionadas para mejora **siempre se pierden**, independientemente del resultado.
- La probabilidad máxima nunca alcanzará el 100%, siempre existe un pequeño riesgo.
- Se recomienda combinar skins de grado superior o igual al de la skin objetivo.
- El sistema favorece la cantidad y calidad de las skins seleccionadas.

¡Buena suerte con tus mejoras! 