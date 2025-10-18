-- AlterTable
-- Convert single role to multiple roles array
-- Step 1: Add new roles column as array
ALTER TABLE "users" ADD COLUMN "roles" "UserRole"[];

-- Step 2: Migrate existing role data to roles array
UPDATE "users" SET "roles" = ARRAY["role"::"UserRole"];

-- Step 3: Make roles column NOT NULL
ALTER TABLE "users" ALTER COLUMN "roles" SET NOT NULL;

-- Step 4: Drop old role column
ALTER TABLE "users" DROP COLUMN "role";
