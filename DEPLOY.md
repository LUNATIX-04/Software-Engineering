# คู่มือ Deploy ขึ้น Vercel (Next.js + Supabase + Prisma)

โปรเจกต์นี้เป็น Next.js (App Router + API Routes) ใช้ฐานข้อมูล Supabase (PostgreSQL) และ Prisma  
ไฟล์นี้อธิบาย “เวิร์กโฟลว์จริง” ที่เราใช้ deploy ผ่าน **Vercel CLI เป็นหลัก** แล้วค่อยผูก Environment Variables จากไฟล์ `.env` ในเครื่องเข้าไปที่ Project บน Vercel

---

## ข้อควรระวังด้านความลับ (สำคัญมาก)

- ห้าม commit ค่าจริงของ `.env` ขึ้น Git. เก็บไว้เฉพาะในเครื่อง/Secret ของแพลตฟอร์มเท่านั้น (`.gitignore` ตั้งให้ละเว้น `.env*` แล้ว)
- หากเคย commit คีย์จริง (เช่น `SUPABASE_SERVICE_ROLE_KEY`) ให้ “หมุนคีย์ใหม่” (rotate) บน Supabase ทันที แล้วลบคีย์เก่าออกจากระบบ

---

## สิ่งที่ต้องมี

- บัญชี Vercel และสิทธิ์เข้าถึง GitHub repo นี้
- Supabase Project (ฐานข้อมูล PostgreSQL + Auth)
- Node.js 20/22 และ Bun (สำหรับ dev / build ท้องถิ่น)
- ติดตั้ง Vercel CLI (ใช้ผ่าน `npx vercel` หรือ `bunx vercel` ก็ได้)

---

## 1) ตั้งค่า Supabase และไฟล์ `.env` ในเครื่อง

1. สร้าง Supabase Project ใหม่ (หรือใช้ของเดิม)
2. คัดลอกค่าจาก Supabase ไปใส่ในไฟล์ `.env` ที่ root โปรเจกต์ (ดูตัวอย่างท้ายไฟล์นี้)
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon public key → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - service role key → `SUPABASE_SERVICE_ROLE_KEY` (ใช้ฝั่งเซิร์ฟเวอร์เท่านั้น)
   - Connection string (pgbouncer) → `DATABASE_URL`
   - Direct connection (5432) → `DIRECT_URL`
3. ที่เมนู **Authentication → URL configuration** บน Supabase:
   - เพิ่ม Production Domain ของ Vercel และ Preview Domains (`https://*.vercel.app`) ลงใน Allowed Redirect URLs / Allowed URLs

> หมายเหตุ: เก็บไฟล์ `.env` ไว้เฉพาะในเครื่อง ห้าม commit

---

## 2) เตรียม Database Schema (ครั้งแรก)

หากต้องการให้ schema ใน Supabase ตรงกับโปรเจกต์นี้:

```bash
bun install        # หรือ npm install
bunx prisma db push
```

คำสั่งนี้จะ sync `prisma/schema.prisma` ไปยัง Supabase (schema `public`)  
ถ้าต้องการใช้ dump ที่อยู่ในโฟลเดอร์ `database/` ดูคำอธิบายใน `README.md` หัวข้อ Database Setup

---

## 3) ลิงก์โปรเจกต์กับ Vercel ผ่าน CLI

จาก root โปรเจกต์:

```bash
npx vercel login        # ล็อกอินครั้งแรก (ถ้ายังไม่เคย)
npx vercel link         # ผูกโฟลเดอร์นี้กับ Project บน Vercel
```

- ถ้าใช้ครั้งแรก ให้เลือก “Create & link a new project”
- ถ้ามีโปรเจกต์อยู่แล้ว ให้เลือกโปรเจกต์เดิมของ ASAP

หลังจากนี้ โฟลเดอร์นี้จะถูกผูกกับ Project เดิมโดยเก็บค่าไว้ใน `.vercel/`

---

## 4) ตั้งค่า Environment Variables บน Vercel จาก `.env`

เวิร์กโฟลว์จริงที่ใช้คือ:

