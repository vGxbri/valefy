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