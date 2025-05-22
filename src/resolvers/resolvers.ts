import userResolvers from "./userResolvers";
import emailResolvers from "./emailResolvers";
import prisma from "../db/prismaClient";

export default {
  Query: {
    ...userResolvers.Query,
    articles: () => prisma.article.findMany({ orderBy: { date: "desc" } }),
    article: (_, { id }) => prisma.article.findUnique({ where: { id } }),
    parentArticles: async () =>
      prisma.parentArticle.findMany({
        include: { articles: true },
        orderBy: { createdAt: "desc" },
      }),
    parentArticle: (_, { id }) =>
      prisma.parentArticle.findUnique({
        where: { id },
        include: { articles: true },
      }),
  },
  Mutation: {
    ...userResolvers.Mutation,
    ...emailResolvers.Mutation,
    createArticle: async (
      _: unknown,
      args: {
        url: string;
        title: string;
        content: string;
        date: string;
      }
    ) => {
      const { url, title, content, date } = args;

      console.log("📦 DATABASE_URL is:", process.env.DATABASE_URL);
      console.log("Creating article with data:", { url, title, date, content });

      const createdArticle = await prisma.article.create({
        data: {
          url,
          title,
          content,
          date: new Date(date),
        },
      });

      console.log("✅ Article created:", createdArticle);

      return createdArticle;
    },
  },
};
