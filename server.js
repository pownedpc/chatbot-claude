import express from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

app.use(express.json());
app.use(express.static('public'));

app.post('/api/chat', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  try {
    console.log('📨 Request recibido:', JSON.stringify(req.body, null, 2));

    let messages;
    
    if (req.body.messages && Array.isArray(req.body.messages)) {
      messages = req.body.messages;
      console.log('✅ Formato: messages array');
    } else if (req.body.message && req.body.conversationHistory) {
      messages = [
        ...req.body.conversationHistory,
        { role: 'user', content: req.body.message }
      ];
      console.log('✅ Formato: message + conversationHistory');
    } else if (req.body.message) {
      messages = [{ role: 'user', content: req.body.message }];
      console.log('✅ Formato: message simple');
    } else {
      console.error('❌ Formato inválido');
      return res.status(400).json({ 
        error: 'Se requiere "message" o "messages"',
        received: req.body 
      });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('❌ API key no configurada');
      return res.status(500).json({
        error: 'API key no configurada'
      });
    }

    console.log('🤖 Enviando a Claude...');

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: messages,
    });

    console.log('✅ Respuesta recibida');

    const assistantMessage = response.content[0].text;

    res.json({
      response: assistantMessage,
      content: [{
        type: 'text',
        text: assistantMessage
      }]
    });

  } catch (error) {
    console.error('❌ Error:', error);

    if (error.status === 401) {
      return res.status(401).json({ error: 'API key inválida' });
    }

    if (error.status === 429) {
      return res.status(429).json({ error: 'Límite de tasa excedido' });
    }

    return res.status(500).json({
      error: error.message
    });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.options('/api/chat', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.status(200).end();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`🔑 API Key: ${process.env.ANTHROPIC_API_KEY ? '✅' : '❌'}`);
});
