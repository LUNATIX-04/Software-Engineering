อัพเดทพวก
- เชื่อมต่อกับ Backend-Frontend ได้เกือบครบหมดมั้งนะ แต่มีบัคเล็กน้อยบางจุดพวก Frontend ยังแก้ไม่หมด กับ Task Info คิดว่าจะปรับเพิ่ม
- แนะนำให้ clone git ใหม่เลยเพราะเปลี่ยนเยอะเกินมาก

## วิธีสร้าง ดึง Project นี้มา

1. ตั้ง Folder สักทีเปิด VScode ให้ไป Folder นั้นแล้วเปิด Terminal (VScode)

2. พิมพ์คำสั่ง "git clone https://github.com/LUNATIX-04/Software-Engineering.git"

3. จากนั้นให้ VScode กด Open Folder เข้าตัวที่ clone มาคือ Software-Engineering ที่โหลดมา 

4. ถ้าไม่มี Bun ให้ติดตั้งก่อน ถ้ามีใช้คำสั่ง bun install

5. จากนั้นพิมพ์ bun prisma generate

6. ให้สร้างไฟล์ .env แล้วใส่ตามนี้เลย (สร้างให้อยู่ที่เดียวกับ src,public อื่นๆ หรือคืออยู่ใน Software Engineering เลย)

DATABASE_URL="postgresql://postgres.xtvlrmbyndgxmoltprtp:u1Sknfrvtk30RBAN@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

DIRECT_URL="postgresql://postgres.xtvlrmbyndgxmoltprtp:u1Sknfrvtk30RBAN@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres"

NEXT_PUBLIC_SUPABASE_URL="https://xtvlrmbyndgxmoltprtp.supabase.co"

NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0dmxybWJ5bmRneG1vbHRwcnRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5NDY0MzksImV4cCI6MjA3NTUyMjQzOX0.3S33QczAJxBZ6XJtXGFIdxP_k1G0Z9lJ2AfCU22cFas"

SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0dmxybWJ5bmRneG1vbHRwcnRwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTk0NjQzOSwiZXhwIjoyMDc1NTIyNDM5fQ.iIbPa8UXl3myp-2YmwwpVdFW8VlsRdlZm26lrVaNGFM"

7. bun dev เข้า Web ใช้งานได้เลย พยายามเล่นแบบเต็มจอก่อนเพราะมีบาง UI น่าจะเละเทะเช่น Tasks

8. อันนี้ไม่มีอะไรทดสอบ invite link เฉยๆ สามารถกดนี้ได้ http://localhost:3000/invite/ff4aba99-ee0e-4c8c-8b39-25ce84c8ae74 เข้ามาแล้วจะเจอ ใส่ username ของproject นี้ ถ้ากด join คือเข้า project เลย (ถ้าไม่เคยสมัครจะไปหน้า sign in) พอเข้ามาน่าจะเจอ Project "Apple" ลองเล่นดูได้

## เวลาก่อนทำงานให้ใช้ (ดึงงานล่าสุดมาใช้)

git pull origin main

## ดึงงานจาก branch ที่สนใจ มาทับ branch ในเครื่องที่เราทำอยู่

git fetch origin E2E_Test

git reset --hard origin/E2E_Test

## วิธีรัน Testing

bunx cypress open

## ตอนแรกตั้ง prisma (หลังแก้ prisma อะไรก็ตามใช้คำสั่งนี้ไว้)

bunx prisma generate

## วิธี run เปิด web

bun dev

## เวลาจะพักแล้ว ส่งงานขึ้น main
[ดูว่ามีใครอัพงานไหม. ถ้าไม่มีก็จัดไป]

git status

git add . //ที่เราเปลี่ยนอัพลงไป commit อันเดิมไม่เปลี่ยน

git commit -m "เพิ่มอะไรใหม่"

git push origin main //อัพลง main branch

## เวลาเพิ่มใน schema เช่น อัพเดท column เพิ่ม ใช้

npx prisma db push

##-- วิธีติดตั้ง project (install ASAP)--
Method 1

[First clone this project on your vscode]

git clone https://github.com/LUNATIX-04/Software-Engineering.git

[Open this repository and run command]

## ติดตั้ง Bun

curl -fsSL https://bun.sh/install | bash

## ใช้ Bun ติดตั้ง

bun install

## Role users

Head: ปฏิบัติงาน, ยืนยันงาน, มอบหมายงาน, ตรวจสอบงาน
Member: ปฏิบัติงานและยืนยันการเสร็จสินของงานที่ได้รับมอบหมาย

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
