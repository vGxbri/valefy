import React from "react";
import { Button } from "@/components/ui/button";

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  maxVisible?: number;
};

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  maxVisible = 5,
}: PaginationProps) {
  // No mostrar paginación si hay una sola página
  if (totalPages <= 1) return null;

  // Calcular el rango de páginas a mostrar
  const getPageRange = () => {
    const halfVisible = Math.floor(maxVisible / 2);
    let startPage = Math.max(1, currentPage - halfVisible);
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    
    // Ajustar startPage si estamos cerca del final
    if (endPage === totalPages) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }
    
    return Array.from(
      { length: endPage - startPage + 1 },
      (_, i) => startPage + i
    );
  };

  const pages = getPageRange();

  return (
    <div className="flex items-center justify-center gap-2">
      {/* Botón Anterior */}
      <Button
        variant="outline"
        size="sm"
        className="h-8 w-8 p-0 bg-neutral-800 border-neutral-700"
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
      >
        &lt;
      </Button>

      {/* Primera página si no está en el rango */}
      {pages[0] > 1 && (
        <>
          <Button
            variant={currentPage === 1 ? "default" : "outline"}
            size="sm"
            className={`h-8 w-8 p-0 ${
              currentPage === 1
                ? "bg-primary text-primary-foreground"
                : "bg-neutral-800 border-neutral-700"
            }`}
            onClick={() => onPageChange(1)}
          >
            1
          </Button>
          {pages[0] > 2 && <span className="text-gray-400">...</span>}
        </>
      )}

      {/* Páginas del rango */}
      {pages.map((page) => (
        <Button
          key={page}
          variant={currentPage === page ? "default" : "outline"}
          size="sm"
          className={`h-8 w-8 p-0 ${
            currentPage === page
              ? "bg-primary text-primary-foreground"
              : "bg-neutral-800 border-neutral-700"
          }`}
          onClick={() => onPageChange(page)}
        >
          {page}
        </Button>
      ))}

      {/* Última página si no está en el rango */}
      {pages[pages.length - 1] < totalPages && (
        <>
          {pages[pages.length - 1] < totalPages - 1 && (
            <span className="text-gray-400">...</span>
          )}
          <Button
            variant={currentPage === totalPages ? "default" : "outline"}
            size="sm"
            className={`h-8 w-8 p-0 ${
              currentPage === totalPages
                ? "bg-primary text-primary-foreground"
                : "bg-neutral-800 border-neutral-700"
            }`}
            onClick={() => onPageChange(totalPages)}
          >
            {totalPages}
          </Button>
        </>
      )}

      {/* Botón Siguiente */}
      <Button
        variant="outline"
        size="sm"
        className="h-8 w-8 p-0 bg-neutral-800 border-neutral-700"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
      >
        &gt;
      </Button>
    </div>
  );
} 