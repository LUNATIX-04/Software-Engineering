# คู่มือ Deploy ขึ้น Vercel (Next.js + Supabase + Prisma)

โปรเจกต์นี้เป็น Next.js (App Router + API Routes) ใช้ฐานข้อมูล Supabase (PostgreSQL) และ Prisma. เอกสารนี้สรุปวิธี deploy บน Vercel ซึ่งเหมาะกับ Next.js ที่มี SSR/API มากกว่า GitHub Pages (static).

## ข้อควรระวังด้านความลับ (สำคัญมาก)
- ห้าม commit ค่าจริงของ `.env` ขึ้น Git. เก็บไว้เฉพาะในเครื่อง/Secret ของแพลตฟอร์มเท่านั้น (`.gitignore` ของโปรเจกต์ตั้งไว้ให้ละเว้น `.env*` อยู่แล้ว)
- หากเคย commit คีย์จริง (เช่น `SUPABASE_SERVICE_ROLE_KEY`) ให้ “หมุนคีย์ใหม่” (rotate) บน Supabase ทันที แล้วลบคีย์เก่าออกจากระบบ

## สิ่งที่ต้องมี
- บัญชี Vercel และสิทธิ์เข้าถึง GitHub repo นี้
- Supabase Project (ฐานข้อมูล PostgreSQL + Auth)
- Node.js 20/22 ติดตั้งในเครื่องสำหรับขั้นตอนเตรียมฐานข้อมูล (ครั้งแรก)

## 1) ตั้งค่า Supabase
- เปิด Supabase Project ของคุณ แล้วคัดลอกค่า:
  - Project URL → ใช้กับ `NEXT_PUBLIC_SUPABASE_URL`
  - anon public key → ใช้กับ `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  - service role key → ใช้กับ `SUPABASE_SERVICE_ROLE_KEY` (ฝั่งเซิร์ฟเวอร์เท่านั้น ห้ามเผยแพร่)
- ที่เมนู Authentication → URL configuration:
  - เพิ่ม Production Domain (ของ Vercel) และ Preview Domains (`https://*.vercel.app`) ลงใน Allowed Redirect URLs/Allowed URLs ให้ครบ

## 2) ตัวแปรสภาพแวดล้อม (Environment Variables)
ตั้งค่าใน Vercel Project Settings → Environment Variables (สำหรับ Production/Preview/Development ตามต้องการ)
- `DATABASE_URL` (จำเป็น) URL แบบ pooled/pgbouncer ของ Supabase สำหรับ production (พอร์ต 6543)
- `DIRECT_URL` (จำเป็น) URL แบบ direct connection ของ Supabase (พอร์ต 5432)
- `NEXT_PUBLIC_SUPABASE_URL` (จำเป็น) URL โปรเจกต์ Supabase (public)
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (จำเป็น) anon public key (public)
- `SUPABASE_SERVICE_ROLE_KEY` (จำเป็น) service role key (secret/ใช้ฝั่ง server เท่านั้น)

หมายเหตุ:
- ตัวแปรที่ขึ้นต้นด้วย `NEXT_PUBLIC_` จะส่งไปถึงฝั่งเบราว์เซอร์ได้ ให้ใส่เฉพาะค่าที่เปิดเผยได้เท่านั้น
- โปรเจกต์นี้อ้างอิง env เหล่านี้ในโค้ด เช่น `src/utils/supabase/*`, `src/lib/prisma.ts`, `src/middleware.ts`

## 3) เตรียมฐานข้อมูล (ครั้งแรก)
สำหรับการ sync schema ให้ตรงกับ Supabase (ทำจากเครื่องนักพัฒนา):
1) สร้างไฟล์ `.env` ในเครื่อง (อย่า commit) แล้วใส่ค่าตามตัวอย่างท้ายไฟล์นี้
2) รันคำสั่งเพื่อ sync schema:
   - `npm install` (หรือ `bun install`)
   - `npx prisma db push`

