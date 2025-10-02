'use client';

import { Header } from "@/components/layout/Header";
import { MainContent } from "@/components/layout/MainContent";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <MainContent />
    </div>
  );
}