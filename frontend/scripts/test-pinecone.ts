import { PineconeClient } from '@pinecone-database/pinecone';

async function testPineconeConnection() {
  try {
    const pinecone = new PineconeClient();
    
    await pinecone.init({
      environment: process.env.PINECONE_ENVIRONMENT!,
      apiKey: process.env.PINECONE_API_KEY!,
    });

    const INDEX_NAME = 'jung-knowledge';

    // Lista os índices existentes
    const indexes = await pinecone.listIndexes();
    
    console.log('Conexão com Pinecone estabelecida com sucesso!');
    console.log('Índices disponíveis:', indexes);
    
    // Cria o índice se não existir
    if (!indexes.includes(INDEX_NAME)) {
      console.log(`Criando índice ${INDEX_NAME}...`);
      await pinecone.createIndex({
        name: INDEX_NAME,
        dimension: 1536,
        metric: 'cosine',
        spec: {
          serverless: {
            cloud: 'gcp',
            region: 'us-central1'
          }
        }
      });
      console.log('Índice criado com sucesso!');
    } else {
      console.log(`Índice ${INDEX_NAME} já existe!`);
    }

  } catch (error) {
    console.error('Erro ao conectar com Pinecone:', error);
    process.exit(1);
  }
}

testPineconeConnection(); 