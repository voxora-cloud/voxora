import { useMemo, useState, useEffect } from "react";

export function usePagination<T>(
  items: T[],
  itemsPerPage: number,
  dependencies: unknown[] = []
) {
  const [currentPage, setCurrentPage] = useState(1);

  // Reset to page 1 when dependencies change (e.g., filters).
  // Defer state update to avoid sync setState in effects warnings.
  useEffect(() => {
    const timeout = setTimeout(() => setCurrentPage(1), 0);
    return () => clearTimeout(timeout);
  }, dependencies);

  const totalItems = items.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const currentItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return items.slice(start, end);
  }, [items, currentPage, itemsPerPage]);

  const pageNumbers = useMemo(() => {
    const pages: (number | string)[] = [];
    const showEllipsis = totalPages > 7;

    if (!showEllipsis) {
      // Show all pages if 7 or fewer
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage > 3) {
        pages.push("...");
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) {
          pages.push(i);
        }
      }

      if (currentPage < totalPages - 2) {
        pages.push("...");
      }

      // Always show last page
      if (!pages.includes(totalPages)) {
        pages.push(totalPages);
      }
    }

    return pages;
  }, [currentPage, totalPages]);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const goToNext = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  const goPrev = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  return {
    currentItems,
    currentPage,
    totalPages,
    pageNumbers,
    goToPage,
    goToNext,
    goPrev,
    startItem,
    endItem,
    totalItems,
  };
}
