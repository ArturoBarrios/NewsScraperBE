import dotenv from 'dotenv';
dotenv.config(); // ✅ this MUST come before PrismaClient is created

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default prisma;