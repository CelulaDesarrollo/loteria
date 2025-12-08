"use client";

import React from "react";
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogTitle,
    AlertDialogDescription,
} from "@/components/ui/alert-dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

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
            <AlertDialogContent className="border-0 bg-transparent shadow-none max-w-sm w-[90vw] flex items-center justify-center p-0">
                {/* Título oculto para accesibilidad */}
                <AlertDialogTitle asChild>
                    <VisuallyHidden>Cuenta regresiva de inicio de juego</VisuallyHidden>
                </AlertDialogTitle>

                {/* Descripción oculta para accesibilidad */}
                <AlertDialogDescription asChild>
                    <VisuallyHidden>El juego comienza en breve</VisuallyHidden>
                </AlertDialogDescription>

                <div
                    className={`
                        flex items-center justify-center
                        rounded-full font-bold text-white
                        transition-all duration-300 ease-in-out
                        ${isCountingDown ? "bg-primary/80" : ""}
                        ${isYa ? "bg-accent/80" : ""}
                    `}
                    style={{
                        width: "clamp(140px, 50vw, 320px)",
                        height: "clamp(140px, 50vw, 320px)",
                        fontSize: isCountingDown ? "clamp(6rem, 15vw, 12rem)" : "clamp(2rem, 10vw, 3rem)",
                        textAlign: "center",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "1rem",
                        flexDirection: "column",
                    }}
                >
                    {isCountingDown && <span>{countdownValue}</span>}
                    {isYa && (
                        <div className="flex items-center justify-center h-full w-full">
                            <span className="text-center">
                                ¡JUGUEMOS!
                            </span>
                        </div>
                    )}
                </div>
            </AlertDialogContent>
        </AlertDialog>
    );
}