-- AlterTable: Make clientDOB optional in prior_authorization_questionnaires
ALTER TABLE "prior_authorization_questionnaires" ALTER COLUMN "clientDOB" DROP NOT NULL;
