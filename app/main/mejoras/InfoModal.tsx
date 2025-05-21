"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { HelpCircle, X } from "lucide-react";

export default function InfoModal() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="absolute top-4 right-4 p-2 rounded-full"
        aria-label="Ver información sobre mejoras"
      >
        <HelpCircle className="w-5 h-5" />
      </Button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="absolute top-2 right-2 p-2 rounded-full"
                aria-label="Cerrar"
              >
                <X className="w-5 h-5" />
              </Button>
              
              <h2 className="text-2xl font-bold text-white mb-4">Sistema de mejoras de skins</h2>
              
              <div className="prose prose-invert max-w-none">
                <h3>Funcionamiento</h3>
                <p>
                  El sistema de mejoras permite intercambiar múltiples skins de tu inventario
                  para intentar obtener una skin específica. Este proceso es aleatorio, 
                  pero tiene mayor probabilidad de éxito dependiendo de la cantidad y calidad 
                  de las skins seleccionadas.
                </p>

                <h3>Probabilidad de mejora</h3>
                <p>La probabilidad se calcula con la siguiente fórmula:</p>
                <ul>
                  <li><strong>Base del 10%</strong> por seleccionar al menos una skin</li>
                  <li><strong>+5%</strong> por cada skin seleccionada adicional</li>
                  <li><strong>+10%</strong> por cada nivel de grado acumulado</li>
                  <li><strong>-20%</strong> por cada nivel de diferencia entre el grado máximo seleccionado y el objetivo</li>
                </ul>

                <h3>Grados de skins</h3>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="flex items-center">
                    <div className="w-4 h-4 rounded-full bg-[#5a9fe2] mr-2"></div>
                    <span>Grado 1: Select Edition</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 rounded-full bg-[#009587] mr-2"></div>
                    <span>Grado 2: Deluxe Edition</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 rounded-full bg-[#d1548d] mr-2"></div>
                    <span>Grado 3: Premium Edition</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 rounded-full bg-[#fad663] mr-2"></div>
                    <span>Grado 4: Ultra/Exclusive Edition</span>
                  </div>
                </div>

                <h3>Notas importantes</h3>
                <ul>
                  <li>Las skins seleccionadas <strong>siempre se pierden</strong>, independientemente del resultado.</li>
                  <li>La probabilidad máxima nunca alcanzará el 100%, siempre existe un pequeño riesgo.</li>
                  <li>Se recomienda combinar skins de grado superior o igual al de la skin objetivo.</li>
                </ul>

                <div className="mt-6 p-4 bg-neutral-800 rounded-lg">
                  <h4 className="font-semibold">Ejemplo:</h4>
                  <p className="mb-2">Mejorar 3 skins Select (Grado 1) para obtener una skin Select (Grado 1):</p>
                  <ul className="list-disc ml-4">
                    <li>Base: 10%</li>
                    <li>3 skins: +15%</li>
                    <li>3 grados acumulados (1+1+1): +30%</li>
                    <li>Sin penalización (mismo grado): 0%</li>
                    <li className="font-semibold">Total: 55% de probabilidad</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 