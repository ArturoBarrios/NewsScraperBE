// src/index.ts
import dotenv2 from "dotenv";
import express2 from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import gql from "graphql-tag";
import { ApolloServer } from "@apollo/server";
import { buildSubgraphSchema } from "@apollo/subgraph";
import { expressMiddleware } from "@apollo/server/express4";

// src/db/prismaClient.ts
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
dotenv.config();
var prisma = new PrismaClient();
var prismaClient_default = prisma;

// src/resolvers/userResolvers.ts
import jwt from "jsonwebtoken";
import { S3Client } from "@aws-sdk/client-s3";
var JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
var s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});
var S3_BUCKET = process.env.S3_BUCKET;
var CLOUDFRONT_URL = process.env.CLOUDFRONT_URL;
var userResolvers = {
  User: {
    id: (parent) => parent.id
  },
  Query: {
    async user(_, { id }) {
      return await prismaClient_default.user.findUnique({
        where: { id }
      });
    },
    async users(_, __, context) {
      return await prismaClient_default.user.findMany({});
    },
    async me(_, args, context) {
      const token = context.req.cookies.token;
      if (!token) {
        return null;
      }
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await prismaClient_default.user.findUnique({
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
    async signin(_, { email, password }, context) {
      try {
        const user = await prismaClient_default.user.findUnique({ where: { email } });
        console.log("signin....... with user: ", user);
        if (!user || user.password !== password) {
          throw new Error("Invalid credentials");
        }
        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });
        context.res.cookie("token", token, {
          httpOnly: true,
          secure: process.env.ENV === "production",
          sameSite: "lax",
          maxAge: 7 * 24 * 60 * 60 * 1e3
          // 7 days
        });
        console.log("signin....... with token: ", token);
        return user;
      } catch (err) {
        console.error("[signin] Error:", err);
        throw new Error("Signin failed");
      }
    },
    logout(_, __, context) {
      try {
        context.res.clearCookie("token", {
          httpOnly: true,
          secure: process.env.ENV === "production",
          sameSite: "lax",
          path: "/"
        });
        return true;
      } catch (err) {
        console.error("[logout] Error:", err);
        return false;
      }
    },
    async createUser(_, args) {
      try {
        const newUser = await prismaClient_default.user.create({
          data: {
            name: args.name,
            email: args.email,
            phone: args.phone,
            password: args.password
          }
        });
        return newUser;
      } catch (error) {
        console.error("[createUser] Error:", error);
        return null;
      }
    },
    async updateUser(_, args) {
      try {
        const updatedUser = await prismaClient_default.user.update({
          where: { id: args.id },
          data: {
            name: args.name ?? void 0,
            email: args.email ?? void 0
          }
        });
        return updatedUser;
      } catch (error) {
        console.error("[updateUser] Error:", error);
        return null;
      }
    },
    async deleteUser(_, { id }) {
      try {
        await prismaClient_default.user.delete({ where: { id } });
        return true;
      } catch (error) {
        console.error("[deleteUser] Error:", error);
        return false;
      }
    },
    async findPlate(_, { plate }, { prisma: prisma2 }) {
      const existing = await prisma2.plate.findFirst({
        where: {
          plate: plate.toLowerCase()
        }
      });
      return existing;
    },
    Mutation: {
      async createPlate(_, { plate, imageUrl }, { prisma: prisma2 }) {
        return await prisma2.plate.create({
          data: {
            plate: plate.toLowerCase(),
            imageUrl: imageUrl || null
          }
        });
      }
    },
    async storePlate(_, { imageBase64 }) {
      console.log("Received base64 image with length:", imageBase64.length);
      return `https://plate-images-1.s3.us-east-2.amazonaws.com/plate-image.jpeg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIAU6QHKYXBIFFE3YLB%2F20250510%2Fus-east-2%2Fs3%2Faws4_request&X-Amz-Date=20250510T184314Z&X-Amz-Expires=300&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEAMaCXVzLWVhc3QtMiJIMEYCIQDuyEqDOAR%2FqsRu%2FSuiqm3yxazf5PWfg4D8OKYoL8Et2AIhAKtAUAOa2rp4hc4TBQLCRKBU2HJJxNuZINDgX8Q1j2D8Kt8CCKz%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEQABoMMzQwMzkxNTQ0MjU4IgwO3ij309k%2FuEYWvo0qswIQjCpPvDkTrXImGy%2FSsSIRN2Xhnxo7BwIQvDNf3OmMF2Tkch2M2QvVWcP0JAwbKCVMD8kLgnGPBLuvh4axZGL6uE%2ByNnmCp91FSrCHS7e4Rpq0TmqUrmPuu82Hhn3QmARpsD7zKbPTOpwsiaP4J5QT2D4zB2BYCGuVOeF8Qh6psypvLYtnUIUxXfpJuEoSY5mcyLJ2vYuMDBsTJKLCpa857Z3jgLIo3ohG2CAaIKK8iFT79ERQ8rxRNHT1HUYPJJEdKe6WFcn%2Bw6xwdIbxvKgB5BLy3xDxDW5SVmxYA38Q7nneqi7kX0bairW3oJ273qNHe4HANSQkYCNe9VG%2F9j9kgLJSbuhl%2BhEtb%2BN0LkaAYDADBJGO67q%2BGt%2FhlMe7BwqHg7dn0S4leiAgi8u1zE2W5kGIMJy8%2FsAGOqwC2XP5PqnFHe3%2BeLJsdc7UXCT6IKuKcZAG9GL%2FrHc4ezCaTT0hwpFrOD%2B9ytxU%2FyR1ODYqLiOBttgpDDdShUC1JeGtpgLXOAysYDRqWRNk3jUb2H0d%2FlK97mzXBS6muO8SpJJZHFNItIvZqdcTNwxdzczZu2ub1Mq3BS%2BlFV3FwEf0fCL%2FvLygXreAyF9UA7uEgGvCwP3Don1u54Z0Al1aMvkGv2utjNyEDRKWaeKE%2BJcdEeu%2F5rxQTvblVeDqB7ev5tCcsEXKMEGqQsgAfOszoFECTLCAZx3KEuKadrNo9Znuk%2FsaqqUch1J1bTH%2Fvsxe2RmjyI0n%2BE%2FLn3FvshzYyU6%2Fi6h5KHUMayavrp69qDjRkBgNHmiMAv1Fx3NqtER2ADKvvG6h6QR7I6nB&X-Amz-Signature=218b69c881a8cab5fc2d77b36684c315d114acdd58651de0bd52247a01e6f5f7&X-Amz-SignedHeaders=host&response-content-disposition=inline`;
    },
    async createOrder(_, args, context) {
      try {
        const newOrder = await prismaClient_default.order.create({
          data: {
            price: "0.00",
            ...args.userId && { user: { connect: { id: args.userId } } },
            ...args.plateId && { plate: { connect: { id: args.plateId } } }
          },
          include: {
            plate: true
          }
        });
        return newOrder;
      } catch (error) {
        console.error("[createOrder] Error:", error);
        throw new Error("Failed to create order");
      }
    }
  }
};
var userResolvers_default = userResolvers;

// src/resolvers/emailResolvers.ts
import { Resend } from "resend";
var emailResolvers = {
  Mutation: {
    sendTestEmail: async (_, { to }) => {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const { data, error } = await resend.emails.send({
        from: "PeacePad <onboarding@resend.dev>",
        to: [to],
        subject: "Welcome to PeacePad",
        html: `<p>Congrats on finding your quiet place \u{1F9D8}\u200D\u2642\uFE0F</p>`
      });
      if (error) {
        console.error("[Email Error]", error);
        return false;
      }
      console.log("[Email Sent]", data);
      return true;
    }
  }
};
var emailResolvers_default = emailResolvers;

// src/resolvers/resolvers.ts
var resolvers_default = {
  Query: {
    ...userResolvers_default.Query,
    articles: () => prismaClient_default.article.findMany({ orderBy: { date: "desc" } }),
    article: (_, { id }) => prismaClient_default.article.findUnique({ where: { id } }),
    parentArticles: async () => prismaClient_default.parentArticle.findMany({
      include: { articles: true },
      orderBy: { createdAt: "desc" }
    }),
    parentArticle: (_, { id }) => prismaClient_default.parentArticle.findUnique({
      where: { id },
      include: { articles: true }
    })
  },
  Mutation: {
    ...userResolvers_default.Mutation,
    ...emailResolvers_default.Mutation,
    createArticle: async (_, args) => {
      const { url, title, content, date } = args;
      console.log("\u{1F4E6} DATABASE_URL is:", process.env.DATABASE_URL);
      console.log("Creating article with data:", { url, title, date, content });
      const createdArticle = await prismaClient_default.article.create({
        data: {
          url,
          title,
          content,
          date: new Date(date)
        }
      });
      console.log("\u2705 Article created:", createdArticle);
      return createdArticle;
    }
  }
};

// src/index.ts
import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

// src/routes/scrapeProcessor.js
import express from "express";

// src/controllers/processScrapedArticle.js
import slugify from "slugify";
import axios from "axios";
async function processIncomingArticle({ url, title, content, date }) {
  console.log("\u{1F4E5} Processing article:", { url, title, content, date });
  const { aiTitle, aiSummary } = await getAIEnhancements(title, content);
  let parent = await findMatchingParent(content);
  if (!parent) {
    parent = await createNewParentArticle(aiTitle, aiSummary);
  }
  return await createArticle({ url, title, content, date, parentId: parent.id });
}
async function createNewParentArticle(title, summary) {
  const slug = slugify(title, { lower: true, strict: true });
  const parent = await prismaClient_default.parentArticle.create({
    data: {
      title,
      summary,
      slug,
      imageUrl: null
    }
  });
  console.log("\u{1F195} Created new ParentArticle:", parent.id);
  return parent;
}
async function findMatchingParent(content) {
  try {
    console.log("\u{1F50D} Searching for matching parent article...");
    const parentCandidates = await prismaClient_default.parentArticle.findMany({
      select: {
        id: true,
        slug: true,
        summary: true
      }
    });
    const res = await axios.post("http://localhost:8000/find-similar-story", {
      content,
      candidates: parentCandidates
    });
    console.log("\u{1F916} AI similarity check response:", res.data);
    const matchedSlug = res.data?.matchedSlug;
    console.log("\u{1F517} Matched slug:", matchedSlug);
    if (matchedSlug && matchedSlug !== "NONE") {
      const parent = await prismaClient_default.parentArticle.findUnique({ where: { slug: matchedSlug } });
      if (parent) {
        console.log("\u{1F517} Matched existing parent by AI:", parent.slug);
        return parent;
      }
    }
    return null;
  } catch (err) {
    console.error("\u{1F6D1} AI similarity check failed:", err.message);
    return null;
  }
}
async function getAIEnhancements(title, content) {
  let aiTitle = title;
  let aiSummary = "";
  try {
    const [titleRes, summaryRes] = await Promise.all([
      requestSuggestedTitle(content),
      requestSuggestedSummary(content)
    ]);
    aiTitle = titleRes || title;
    aiSummary = summaryRes || "";
  } catch (err) {
    console.warn("\u26A0\uFE0F AI service failed, using fallback title and empty summary");
  }
  return { aiTitle, aiSummary };
}
async function requestSuggestedTitle(content) {
  try {
    console.log("\u{1F916} Requesting AI for title suggestion with content..." + content);
    const res = await axios.post("http://localhost:8000/suggest-title", { content });
    console.log("\u{1F916} AI suggested title:", res.data?.title);
    return res.data?.title;
  } catch (err) {
    console.error("\u{1F6AB} Failed to fetch suggested title:", err.message);
    return null;
  }
}
async function requestSuggestedSummary(content) {
  try {
    const res = await axios.post("http://localhost:8000/suggest-summary", { content });
    console.log("\u{1F916} AI suggested summary:", res.data?.summary);
    return res.data?.summary;
  } catch (err) {
    console.error("\u{1F6AB} Failed to fetch suggested summary:", err.message);
    return null;
  }
}
async function createArticle({ url, title, content, date, parentId }) {
  const article = await prismaClient_default.article.create({
    data: {
      url,
      title,
      content,
      date: new Date(date),
      parentArticleId: parentId
    }
  });
  console.log("\u2705 Article stored with parent:", article.id);
  return article;
}

// src/routes/scrapeProcessor.js
var router = express.Router();
router.post("/processScrapedNewsArticle", async (req, res) => {
  try {
    const result = await processIncomingArticle(req.body);
    console.log("\u2705 Processed article:", result);
    res.json({ status: "ok", data: result });
  } catch (err) {
    console.error("\u274C Error processing scraped article:", err);
    res.status(500).json({ error: "Failed to process article" });
  }
});
var scrapeProcessor_default = router;

// src/index.ts
dotenv2.config();
var __filename2 = fileURLToPath(import.meta.url);
var __dirname2 = dirname(__filename2);
var PORT = process.env.PORT || 4e3;
var app = express2();
app.use(cors({ origin: true, credentials: true }));
app.use(express2.json());
app.use(cookieParser());
var schemaPath = resolve(__dirname2, "schema.graphql");
console.log("\u{1F4C4} Loading schema from:", schemaPath);
var typeDefs = gql(readFileSync(schemaPath, "utf-8"));
var server = new ApolloServer({
  schema: buildSubgraphSchema({ typeDefs, resolvers: resolvers_default })
});
(async () => {
  await server.start();
  app.use(
    "/graphql",
    expressMiddleware(server, {
      context: async ({ req, res }) => ({ req, res })
    })
  );
  app.use(scrapeProcessor_default);
  app.listen(PORT, () => {
    console.log(`\u{1F680} Server ready at http://localhost:${PORT}/graphql`);
  });
})();
//# sourceMappingURL=index.js.map