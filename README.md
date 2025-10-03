เกียวกับ schema ของ mySQL magic shop สามารถไปได้ที่ MySQL/MAGICSHOP_SCHEMA.sql 


อัพเดทพวก
- ทำหน้า Homepage, Projects (Frontend) ยังมี bug เล็กๆน้อยอยู่
- ทำหน้า Edit, Create ของ Project แต่ว่า bug ยังเยอะ กับ clean code ยังไม่เสร็จ

## วิธี install ASAP

# PostCss AutoPrefixer
npm install -D postcss autoprefixer

# UI Components
npm install @radix-ui/react-slot @radix-ui/react-dialog @radix-ui/react-dropdown-menu 
npm install class-variance-authority tailwind-merge
npm install lucide-react
npx shadcn@lastest init
npx shadcn@lastest add button input textarea select form dialog dropdown-menu popover calendar alert-dialog card calendar


# Data Fetching
npm install @tanstack/react-query axios

# ElysiaJS (Backend Framework)
npm install elysia @elysiajs/cors @elysiajs/static socket.io socket.io-client

# Prisma ORM + PostgreSQL
npm install @prisma/client
npm install prisma --save-dev
npx prisma init

# Authentication
npm install next-auth

# Cloud Storage (Supabase)
npm install @supabase/supabase-js

# Time & Date
npm install dayjs

# Unit / Integration Test
npm install -D jest jest-environment-jsdom @testing-library/react @testing-library/dom @testing-library/jest-dom ts-node @types/jest
npm audit fix --force
npm init jest@latest
กด yes yes jsdom yes b8 yes

# E2E Testing
npm install playwright --save-dev
npx playwright install

# Email Domain Check (???)
npm install dns bcrypt
npm audit fix --force

## วิธีติดตั้ง project
Method 1

[First clone this project on your vscode]

git clone https://github.com/i-don-t-sleep/Magic-Shop

[Open this repository and run command]

## Role users

Head: ปฏิบัติงาน, ยืนยันงาน, มอบหมายงาน, ตรวจสอบงาน
Member: ปฏิบัติงานและยืนยันการเสร็จสินของงานที่ได้รับมอบหมาย

## เวลาก่อนทำงานให้ใช้ (ดึงงานล่าสุดมาใช้)

git pull origin main

## เวลาจะพักแล้ว ส่งงานขึ้น main
[ดูว่ามีใครอัพงานไหม. ถ้าไม่มีก็จัดไป]

git status

git add . //ที่เราเปลี่ยนอัพลงไป commit อันเดิมไม่เปลี่ยน

git commit -m "เพิ่มอะไรใหม่"

git push origin main //อัพลง main branch

-จบ-

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.