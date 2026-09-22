-- CreateTable
CREATE TABLE "HeroSlide" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "cta" TEXT NOT NULL DEFAULT 'Ver más',
    "image" TEXT NOT NULL DEFAULT '',
    "bg" TEXT NOT NULL DEFAULT 'from-slate-700 to-slate-900',
    "badge" TEXT NOT NULL DEFAULT '🔥 OFERTA LIMITADA',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HeroSlide_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HeroSlide_active_sortOrder_idx" ON "HeroSlide"("active", "sortOrder");
