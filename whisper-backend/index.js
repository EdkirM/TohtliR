const { execSync } = require('child_process');
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { OpenAI } = require('openai');

const app = express();
const port = 3000;


function convertToWav(inputPath, outputPath) {
  try {
    execSync(`ffmpeg -i "${inputPath}" -ar 16000 -ac 1 -f wav "${outputPath}"`);
    console.log('🎙 Conversión exitosa a WAV');
  } catch (error) {
    console.error('Error al convertir a WAV:', error);
    throw error;
  }
}



// Api
const openai = new OpenAI({
  apiKey: '',
});

app.use(cors());
app.use(express.json());

// Almacenamiento temporal
const upload = multer({ dest: 'uploads/' });

// Ruta principal para transcripción
app.post('/transcribe', upload.single('audio'), async (req, res) => {
  try {
    const shouldTranslate = req.query.translate === 'true';
    const targetLanguage = req.query.targetLanguage || 'en'; // idioma destino

    const tempPath = req.file.path;
    const originalName = req.file.originalname;
    const extension = path.extname(originalName) || '.m4a';
    const correctPath = tempPath + extension;
    fs.renameSync(tempPath, correctPath);

    const wavPath = correctPath.replace(extension, '.wav');
    convertToWav(correctPath, wavPath);

    // Paso 1: Transcripción con Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(wavPath),
      model: 'whisper-1',
      response_format: 'json',
    });

    const originalText = transcription.text;
    const detectedLanguage = transcription.language;

    let finalText = originalText;

    // Paso 2: Si se solicitó traducción
    if (shouldTranslate) {
      const gptResponse = await openai.chat.completions.create({
        model: 'gpt-4', // o 'gpt-3.5-turbo'
        messages: [
          {
            role: 'system',
            content: `Traduce el siguiente texto del idioma ${detectedLanguage} al idioma ${targetLanguage}.`,
          },
          {
            role: 'user',
            content: originalText,
          },
        ],
      });

      finalText = gptResponse.choices[0].message.content;
    }

    console.log('Texto final:', finalText);

    // Guardar audio y transcripción
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const newFileName = `${timestamp}_${originalName}`;
    const finalPath = path.join(__dirname, 'audios', newFileName);
    fs.copyFileSync(correctPath, finalPath);

    const logEntry = {
      file: newFileName,
      text: finalText,
      original: originalText,
      language: detectedLanguage,
      translated: shouldTranslate,
      targetLanguage,
      timestamp: new Date().toISOString(),
    };

    const historyFile = path.join(__dirname, 'transcriptions.json');
    const history = fs.existsSync(historyFile)
      ? JSON.parse(fs.readFileSync(historyFile, 'utf-8'))
      : [];

    history.push(logEntry);
    fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));

    // Respuesta al frontend
    if (shouldTranslate) {
      res.json({
        text: finalText,
        original: originalText,
        language: detectedLanguage,
      });
    } else {
      res.json({ text: originalText });
    }

  } catch (err) {
    console.error('Error en transcripción/traducción:', err);
    res.status(500).json({ error: 'Error al procesar el audio' });
  }
});


// Crear carpeta si no existe
if (!fs.existsSync('audios')) {
  fs.mkdirSync('audios');
}

app.listen(port, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${port}`);
});

// Ruta para obtener el historial de transcripciones
app.get('/recordings', (req, res) => {
  try {
    const historyFile = path.join(__dirname, 'transcriptions.json');
    if (!fs.existsSync(historyFile)) {
      return res.json([]);
    }

    const history = JSON.parse(fs.readFileSync(historyFile, 'utf-8'));
    res.json(history);
  } catch (err) {
    console.error('Error al leer historial:', err);
    res.status(500).json({ error: 'Error al obtener historial' });
  }
});