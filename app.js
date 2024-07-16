var express = require("express");
var venom = require("venom-bot");

venom
  .create({
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
    executablePath: '/usr/bin/google-chrome-stable' // Caminho para o Chrome instalado
  })
  .then((client) => start(client))
  .catch((erro) => {
    console.log(erro);
  });

function start(client) {
  var app = express();

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

    // Aqui, verifique se o chatid já possui o sufixo @g.us
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

  // Nova rota para obter grupos
  app.get("/api/groups", async (req, res, next) => {
    try {
      const chats = await client.getAllChats();
      const groups = chats.filter(chat => chat.isGroup);
      
      // Mapear os grupos para retornar id e nome
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
}
