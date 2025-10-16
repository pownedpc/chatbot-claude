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
    
    // ACEPTAR MÚLTIPLES FORMATOS
    if (req.body.messages && Array.isArray(req.body.messages)) {
      // Formato 1: { messages: [...] }
      messages = req.body.messages;
      console.log('✅ Formato: messages array');
    } else if (req.body.message && req.body.conversationHistory) {
      // Formato 2: { message: "...", conversationHistory: [...] }
      messages = [
        ...req.body.conversationHistory,
        { role: 'user', content: req.body.message }
      ];
      console.log('✅ Formato: message + conversationHistory');
    } else if (req.body.message) {
      // Formato 3: { message: "..." }
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

    // RESPONDER EN MÚLTIPLES FORMATOS (compatible con ambos frontends)
    res.json({
      response: assistantMessage,  // Para formato antiguo
      content: [{                   // Para formato nuevo
        type: 'text',
        text: assistantMessage
      }]
    });

  } catch (error) {
    console.error('❌ Error:', error);

    if (error.status === 401) {
      return res.status(401).json({ error: 'API key invál
