import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { promises as fs } from "fs";
import { createReadStream } from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import type { ReadStream } from "fs";

// Configuração da OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * POST /api/transcribe
 * Recebe um arquivo de áudio via FormData e retorna o texto transcrito.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
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
      const response = await openai.audio.transcriptions.create({
        file: createReadStream(tempFilePath) as ReadStream,
        model: "whisper-1",
        language: "pt",
      });

      // Apaga o arquivo temporário
      await fs.unlink(tempFilePath);

      // Retorna a transcrição para o cliente
      return NextResponse.json({ transcript: response.text });
    } catch (error) {
      // Tenta apagar o arquivo temporário em caso de erro
      try {
        await fs.unlink(tempFilePath);
      } catch (unlinkError) {
        console.error("Erro ao deletar arquivo temporário:", unlinkError);
      }

      throw error;
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error("Erro na transcrição:", error);
      return NextResponse.json(
        { error: error.message || "Erro interno do servidor" },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
} 