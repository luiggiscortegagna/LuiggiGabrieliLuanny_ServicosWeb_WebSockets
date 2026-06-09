let socket = null; // guarda conexao websocket atual
let entrouNoChat = false; // guarda se usuario ja entrou no chat

// pega elementos da pagina html
const entrada = document.getElementById("entrada");
const chat = document.getElementById("chat");
const nomeInput = document.getElementById("nome");
const entrarBtn = document.getElementById("entrar");
const sairBtn = document.getElementById("sair");
const mensagensDiv = document.getElementById("mensagens");
const formulario = document.getElementById("formulario");
const textoInput = document.getElementById("texto");

// adiciona nova mensagem na tela
function mostrarMensagem(texto, classe = "") {
  const div = document.createElement("div");

  div.textContent = texto;

  if (classe) {
    div.classList.add(classe);
  }

  mensagensDiv.appendChild(div);

  // area de mensagens rola automaticamente pra ultima mensagem
  mensagensDiv.scrollTop = mensagensDiv.scrollHeight;
}

// volta a tela pra estado inicial
function limparTela() {
  entrouNoChat = false;
  socket = null;

  entrada.hidden = false;
  chat.hidden = true;

  nomeInput.disabled = false;
  entrarBtn.disabled = false;

  nomeInput.value = "";
  textoInput.value = "";
  mensagensDiv.innerHTML = "";
}

// botao "entrar" ao ser clicado
entrarBtn.addEventListener("click", () => {
  const nome = nomeInput.value.trim();

  // precisa de nome
  if (!nome) {
    alert("Digite seu nome.");
    return;
  }

  // nao pode abrir nova conexao se ja tiver no chat
  if (entrouNoChat || socket) {
    alert("Você já entrou no chat.");
    return;
  }

  // desativa o botao e campo de nome ao entrar
  nomeInput.disabled = true;
  entrarBtn.disabled = true;

  // cria conexao websocket com o servidor
  socket = new WebSocket(`ws://${window.location.host}`);

  // quando conexao abre, envia nome ao servidor
  socket.addEventListener("open", () => {
    socket.send(JSON.stringify({
      tipo: "entrar",
      nome: nome
    }));
  });

  // recebe mensagens enviadas pelo servidor
  socket.addEventListener("message", (event) => {
    const dados = JSON.parse(event.data);

    // servidor confirmou a entrada no chat
    if (dados.tipo === "entrada_confirmada") {
      entrouNoChat = true;

      entrada.hidden = true;
      chat.hidden = false;

      mostrarMensagem("Conectado ao chat.", "sistema");
      return;
    }

    // servidor enviou algum erro
    if (dados.tipo === "erro") {
      alert(dados.texto);

      if (socket) {
        socket.close();
      }

      return;
    }

    // mensagem automatica do sistema
    if (dados.tipo === "sistema") {
      mostrarMensagem(`[SISTEMA] ${dados.texto}`, "sistema");
      return;
    }

    // mensagem normal de usuario
    if (dados.tipo === "mensagem") {
      mostrarMensagem(`[${dados.horario}] ${dados.nome}: ${dados.texto}`, "mensagem");
      return;
    }
  });

  // quando a conexao fecha, libera a tela para entrar de novo
  socket.addEventListener("close", () => {
    limparTela();
  });

  // caso tenha erro de conexao
  socket.addEventListener("error", () => {
    alert("Erro na conexão WebSocket.");
    limparTela();
  });
});

// evento de envio de mensagem
formulario.addEventListener("submit", (event) => {
  // impede o recarregamento da pagina
  event.preventDefault();

  // so permite enviar se estiver conectado ao chat
  if (!entrouNoChat || !socket || socket.readyState !== WebSocket.OPEN) {
    alert("Você precisa estar conectado ao chat.");
    return;
  }

  const texto = textoInput.value.trim();

  // ignora mensagem vazia
  if (!texto) {
    return;
  }

  // envia a mensagem pro servidor
  socket.send(JSON.stringify({
    tipo: "mensagem",
    texto: texto
  }));

  // limpa o campo de texto
  textoInput.value = "";
});

// evento ao clicar em Sair
sairBtn.addEventListener("click", () => {
  // se a conexao estiver aberta, avisa o servidor que o usuario saiu
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      tipo: "sair"
    }));
  }
});