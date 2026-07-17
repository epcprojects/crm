"use client";
import { useEffect } from "react";

let openModalsCount = 0;

export const useBodyScrollLock = (isOpen: boolean) => {
  useEffect(() => {
    if (isOpen) {
      openModalsCount++;
      document.body.style.overflow = "hidden";
    } else {
      openModalsCount = Math.max(0, openModalsCount - 1);
      if (openModalsCount === 0) {
        document.body.style.overflow = "auto";
      }
    }

    return () => {
      if (isOpen) {
        openModalsCount = Math.max(0, openModalsCount - 1);
        if (openModalsCount === 0) {
          document.body.style.overflow = "auto";
        }
      }
    };
  }, [isOpen]);
};
