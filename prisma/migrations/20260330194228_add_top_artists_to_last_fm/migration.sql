-- AlterTable
ALTER TABLE "UserLastFM" ADD COLUMN     "topArtists" JSONB NOT NULL DEFAULT '[]';
