-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "listingName" TEXT,
    "type" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "status" TEXT,
    "rating" REAL,
    "categories" JSONB NOT NULL,
    "text" TEXT,
    "privateFeedback" TEXT,
    "submittedAt" DATETIME NOT NULL,
    "authorName" TEXT,
    "authorUrl" TEXT,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
