import prisma from "../db/prismaClient";
import jwt from 'jsonwebtoken'


import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { Buffer } from "buffer";
import { randomUUID } from "crypto";

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret'

// Configure AWS SDK (use real env values in production)
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const S3_BUCKET = process.env.S3_BUCKET;
const CLOUDFRONT_URL = process.env.CLOUDFRONT_URL;

const userResolvers = {
  User: {
    id: (parent: any) => parent.id, 
  },
  Query: {
    async user(_: any, { id }: { id: string }) {
      return await prisma.user.findUnique({
        where: { id },
      });
    },
    async users(_: any, __: any, context: any) {
      return await prisma.user.findMany({       
      })
    },    
    async me(_: any, args: {  }, context: any) {
      const token = context.req.cookies.token;
      if (!token) {
        return null;
      }
    
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId }
            
            
        });
    
        return user;
      } catch (error) {
        console.error("[me] Error:", error);
        return null;
      }
    }
  },    
  Mutation: {
    async signin(_: any, { email, password }: { email: string; password: string }, context: any) {
      try {
        const user = await prisma.user.findUnique({ where: { email } })
        console.log("signin....... with user: ", user)
        if (!user || user.password !== password) {
          throw new Error("Invalid credentials")
        }
        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' })
        context.res.cookie('token', token, {
          httpOnly: true,
          secure: process.env.ENV === 'production',
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        })

console.log("signin....... with token: ", token)
        return user
      } catch (err) {
        console.error("[signin] Error:", err)
        throw new Error("Signin failed")
      }
    },
    logout(_: any, __: any, context: any) {
      try {
        context.res.clearCookie('token', {
          httpOnly: true,
          secure: process.env.ENV === 'production',
          sameSite: 'lax',
          path: '/',
        })
        return true
      } catch (err) {
        console.error("[logout] Error:", err)
        return false
      }
    },    
    async createUser(
      _: any,
      args: { name: string; email: string; phone: string; password: string }
    ) {
      try {
        const newUser = await prisma.user.create({
          data: {
            name: args.name,            
            email: args.email,
            phone: args.phone,
            password: args.password,
          },
        });
        return newUser;
      } catch (error) {
        console.error("[createUser] Error:", error);
        return null;
      }
    },


    

    async updateUser(
      _: any,
      args: { id: string; name?: string; email?: string }
    ) {
      try {
        const updatedUser = await prisma.user.update({
          where: { id: args.id },
          data: {
            name: args.name ?? undefined,
            email: args.email ?? undefined,
          },
        });
        return updatedUser;
      } catch (error) {
        console.error("[updateUser] Error:", error);
        return null;
      }
    },

    async deleteUser(_: any, { id }: { id: string }) {
      try {
        await prisma.user.delete({ where: { id } });
        return true;
      } catch (error) {
        console.error("[deleteUser] Error:", error);
        return false;
      }
    },

    async findPlate(_, { plate }, { prisma }) {
    const existing = await prisma.plate.findFirst({
      where: {
        plate: plate.toLowerCase()
      }
    });

    return existing; 
  },



  Mutation: {
  async createPlate(_, { plate, imageUrl }, { prisma }) {
    return await prisma.plate.create({
      data: {
        plate: plate.toLowerCase(),
        imageUrl: imageUrl || null
      }
    });
  }
},

async storePlate(_, { imageBase64 }) {
      console.log("Received base64 image with length:", imageBase64.length);
  // Simulate delay and fake URL
  return `https://plate-images-1.s3.us-east-2.amazonaws.com/plate-image.jpeg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIAU6QHKYXBIFFE3YLB%2F20250510%2Fus-east-2%2Fs3%2Faws4_request&X-Amz-Date=20250510T184314Z&X-Amz-Expires=300&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEAMaCXVzLWVhc3QtMiJIMEYCIQDuyEqDOAR%2FqsRu%2FSuiqm3yxazf5PWfg4D8OKYoL8Et2AIhAKtAUAOa2rp4hc4TBQLCRKBU2HJJxNuZINDgX8Q1j2D8Kt8CCKz%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEQABoMMzQwMzkxNTQ0MjU4IgwO3ij309k%2FuEYWvo0qswIQjCpPvDkTrXImGy%2FSsSIRN2Xhnxo7BwIQvDNf3OmMF2Tkch2M2QvVWcP0JAwbKCVMD8kLgnGPBLuvh4axZGL6uE%2ByNnmCp91FSrCHS7e4Rpq0TmqUrmPuu82Hhn3QmARpsD7zKbPTOpwsiaP4J5QT2D4zB2BYCGuVOeF8Qh6psypvLYtnUIUxXfpJuEoSY5mcyLJ2vYuMDBsTJKLCpa857Z3jgLIo3ohG2CAaIKK8iFT79ERQ8rxRNHT1HUYPJJEdKe6WFcn%2Bw6xwdIbxvKgB5BLy3xDxDW5SVmxYA38Q7nneqi7kX0bairW3oJ273qNHe4HANSQkYCNe9VG%2F9j9kgLJSbuhl%2BhEtb%2BN0LkaAYDADBJGO67q%2BGt%2FhlMe7BwqHg7dn0S4leiAgi8u1zE2W5kGIMJy8%2FsAGOqwC2XP5PqnFHe3%2BeLJsdc7UXCT6IKuKcZAG9GL%2FrHc4ezCaTT0hwpFrOD%2B9ytxU%2FyR1ODYqLiOBttgpDDdShUC1JeGtpgLXOAysYDRqWRNk3jUb2H0d%2FlK97mzXBS6muO8SpJJZHFNItIvZqdcTNwxdzczZu2ub1Mq3BS%2BlFV3FwEf0fCL%2FvLygXreAyF9UA7uEgGvCwP3Don1u54Z0Al1aMvkGv2utjNyEDRKWaeKE%2BJcdEeu%2F5rxQTvblVeDqB7ev5tCcsEXKMEGqQsgAfOszoFECTLCAZx3KEuKadrNo9Znuk%2FsaqqUch1J1bTH%2Fvsxe2RmjyI0n%2BE%2FLn3FvshzYyU6%2Fi6h5KHUMayavrp69qDjRkBgNHmiMAv1Fx3NqtER2ADKvvG6h6QR7I6nB&X-Amz-Signature=218b69c881a8cab5fc2d77b36684c315d114acdd58651de0bd52247a01e6f5f7&X-Amz-SignedHeaders=host&response-content-disposition=inline`;

    
  },


    async createOrder(
      _: any,
      args: { order: string; plateId?: string; userId?: string },
      context: any
    ) {
      try {
        const newOrder = await prisma.order.create({
          data: {
            price: "0.00", 
            ...(args.userId && { user: { connect: { id: args.userId } } }),
            ...(args.plateId && { plate: { connect: { id: args.plateId } } }),
          },
          include: {
            plate: true,
          },
        });
    
        return newOrder;
      } catch (error) {
        console.error("[createOrder] Error:", error);
        throw new Error("Failed to create order");
      }
    }
    
    
    
  },
};

export default userResolvers;
