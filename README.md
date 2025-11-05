อัพเดทพวก
- อัพเกือบทุกหน้า

## เวลาก่อนทำงานให้ใช้ (ดึงงานล่าสุดมาใช้)

git pull origin main

## ดึงงานจาก branch ที่สนใจ มาทับ branch ในเครื่องที่เราทำอยู่

git fetch origin E2E_Test

git reset --hard origin/E2E_Test

## วิธีรัน Testing

bunx cypress open

## ตอนแรกตั้ง prisma

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
