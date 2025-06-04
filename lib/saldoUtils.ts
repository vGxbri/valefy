// Utilidad simple para manejar actualizaciones de saldo sin contexto complejo

export function emitirActualizacionSaldo() {
  // Emitir evento personalizado para que el sidebar se actualice
  window.dispatchEvent(new CustomEvent('saldoActualizado'));
}

export function incrementarSaldoLocal(cantidad: number) {
  // Emitir evento con la cantidad a incrementar
  window.dispatchEvent(new CustomEvent('saldoIncrementado', { 
    detail: { cantidad } 
  }));
}

export function decrementarSaldoLocal(cantidad: number) {
  // Emitir evento con la cantidad a decrementar (cantidad positiva)
  window.dispatchEvent(new CustomEvent('saldoDecrementado', { 
    detail: { cantidad } 
  }));
}

export function actualizarSaldoLocal(nuevoCantidad: number) {
  // Emitir evento con el nuevo saldo total
  window.dispatchEvent(new CustomEvent('saldoNuevo', { 
    detail: { saldo: nuevoCantidad } 
  }));
} 