หมายเหตุ: การแก้ schema ใน production ควรพิจารณา backup/PITR ของ Supabase ก่อนทุกครั้ง

## 4) เชื่อมต่อ Repo กับ Vercel
1) เข้า https://vercel.com → New Project → Import Git Repository (เลือก repo นี้)
2) Vercel จะตรวจจับว่าเป็น Next.js อัตโนมัติ
3) Build & Install:
   - Install Command: ปล่อยค่าเริ่มต้น (`npm install`) หรือใช้ `bun install` ถ้าต้องการ
   - Build Command: `npm run build` (ค่าเริ่มต้นโปรเจกต์ใช้ Turbopack แล้ว) หากมีปัญหากับ Turbopack ให้แก้สคริปต์เป็น `next build`
   - Output: ให้ Vercel จัดการอัตโนมัติ (Next.js)
4) ตั้ง Node.js เป็น 20 หรือ 22 ใน Project Settings
5) ใส่ Environment Variables ตามข้อ (2)
6) กด Deploy

## 5) เวิร์กโฟลว์การ Deploy
- ทุกครั้งที่ push ไปที่สาขา `main` จะสร้าง Production Deployment อัตโนมัติ
- ทุก Pull Request จะได้ Preview Deployment ของตนเอง
- Vercel จัดการ HTTPS และ CDN ให้โดยอัตโนมัติ

## 6) ตรวจสอบหลัง Deploy
- เปิดโฮมเพจของ Production URL
- ทดสอบหน้า protected เช่น `/projects` (ต้องล็อกอินผ่าน Supabase)
- ทดสอบ API หลัก เช่น `GET /api/projects`
- ตรวจสอบรูปภาพ/คอนเทนต์จาก Supabase โหลดได้ (CSP ใน `src/middleware.ts` อนุญาตโดเมน Supabase ไว้แล้ว)

## 7) Rollback/Recovery
- แอป (Vercel):
  - ไปที่แท็บ Deployments → เลือกเวอร์ชันก่อนหน้า → Promote/Revert เพื่อสลับกลับทันที
  - Vercel เก็บ history ของ Environment Variable สามารถย้อนกลับค่าได้
- ฐานข้อมูล (Supabase):
  - ใช้ Backups/PITR เพื่อกู้คืนกรณี schema/data มีปัญหา
  - หากแก้ schema แล้วต้องการย้อน ให้ปรับ schema กลับใน Prisma แล้วรัน `npx prisma db push` อีกครั้ง
- คอนฟิก/ความลับ:
  - เก็บสำเนาค่าก่อนหน้าไว้ใน Secret store ของแพลตฟอร์ม ทุกครั้งก่อนเปลี่ยนค่า

## 8) บันทึกเพิ่มเติม
- โปรเจกต์นี้ใช้ Next Image remote patterns ที่อัปเดตตาม `NEXT_PUBLIC_SUPABASE_URL` อัตโนมัติ (ดู `next.config.ts`)
- ใช้ connection pooling ของ Supabase ผ่าน `DATABASE_URL` (พอร์ต 6543) เหมาะกับ serverless/ฟังก์ชันของ Vercel
- Workflow ของ GitHub Pages (`.github/workflows/deploy.yml`) ไม่เหมาะกับแอป SSR/API ของ Next.js หากไม่ใช้ ควรปิด/ลบเพื่อหลีกเลี่ยงความสับสน

## ภาคผนวก: ตัวอย่างค่า .env (อย่า commit)
```
# Supabase Postgres
DATABASE_URL="postgresql://<user>.<ref>:<password>@aws-1-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://<user>.<ref>:<password>@aws-1-<region>.pooler.supabase.com:5432/postgres"

# Supabase Auth/Client (public)
NEXT_PUBLIC_SUPABASE_URL="https://<ref>.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="<anon-public-key>"

# Supabase Service Role (server-only)
SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"
```

— จบ —
