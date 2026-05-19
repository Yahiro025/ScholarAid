import { db } from './src/lib/db';

async function test() {
  try {
    const count = await db.scholarship.count();
    console.log('Scholarship count:', count);
    if (count > 0) {
      const first = await db.scholarship.findFirst();
      console.log('First scholarship:', first?.name);
    }
  } catch (e) {
    console.error('DB Error:', e);
  } finally {
    await db.$disconnect();
  }
}

test();
