@echo off
set PORT=4000
set NODE_ENV=development
set DATABASE_URL=postgresql://postgres:Bing@@0912@localhost:5432/mentalspace_ehr?schema=public
npm run dev
