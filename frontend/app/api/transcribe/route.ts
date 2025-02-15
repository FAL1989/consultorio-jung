import { NextRequest, NextResponse } from "next/server";
import { Configuration, OpenAIApi } from "openai";
import { promises as fs } from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

// Configuração da OpenAI
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

/**
 * POST /api/transcribe
 * Recebe um arquivo de áudio via FormData e retorna o texto transcrito.
 */
export async function POST(req: NextRequest) {
  try {
    // Extrai o arquivo de áudio do FormData
    const formData = await req.formData();
    const file = formData.get("audio") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Nenhum arquivo de áudio foi enviado." },
        { status: 400 }
      );
    }

    // Converte o File em Buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Salva temporariamente o arquivo no servidor
    const tempFilename = `temp-${uuidv4()}.webm`;
    const tempFilePath = path.join("/tmp", tempFilename);
    await fs.writeFile(tempFilePath, buffer);

    try {
      // Usa o endpoint de transcrição da OpenAI (Whisper)
      const response = await openai.createTranscription(
        fs.createReadStream(tempFilePath) as any,
        "whisper-1",
        undefined,
        undefined,
        0.8,
        "pt" // Definindo português como idioma padrão
      );

      // Apaga o arquivo temporário
      await fs.unlink(tempFilePath);

      // Retorna a transcrição para o cliente
      return NextResponse.json({ transcript: response.data.text });
    } catch (error: any) {
      // Tenta apagar o arquivo temporário em caso de erro
      try {
        await fs.unlink(tempFilePath);
      } catch (unlinkError) {
        console.error("Erro ao deletar arquivo temporário:", unlinkError);
      }

      throw error;
    }
  } catch (error: any) {
    console.error("Erro na transcrição:", error);
    return NextResponse.json(
      { error: error.message || "Erro interno do servidor" },
      { status: 500 }
    );
  }
} 