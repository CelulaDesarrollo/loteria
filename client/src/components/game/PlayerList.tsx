"use client";

import { useState } from "react";
import { Crown, Plus, Users, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import React from "react";

interface PlayerState {
  name: string;
  isOnline: boolean;
}

interface PlayerListProps {
  players: Record<string, PlayerState>;
  currentPlayerName: string;
  hostName?: string;
  roomId?: string;
}

export function PlayerList({
  players,
  currentPlayerName,
  hostName,
  roomId,
}: PlayerListProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const playerArray = Object.values(players);

  // Mapear ID de sala a nombre legible
  const getRoomLabel = (id?: string) => {
    if (!id) return "";
    const mapping: Record<string, string> = {
      sala_1: "Sala 1",
      sala_2: "Sala 2",
      sala_3: "Sala 3",
      sala_4: "Sala 4",
    };
    return mapping[id] || id;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        {/* Etiqueta de sala ARRIBA */}
        {roomId && (
          <div
            className="text-white font-bold mb-2 text-center"
            style={{ fontSize: "clamp(14px, 2vw, 14px)" }}
          >
            {getRoomLabel(roomId)}
          </div>
        )}

        {/* Título con jugadores y botón */}
        <CardTitle
          className="
            flex flex-wrap items-center justify-center text-center gap-3
            sm:flex-nowrap
          "
        >
          <div
            className="flex items-center justify-center gap-2 font-semibold text-white"
            style={{ fontSize: "clamp(14px, 2vw, 14px)" }}
          >
            <Users className="w-4 h-4 shrink-0 hidden md:inline" />
            <span className="whitespace-nowrap">
              Jugadores ({playerArray.filter((p) => p.isOnline).length})
            </span>
          </div>

          {/* Botón circular */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-6 h-6 rounded-full flex items-center justify-center bg-[hsl(var(--primary))] text-white text-lg"
          >
            {isExpanded ? (
              <Minus className="w-5 h-5" />
            ) : (
              <Plus className="w-5 h-5" />
            )}
          </button>
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div
          className={cn(
            "transition-all duration-500 ease-in-out overflow-hidden",
            isExpanded ? "opacity-100" : "max-h-0 opacity-0"
          )}
        >
          {/* Contenedor con scroll */}
          <div
            className="overflow-y-auto custom-scrollbar hide-scrollbar"
            style={{
              maxHeight: "6.5rem",
              paddingRight: "0.75rem",
              WebkitOverflowScrolling: "touch",
              scrollbarGutter: "stable",
              display: isExpanded ? "block" : "none",
            }}
          >
            <ul className="space-y-3 py-2">
              {playerArray.map((player) => (
                <li
                  key={player.name}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Avatar
                      className={cn(
                        "border-2",
                        player.isOnline ? "border-green-500" : "border-gray-400"
                      )}
                    >
                      <AvatarFallback>
                        {player.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span
                      className={cn(
                        "font-medium text-sm",
                        player.name === currentPlayerName && "text-primary"
                      )}
                    >
                      <span className="font-medium">
                        <span className="text-[hsl(var(--foreground))]">
                          {player.name}
                        </span>
                        {player.name === currentPlayerName && (
                          <span className="text-[hsl(var(--primary))]"> (Tú)</span>
                        )}
                      </span>
                    </span>
                  </div>
                  {player.name === hostName && (
                    <Crown className="w-5 h-6 text-yellow-500">
                      <title>Anfitrión</title>
                    </Crown>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
