var express = require("express");
var helmet = require("helmet");
var cors = require("cors");
var venom = require("venom-bot");

let serviceStatus = 'Initializing'; 


venom.create({
  session: 'API-ZAP', // nome da sessão
  browserArgs: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--no-first-run',
    '--no-zygote',
    '--single-process',
    '--disable-gpu'
  ],
  executablePath: '/usr/bin/google-chrome-stable', // Caminho para o Chrome instalado
  disableSpins: true, // Desativar spins para melhorar a persistência de sessão
  cacheEnabled: false, // Desativar cache para evitar problemas de sessão
  useChrome: true, // Usar o Chrome ao invés do Chromium (padrão)
  puppeteerOptions: {
    args: ['--no-sandbox', '--disable-setuid-sandbox'] // Argumentos do Puppeteer
  },
  sessionDataPath: './session', // Caminho para armazenar os dados da sessão
  logQR: true
},
(statusSession, session) => {
  console.log('Status Session: ', statusSession);
  console.log('Session name: ', session);
  serviceStatus = statusSession; // Atualiza a variável com o status atual
}
)
.then((client) => {
  // Escuta mudanças de estado
  client.onStateChange((state) => {
    console.log('Estado da sessão:', state);
    serviceStatus = state; // Atualiza a variável com o estado atual
    if (state === 'CONFLICT' || state === 'UNLAUNCHED') {
      client.useHere(); // Força a sessão a ser usada aqui
    }
  });

   // Opcional: Escuta mudanças na stream (usado para reconexões)
   client.onStreamChange((state) => {
    console.log('Estado da stream:', state);
  });

  start(client);
})
.catch((erro) => {
  console.error('Erro ao iniciar o venom-bot:', erro);
  serviceStatus = 'Error'; // Define o status como erro
});


function start(client) {
  var app = express();

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Permite scripts inline e unsafe-eval
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'", "http://localhost:4000"]
      }
    }
  }));

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use((req, res, next) => {
    console.log("Recebendo solicitação: ", req.body);
    next();
  });

  app.listen(4000, () => {
    console.log("Servidor rodando na porta 4000");
  });

  app.post("/api/message", async (req, res, next) => {
    const chatid = req.body.number;

    const recipient = chatid.endsWith('@g.us') ? chatid : chatid + '@g.us';

    try {
      console.log('Enviando mensagem para:', recipient);
      await client.sendText(recipient, req.body.message);
      res.json(req.body);
    } catch (error) {
      console.error('Erro ao enviar a mensagem:', error);
      res.status(500).json({ error: 'Erro ao enviar a mensagem' });
    }
  });

  app.get("/api/groups", async (req, res, next) => {
    try {
      const chats = await client.getAllChats();
      const groups = chats.filter(chat => chat.isGroup);

      const groupDetails = groups.map(group => ({
        id: group.id._serialized,
        name: group.name
      }));

      res.json(groupDetails);
    } catch (error) {
      console.error('Erro ao obter os grupos:', error);
      res.status(500).json({ error: 'Erro ao obter os grupos' });
    }
  });
   // Endpoint para obter o status do serviço
   app.get("/api/status", (req, res) => {
    res.json({ status: serviceStatus });
  });
}
