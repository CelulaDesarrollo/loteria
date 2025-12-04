"use client";

import React, { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
} from "@/components/ui/alert-dialog";

interface GameStartCountdownModalProps {
  open: boolean;
  countdownValue: number | null; // 3, 2, 1, 0 (0 = "¡YA!"), null = cerrado
}

export function GameStartCountdownModal({
  open,
  countdownValue,
}: GameStartCountdownModalProps) {
  const isCountingDown = countdownValue !== null && countdownValue > 0;
  const isYa = countdownValue === 0;

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="border-0 bg-transparent shadow-none max-w-sm w-[90vw]">
        <div className="flex items-center justify-center">
          <div
            className={`
              flex items-center justify-center
              rounded-full font-bold text-white
              transition-all duration-300 ease-in-out
              ${isCountingDown ? "w-32 h-32 md:w-48 md:h-48 text-6xl md:text-8xl bg-primary/80" : ""}
              ${isYa ? "w-40 h-40 md:w-56 md:h-56 text-7xl md:text-9xl bg-green-500/90 animate-pulse" : ""}
            `}
            style={{
              fontSize: isCountingDown ? "clamp(3rem, 15vw, 8rem)" : "clamp(3.5rem, 20vw, 9rem)",
            }}
          >
            {isCountingDown && countdownValue}
            {isYa && "¡YA!"}
          </div>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}