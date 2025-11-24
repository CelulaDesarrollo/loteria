import React, { Suspense } from 'react';

// Soportar todas las 4 salas
export async function generateStaticParams() {
  return [
    { id: 'sala_1' },
    { id: 'sala_2' },
    { id: 'sala_3' },
    { id: 'sala_4' },
  ];
}

interface LayoutProps {
  children: React.ReactNode;
}

export default function RoomLayout({ children }: LayoutProps) {
  return (
    <Suspense fallback={<div>Cargando juego...</div>}>
      {children}
    </Suspense>
  );
}