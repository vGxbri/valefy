"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion, LayoutGroup } from "framer-motion";

interface CustomPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  siblings?: number; // Number of page numbers to show on each side of the current page
}

const CustomPagination: React.FC<CustomPaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  siblings = 1,
}) => {
  const DOTS = "...";

  const range = (start: number, end: number) => {
    const length = end - start + 1;
    return Array.from({ length }, (_, idx) => idx + start);
  };

  const getPageNumbers = () => {
    const totalPageNumbers = siblings * 2 + 3; // siblings + current + first + last + 2*DOTS
    const totalBlocks = totalPageNumbers + 2; // With DOTS

    if (totalPages <= totalBlocks) {
      return range(1, totalPages);
    }

    const leftSiblingIndex = Math.max(currentPage - siblings, 1);
    const rightSiblingIndex = Math.min(currentPage + siblings, totalPages);

    const shouldShowLeftDots = leftSiblingIndex > 2;
    const shouldShowRightDots = rightSiblingIndex < totalPages - 2;

    const firstPageIndex = 1;
    const lastPageIndex = totalPages;

    if (!shouldShowLeftDots && shouldShowRightDots) {
      let leftItemCount = 3 + 2 * siblings;
      let leftRange = range(1, leftItemCount);
      return [...leftRange, DOTS, totalPages];
    }

    if (shouldShowLeftDots && !shouldShowRightDots) {
      let rightItemCount = 3 + 2 * siblings;
      let rightRange = range(totalPages - rightItemCount + 1, totalPages);
      return [firstPageIndex, DOTS, ...rightRange];
    }

    if (shouldShowLeftDots && shouldShowRightDots) {
      let middleRange = range(leftSiblingIndex, rightSiblingIndex);
      return [firstPageIndex, DOTS, ...middleRange, DOTS, lastPageIndex];
    }

    return range(1, totalPages); // Should not happen with logic above
  };

  const pageNumbers = getPageNumbers();

  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav aria-label="Page navigation">
      <LayoutGroup>
        <ul className="flex items-center justify-center gap-1 md:gap-1">
          <li>
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={`mr-1 flex items-center justify-center px-3 h-9 md:px-3 md:h-10
                          disabled:opacity-50 disabled:cursor-not-allowed
                          rounded-xl bg-gradient-to-r from-red-500/20 to-red-600/20 text-white shadow-lg 
                          shadow-red-900/20 border border-red-500/20 hover:bg-gradient-to-r hover:from-red-500/30 
                          hover:to-red-600/30 active:scale-95 transition-all duration-200`}
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </li>

          {pageNumbers.map((pageNumber, index) => {
            if (pageNumber === DOTS) {
              return (
                <li key={`${DOTS}-${index}`} className="px-1 md:px-2">
                  <span className="text-gray-400">...</span>
                </li>
              );
            }

            const isActive = currentPage === pageNumber;
            return (
              <li key={pageNumber}>
                <motion.button
                  onClick={() => onPageChange(pageNumber as number)}
                  className={`relative flex items-center justify-center rounded-xl
                              px-3 h-9 md:px-4 md:h-10 text-sm font-medium
                              active:scale-95 transition-transform duration-150
                              ${
                                isActive
                                  ? "text-white bg-transparent"
                                  : "text-white bg-gray-800 hover:bg-gradient-to-r hover:from-red-500/30 hover:to-red-600/30 transition-colors duration-150"
                              }
                              ${
                                pageNumbers.length > 5
                                  ? "px-2 md:px-3 h-8 md:h-9 text-xs md:text-sm"
                                  : ""
                              }
                            `}
                  aria-current={isActive ? "page" : undefined}
                >
                  {isActive && (
                    <motion.div
                      className="absolute inset-0 rounded-xl bg-gradient-to-r from-red-500/20 to-red-600/20 shadow-lg border border-red-500/20 shadow-red-900/20"
                      layoutId="active-page-indicator"
                      transition={{ type: "spring", stiffness: 400, damping: 30, mass: 0.8 }}
                    />
                  )}
                  <span className="relative z-10">{pageNumber}</span>
                </motion.button>
              </li>
            );
          })}

          <li>
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`ml-1 flex items-center justify-center h-9 md:px-3 md:h-10
                          disabled:opacity-50 disabled:cursor-not-allowed
                          rounded-xl bg-gradient-to-r from-red-500/20 to-red-600/20 text-white shadow-lg 
                          shadow-red-900/20 border border-red-500/20 hover:bg-gradient-to-r hover:from-red-500/30 
                          hover:to-red-600/30 active:scale-95 transition-all duration-200`}
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </li>
        </ul>
      </LayoutGroup>
    </nav>
  );
};

export default CustomPagination; 