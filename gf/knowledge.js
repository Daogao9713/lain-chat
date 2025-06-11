'use strict';
const { ChromaClient } = require('chromadb');
const OpenAI = require('openai'); // 我们将直接使用 OpenAI 库
const dotenv = require('dotenv');

dotenv.config();

const client = new ChromaClient({ path: "http://localhost:8000" });
const COLLECTION_NAME = "lain_memory";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * 这是一个符合 ChromaDB IEmbeddingFunction 接口规范的自定义类。
 * 它有一个必须的 .generate() 方法。
 */
class CustomOpenAIEmbeddingFunction {
  constructor({ model = "text-embedding-3-small" } = {}) {
    this.model = model;
  }

  // ChromaDB 会调用这个 generate 方法，并传入一个需要向量化的文本数组
  async generate(texts) {
    try {
      const response = await openai.embeddings.create({
        model: this.model,
        input: texts.map(t => t.replace(/\n/g, " ")), // API 建议替换掉换行符
      });
      // 返回一个包含所有向量的数组
      return response.data.map((d) => d.embedding);
    } catch (error) {
      console.error('❌ OpenAI Embedding API Error:', error);
      // 如果出错，为每个文本返回一个空数组，ChromaDB可以处理这种情况
      return texts.map(() => []);
    }
  }
}

// 创建我们自定义的 embedder 实例
const embedder = new CustomOpenAIEmbeddingFunction();
let collection;

/**
 * 初始化知识库，获取或创建集合，并指定我们自定义的 embedding function
 */
async function initializeKnowledgeBase() {
  try {
    collection = await client.getOrCreateCollection({ 
      name: COLLECTION_NAME,
      embeddingFunction: embedder // 使用我们自己的 embedder
    });
    console.log(`✅ Knowledge base collection "${COLLECTION_NAME}" initialized with Custom OpenAI embedder.`);
    return collection;
  } catch (error) {
    console.error('❌ Failed to initialize knowledge base:', error);
    throw error;
  }
}

/**
 * 向知识库中添加一条记忆/文档
 */
async function addDocument({ id, text, metadata }) {
  if (!collection) await initializeKnowledgeBase();
  
  // 直接添加文档，ChromaDB 会自动调用我们 embedder 的 .generate() 方法
  await collection.add({
    ids: [id],
    metadatas: [metadata],
    documents: [text],
  });
  console.log(`[Knowledge] Document added: ${id}`);
}

/**
 * 从知识库中查询相关信息
 */
async function queryKnowledgeBase(queryText, nResults = 3) {
  if (!collection) await initializeKnowledgeBase();
  try {
    // 直接查询文本，ChromaDB 会自动处理向量转换
    const results = await collection.query({
      queryTexts: [queryText],
      nResults: nResults,
    });
    
    if (!results.documents || results.documents.length === 0 || results.documents[0].length === 0) {
      return "";
    }
    
    return results.documents[0].join('\n---\n');
  } catch(error) {
    console.error('❌ Error querying knowledge base:', error);
    return "（知识库检索时发生错误）";
  }
}

module.exports = {
  initializeKnowledgeBase,
  addDocument,
  queryKnowledgeBase,
};
