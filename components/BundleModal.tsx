"use client";

import { useEffect, Fragment } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { X } from "lucide-react";

interface BundleSkin {
  skinName: string;
  bundleName: string;
  skinIcon: string;
  bundleIcon?: string;
  themeUuid?: string;
  bundleUuid?: string;
}

interface BundleModalProps {
  isOpen: boolean;
  onClose: () => void;
  bundleName: string;
  skins: BundleSkin[];
}

export default function BundleModal({
  isOpen,
  onClose,
  bundleName,
  skins,
}: BundleModalProps) {
  // Cerrar modal con tecla Escape
  useEffect(() => {
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscapeKey);

    return () => document.removeEventListener("keydown", handleEscapeKey);
  }, [isOpen, onClose]);

  // Prevenir scroll cuando el modal está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <Fragment>
          {/* Overlay con efecto de desenfoque */}
          <motion.div
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-2 sm:px-4 py-4 sm:py-8 pointer-events-none"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
          >
            <motion.div
              animate={{ scale: 1, y: 0 }}
              className="bg-gradient-to-b from-gray-900 to-black border border-gray-800 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl w-full max-w-5xl max-h-[95vh] sm:max-h-[90vh] pointer-events-auto"
              exit={{ scale: 0.9, y: 20 }}
              initial={{ scale: 0.9, y: 20 }}
              transition={{
                type: "spring",
                damping: 25,
                stiffness: 300,
              }}
            >
              {/* Header con imagen de fondo */}
              <div className="relative">
                <div className="relative h-40 sm:h-48 md:h-56 w-full overflow-hidden">
                  {skins[0]?.bundleIcon && (
                    <Image
                      fill
                      priority
                      alt={bundleName}
                      className="object-cover"
                      src={skins[0].bundleIcon}
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent" />
                </div>

                {/* Título del bundle */}
                <div className="absolute bottom-3 sm:bottom-4 left-4 sm:left-6 right-4 sm:right-6">
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white drop-shadow-md">
                    {bundleName}
                  </h2>
                  <p className="text-gray-300 mt-1 text-sm sm:text-base">
                    {skins.length} skins disponibles
                  </p>
                </div>

                {/* Botón de cerrar */}
                <button
                  className="absolute top-3 sm:top-4 right-3 sm:right-4 p-2 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-white hover:bg-black/70 transition-colors"
                  onClick={onClose}
                >
                  <X className="h-5 w-5 sm:h-6 sm:w-6" />
                </button>
              </div>

              {/* Contenido del modal con scroll */}
              <div className="max-h-[60vh] overflow-y-auto p-4 sm:p-6 custom-scrollbar">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
                  {skins.map((skin, index) => (
                    <motion.div
                      key={index}
                      animate={{
                        opacity: 1,
                        y: 0,
                        transition: { delay: index * 0.05 },
                      }}
                      className="group flex flex-col bg-gray-800/50 hover:bg-gray-800 border border-gray-700 rounded-xl overflow-hidden transition-all duration-300 hover:shadow-[0px_2px_46px_-4px_rgba(255,_255,_255,_0.15)]"
                      initial={{ opacity: 0, y: 20 }}
                    >
                      {/* Imagen de la skin */}
                      <div className="relative h-32 sm:h-36 md:h-40 w-full bg-gradient-to-br from-gray-900 to-black p-3 sm:p-4 flex items-center justify-center">
                        {skin.skinIcon ? (
                          <Image
                            fill
                            unoptimized
                            alt={skin.skinName}
                            className="object-contain p-1 sm:p-2 transition-transform duration-300 scale-90 group-hover:scale-100"
                            src={skin.skinIcon}
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full w-full">
                            <span className="text-xs sm:text-sm text-gray-400">
                              Sin imagen
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Nombre de la skin */}
                      <div className="p-3 sm:p-4 border-t border-gray-700">
                        <h3 className="text-white font-medium text-center text-sm sm:text-base leading-tight">
                          {skin.skinName}
                        </h3>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        </Fragment>
      )}
    </AnimatePresence>
  );
}
