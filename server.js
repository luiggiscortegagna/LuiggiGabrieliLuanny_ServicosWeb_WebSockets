const express = require("express"); // express pra servir arquivos html, css e js da pasta public
const http = require("http"); // modulo http nativo do node.js, base pro express e websocket
const { WebSocketServer } = require("ws"); // server websocket da biblioteca ws

const app = express(); // criar aplicacao express

const server = http.createServer(app); // cria servidor http usando express
const wss = new WebSocketServer({ server }); // cria server websocket usando mesmo server http

app.use(express.static("public")); // serve arquivos da pasta public (index, client e style)

const nomesEmUso = new Set(); // guarda nome de usuarios q tao online

// funcao pra enviar mensagem pra todos clientes conectados verem
function enviarParaTodos(dados) {
  const mensagem = JSON.stringify(dados); // converte o objeto javaScript pra texto JSON

  // percorre todos clientes conectados ao websocket
  for (const cliente of wss.clients) {
    // envia mensagem apenas se conexao ainda estiver aberta
    if (cliente.readyState === cliente.OPEN) {
      cliente.send(mensagem);
    }
  }
}

// verificar se um nome esta em uso
function nomeJaExiste(nome) {
  return nomesEmUso.has(nome.toLowerCase());
}

// remove usuario do chat, clicando em "sair" ou fechando a aba
function removerUsuario(ws) {
  // se conexao nao tem nome, usuario nem chegou a entrar
  if (!ws.nome) {
    return;
  }

  const nome = ws.nome;
  nomesEmUso.delete(nome.toLowerCase()); // remove nome da lista de nomes em uso
  ws.nome = null; // limpa o nome guardado na conexao
  console.log(`\x1b[31m${nome} saiu do chat.\x1b[0m`); // pintando console. ascii.

  // sistema manda mensagem no chat dizendo quem saiu
  enviarParaTodos({
    tipo: "sistema",
    texto: `${nome} saiu do chat. Online: ${nomesEmUso.size}`
  });
}

// evento executado sempre que um navegador abre uma conexao WebSocket
wss.on("connection", (ws) => {
  console.log("---NOVO CLIENTE CONECTADO---");

  
  ws.nome = null; // começa sem nome

  // evento executado sempre que servidor recebe mensagem de um cliente
  ws.on("message", (data) => {
    let dados;

    // tenta converter a mensagem recebida de JSON para objeto JavaScript
    try {
      dados = JSON.parse(data.toString());
    } catch {
      ws.send(JSON.stringify({
        tipo: "erro",
        texto: "Mensagem inválida."
      }));
      return;
    }

    // usuario quer entrar no chat
    if (dados.tipo === "entrar") {
      // impedir mesma conexão de entrar 2 vezes
      if (ws.nome) {
        ws.send(JSON.stringify({
          tipo: "erro",
          texto: "Você já entrou no chat."
        }));
        return;
      }

      const nome = String(dados.nome || "").trim();

      // sem nome vazio
      if (!nome) {
        ws.send(JSON.stringify({
          tipo: "erro",
          texto: "Nome inválido."
        }));
        return;
      }

      // sem 2 usuarios com mesmo nome
      if (nomeJaExiste(nome)) {
        ws.send(JSON.stringify({
          tipo: "erro",
          texto: "Esse nome já está em uso."
        }));

        ws.close();
        return;
      }

      ws.nome = nome; // guarda nome na propria conexao websocket
      nomesEmUso.add(nome.toLowerCase()); // marca nome como em uso
      console.log(`\x1b[32m${nome} entrou no chat.\x1b[0m`); // pinta console

      // confima pro usuario que ele entrou
      ws.send(JSON.stringify({
        tipo: "entrada_confirmada",
        nome: nome
      }));

      // avisa pra todos que alguem entrou
      enviarParaTodos({
        tipo: "sistema",
        texto: `${nome} entrou no chat. Online: ${nomesEmUso.size}`
      });

      return;
    }

    // usuario precisa ja ter entrado no chat p mandar msg
    if (!ws.nome) {
      ws.send(JSON.stringify({
        tipo: "erro",
        texto: "Você precisa entrar no chat antes de enviar mensagens."
      }));
      return;
    }

    // usuario mandou mensagem normal
    if (dados.tipo === "mensagem") {
      const texto = String(dados.texto || "").trim();

      // ignora mensagem vazia
      if (!texto) {
        return;
      }

      console.log(`${ws.nome}: ${texto}`);

      // envia a mensagem para todos conectados
      enviarParaTodos({
        tipo: "mensagem",
        nome: ws.nome,
        texto: texto,
        horario: new Date().toLocaleTimeString()
      });

      return;
    }

    // usuario quer sair do chat
    if (dados.tipo === "sair") {
      removerUsuario(ws);

      ws.close(); // fecha conexao websocket

      return;
    }
  });

  // evento executado qnd cliente fecha a aba, recarrega pagina ou perde conexao
  ws.on("close", () => {
    removerUsuario(ws);
  });
});


server.listen(3000, () => {
  console.log("http://localhost:3000");
});