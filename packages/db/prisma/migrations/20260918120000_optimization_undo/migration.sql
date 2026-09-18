-- CreateTable
CREATE TABLE "OptimizationUndoSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fromDate" DATE NOT NULL,
    "toDate" DATE NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OptimizationUndoSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OptimizationUndoSnapshot_userId_key" ON "OptimizationUndoSnapshot"("userId");

-- AddForeignKey
ALTER TABLE "OptimizationUndoSnapshot" ADD CONSTRAINT "OptimizationUndoSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
