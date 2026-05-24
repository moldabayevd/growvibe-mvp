import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const sessions = [
  {
    publicId: '1',
    city: 'Астана',
    date: '2026-06-06',
    day: 'Суббота',
    time: '11:00–14:00',
    duration: '3 часа',
    format: 'Суббота',
    location: 'Кафе, адрес после оплаты',
    seatsTotal: 20,
    seatsMin: 15,
    priceKzt: 50000,
  },
  {
    publicId: '2',
    city: 'Астана',
    date: '2026-06-10',
    day: 'Среда',
    time: '19:00–22:00',
    duration: '3 часа',
    format: 'Вечерняя группа',
    location: 'Кафе, адрес после оплаты',
    seatsTotal: 20,
    seatsMin: 15,
    priceKzt: 50000,
  },
  {
    publicId: '3',
    city: 'Астана',
    date: '2026-06-15',
    day: 'Воскресенье',
    time: '12:00–15:00',
    duration: '3 часа',
    format: 'Воскресенье',
    location: 'Коворкинг, адрес после оплаты',
    seatsTotal: 20,
    seatsMin: 15,
    priceKzt: 50000,
  },
  {
    publicId: '4',
    city: 'Алматы',
    date: '2026-06-07',
    day: 'Воскресенье',
    time: '12:00–15:00',
    duration: '3 часа',
    format: 'Воскресенье',
    location: 'Кафе, адрес после оплаты',
    seatsTotal: 20,
    seatsMin: 15,
    priceKzt: 50000,
  },
  {
    publicId: '5',
    city: 'Алматы',
    date: '2026-06-12',
    day: 'Пятница',
    time: '19:00–22:00',
    duration: '3 часа',
    format: 'Вечерняя группа',
    location: 'Кафе, адрес после оплаты',
    seatsTotal: 20,
    seatsMin: 15,
    priceKzt: 50000,
  },
]

for (const session of sessions) {
  await prisma.trainingSession.upsert({
    where: { publicId: session.publicId },
    update: {
      ...session,
      date: new Date(`${session.date}T00:00:00.000Z`),
    },
    create: {
      ...session,
      date: new Date(`${session.date}T00:00:00.000Z`),
    },
  })
}

await prisma.$disconnect()
console.log(`Seeded ${sessions.length} sessions`)
