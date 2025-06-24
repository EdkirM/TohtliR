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
    console.error('rror al convertir a WAV:', error);
    throw error;
  }
}



// Api
const openai = new OpenAI({
  apiKey: 'holas_AQUI PON LA API',
});

app.use(cors());
app.use(express.json());

// Almacenamiento temporal
const upload = multer({ dest: 'uploads/' });

// Ruta principal para transcripción
app.post('/transcribe', upload.single('audio'), async (req, res) => {
  try {
    const tempPath = req.file.path;                   // Ej: uploads/abc123
    const originalName = req.file.originalname;       // Ej: audio.m4a
    const extension = path.extname(originalName) || '.m4a'; // en caso de que venga sin extensión
    const correctPath = tempPath + extension;         // Ej: uploads/abc123.m4a

    // Renombrar archivo con extensión reconocida
    fs.renameSync(tempPath, correctPath);

    // Enviar a OpenAI
    const wavPath = correctPath.replace(extension, '.wav');
    convertToWav(correctPath, wavPath);

    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(wavPath),
      model: 'whisper-1',
      response_format: 'json',
    });


    const text = transcription.text;
    console.log('Texto transcrito:', text);

    // Guardar audio renombrado
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const newFileName = `${timestamp}_${originalName}`;
    const finalPath = path.join(__dirname, 'audios', newFileName);

    fs.copyFileSync(correctPath, finalPath); // copia el archivo a /audios

    // Guardar transcripción en archivo JSON
    const logEntry = {
      file: newFileName,
      text,
      timestamp: new Date().toISOString(),
    };

    const historyFile = path.join(__dirname, 'transcriptions.json');
    const history = fs.existsSync(historyFile)
      ? JSON.parse(fs.readFileSync(historyFile, 'utf-8'))
      : [];

    history.push(logEntry);
    fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));

    res.json({ text });
  } catch (err) {
    console.error('Error en transcripción:', err);
    res.status(500).json({ error: 'Error al transcribir audio' });
  }
});

// Crear carpeta si no existe
if (!fs.existsSync('audios')) {
  fs.mkdirSync('audios');
}

app.listen(port, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${port}`);
});