1. เก็บค่าทั้งหมดไว้ใน `.env` ของเครื่อง (อิงจาก `.env.example`)
2. เปิดหน้า Project บน Vercel → **Settings → Environment Variables**
3. เพิ่มตัวแปรตาม `.env` ทีละตัว (copy value จากไฟล์ไปวาง) อย่างน้อยต้องมี:
   - `DATABASE_URL`
   - `DIRECT_URL`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

หากต้องการใช้ CLI แทน Dashboard สามารถใช้:

```bash
npx vercel env add DATABASE_URL
npx vercel env add DIRECT_URL
...
```

แล้ว CLI จะถามค่าที่ต้องการใส่ (ให้ copy จาก `.env` ในเครื่อง)

> หลังตั้งค่าแล้ว สามารถดึงค่ากลับลงเครื่องเพื่อ backup หรือ sync ได้ด้วย  
> `npx vercel env pull .env.vercel`

---

## 5) Deploy ด้วย Vercel CLI

หลังจากลิงก์โปรเจกต์และตั้งค่า Environment ครบแล้ว สามารถ deploy จากเครื่องได้เลย:

### 5.1 Preview Deployment

ใช้ทดสอบก่อนขึ้น production:

```bash
npx vercel
```

- คำสั่งนี้จะ build โปรเจกต์ด้วย config เดียวกับบน Vercel และสร้าง Preview URL (`https://<hash>.vercel.app`)
- เหมาะกับการเช็กว่าการเปลี่ยนแปลงล่าสุด build ผ่านและทำงานถูกต้อง

### 5.2 Production Deployment

เมื่อโค้ดบน branch `main` พร้อมแล้ว สามารถสร้าง production deployment จาก CLI:

```bash
npx vercel --prod
```

หรือจะใช้ workflow ของ Vercel ที่ deploy อัตโนมัติเมื่อ push ไปที่ `main` ก็ได้ (ทั้งสองแบบใช้ได้กับโปรเจกต์นี้)

---

## 6) ตรวจสอบหลัง Deploy

- เปิด Production URL (ดูได้จากหน้า Deployments ใน Vercel)
- ทดสอบ flow หลัก:
  - Login ด้วยบัญชีทดสอบใน README
  - เปิดหน้า `/projects`, `/projects/[projectId]/member`, `/projects/[projectId]/task` ฯลฯ
  - สร้าง/แก้ไข Project, Department, Task และลองส่ง Submission
- เช็กว่ารูปภาพ (จาก Supabase Storage) โหลดขึ้นถูกต้อง  
  CSP ใน `src/middleware.ts` ถูกตั้งค่าให้อนุญาตโดเมน Supabase ของโปรเจกต์นี้แล้ว

---

## 7) Rollback / Recovery

- **ฝั่งแอป (Vercel)**
  - ไปที่แท็บ **Deployments** ของโปรเจกต์ → เลือก deployment ก่อนหน้า → กด Promote / Rollback เพื่อสลับกลับ
  - Vercel เก็บ history ของ Environment Variables สามารถย้อนกลับค่าก่อนหน้าได้

- **ฝั่งฐานข้อมูล (Supabase)**
  - ใช้ Backups / PITR ของ Supabase เพื่อกู้คืนกรณีแก้ schema หรือ data แล้วมีปัญหา
  - หากต้องการย้อน schema ให้แก้ `prisma/schema.prisma` แล้วรัน `bunx prisma db push` อีกครั้ง

---

## 8) บันทึกเพิ่มเติม

- โปรเจกต์นี้ใช้ Next Image remote patterns ที่อัปเดตตาม `NEXT_PUBLIC_SUPABASE_URL` (ดู `next.config.ts`)
- ใช้ connection pooling ของ Supabase ผ่าน `DATABASE_URL` (พอร์ต 6543) ซึ่งเหมาะกับฟังก์ชัน serverless ของ Vercel
- Workflow ของ GitHub Pages (ถ้ามีไฟล์เก่าใน repo) ไม่เหมาะกับแอป SSR/API ของ Next.js

---

## ภาคผนวก: ตัวอย่างค่า `.env` (อย่า commit)

```bash
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
