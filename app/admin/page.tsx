'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function AdminPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success?: boolean;
    message?: string;
    error?: string;
    timestamp?: string;
  } | null>(null);

  const handleUpdateDailyBox = async () => {
    try {
      setLoading(true);
      setResult(null);

      const response = await fetch('/api/cajas/actualizar-diaria', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (response.ok) {
        setResult({
          success: true,
          message: data.message,
          timestamp: data.timestamp,
        });
      } else {
        setResult({
          success: false,
          error: data.error || 'Error desconocido',
        });
      }
    } catch (error: any) {
      setResult({
        success: false,
        error: error.message || 'Error al conectar con el servidor',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 p-12 min-h-screen bg-background w-full max-w-full flex-1">
      <div className="w-full max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-6">Panel de Administración</h1>
        
        <div className="bg-background/40 backdrop-blur-md border border-white/10 rounded-xl p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Caja Diaria</h2>
          <p className="text-white/80 mb-6">
            Utiliza este botón para forzar la actualización de la caja diaria con nuevas skins.
            Normalmente, la caja se actualiza automáticamente cada día a las 9:00 AM.
          </p>
          
          <Button
            onClick={handleUpdateDailyBox}
            disabled={loading}
            className="mb-4"
          >
            {loading ? 'Actualizando...' : 'Forzar actualización de la caja diaria'}
          </Button>
          
          {result && (
            <div className={`mt-4 p-4 rounded-md ${result.success ? 'bg-green-500/20 border border-green-500/30' : 'bg-red-500/20 border border-red-500/30'}`}>
              {result.success ? (
                <>
                  <p className="text-green-400 font-medium">{result.message}</p>
                  {result.timestamp && (
                    <p className="text-white/60 text-sm mt-1">
                      Actualizado el: {new Date(result.timestamp).toLocaleString()}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-red-400">{result.error}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
