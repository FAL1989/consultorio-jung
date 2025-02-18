#!/bin/bash

# Ative o serviço Secret Manager
gcloud services enable secretmanager.googleapis.com

# Crie os segredos (execute um por um, substituindo os valores)
echo "SUA_CHAVE_OPENAI" | gcloud secrets create mindfuljung-openai-key --data-file=-
echo "SUA_CHAVE_PINECONE" | gcloud secrets create mindfuljung-pinecone-key --data-file=-
echo "SEU_HOST_PINECONE" | gcloud secrets create mindfuljung-pinecone-host --data-file=-

# Dê permissão para o Cloud Run acessar os segredos
gcloud secrets add-iam-policy-binding mindfuljung-openai-key \
    --member="serviceAccount:411891972932-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding mindfuljung-pinecone-key \
    --member="serviceAccount:411891972932-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding mindfuljung-pinecone-host \
    --member="serviceAccount:411891972932-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor" 