import slugify from 'slugify'
import axios from 'axios'
import prisma from '../db/prismaClient.js'

export async function processIncomingArticle({ url, title, content, date }) {
  console.log('📥 Processing article:', { url, title, content, date })

  // Removed the old unique-url-based lookup
  const { aiTitle, aiSummary } = await getAIEnhancements(title, content)

  let parent = await findMatchingParent(content)
  if (!parent) {
    parent = await createNewParentArticle(aiTitle, aiSummary)
  }

  return await createArticle({ url, title, content, date, parentId: parent.id })
}

async function createNewParentArticle(title, summary) {
  const slug = slugify(title, { lower: true, strict: true })

  const parent = await prisma.parentArticle.create({
    data: {
      title,
      summary,
      slug,
      imageUrl: null,
    },
  })

  console.log('🆕 Created new ParentArticle:', parent.id)
  return parent
}



async function findMatchingParent(content) {
  try {
    console.log('🔍 Searching for matching parent article...')
    const parentCandidates = await prisma.parentArticle.findMany({
      select: {   
        id: true,
        slug: true,
        summary: true,
      },
    })

    const res = await axios.post('http://localhost:8000/find-similar-story', {
      content,
      candidates: parentCandidates,
    })
    console.log('🤖 AI similarity check response:', res.data)

    const matchedSlug = res.data?.matchedSlug
    console.log('🔗 Matched slug:', matchedSlug)
    if (matchedSlug && matchedSlug !== 'NONE') {
      const parent = await prisma.parentArticle.findUnique({ where: { slug: matchedSlug } })
      if (parent) {
        console.log('🔗 Matched existing parent by AI:', parent.slug)
        return parent
      }
    }

    return null
  } catch (err) {
    console.error('🛑 AI similarity check failed:', err.message)
    return null
  }
}


async function getAIEnhancements(title, content) {
  let aiTitle = title
  let aiSummary = ''

  try {
    const [titleRes, summaryRes] = await Promise.all([
      requestSuggestedTitle(content),
      requestSuggestedSummary(content)
    ])

    aiTitle = titleRes || title
    aiSummary = summaryRes || ''
  } catch (err) {
    console.warn('⚠️ AI service failed, using fallback title and empty summary')
  }

  return { aiTitle, aiSummary }
}

async function requestSuggestedTitle(content) {
  try {
    console.log('🤖 Requesting AI for title suggestion with content...' + content )
    const res = await axios.post('http://localhost:8000/suggest-title', { content })
    console.log('🤖 AI suggested title:', res.data?.title)
    return res.data?.title
  } catch (err) {
    console.error('🚫 Failed to fetch suggested title:', err.message)
    return null
  }
}

async function requestSuggestedSummary(content) {
  try {
    const res = await axios.post('http://localhost:8000/suggest-summary', { content })
    console.log('🤖 AI suggested summary:', res.data?.summary)
    return res.data?.summary
  } catch (err) {
    console.error('🚫 Failed to fetch suggested summary:', err.message)
    return null
  }
}



async function createArticle({ url, title, content, date, parentId }) {
  const article = await prisma.article.create({
    data: {
      url,
      title,
      content,
      date: new Date(date),
      parentArticleId: parentId,
    },
  })
  console.log('✅ Article stored with parent:', article.id)
  return article
}
