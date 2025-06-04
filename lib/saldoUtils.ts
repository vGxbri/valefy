// Utilidad simple para manejar actualizaciones de saldo sin contexto complejo

export function emitirActualizacionSaldo() {
  // Emitir evento personalizado para que el sidebar se actualice
  console.log('🔄 Emitiendo evento saldoActualizado');
  window.dispatchEvent(new CustomEvent('saldoActualizado'));
}

export function incrementarSaldoLocal(cantidad: number) {
  // Emitir evento con la cantidad a incrementar
  console.log('🔄 Emitiendo evento saldoIncrementado:', cantidad);
  window.dispatchEvent(new CustomEvent('saldoIncrementado', { 
    detail: { cantidad } 
  }));
}

export function decrementarSaldoLocal(cantidad: number) {
  // Emitir evento con la cantidad a decrementar (cantidad positiva)
  console.log('🔄 Emitiendo evento saldoDecrementado:', cantidad);
  window.dispatchEvent(new CustomEvent('saldoDecrementado', { 
    detail: { cantidad } 
  }));
}

export function actualizarSaldoLocal(nuevoCantidad: number) {
  // Emitir evento con el nuevo saldo total
  console.log('🔄 Emitiendo evento saldoNuevo:', nuevoCantidad);
  window.dispatchEvent(new CustomEvent('saldoNuevo', { 
    detail: { saldo: nuevoCantidad } 
  }));
} 