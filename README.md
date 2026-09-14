# Discord Mini (Windows Desktop App) 🎧🚀

Aplicação de desktop **apenas para Windows** no estilo *Discord / Skype simplificado*, criada para grupos privados e pequenos (2 a 10 amigos) com **custo zero de infraestrutura**.

---

## 🛠️ Stack Tecnológica (100% Gratuita)

- **Frontend Desktop:** Electron (build Windows target NSIS) + React 18 + Vite + TypeScript + Tailwind CSS
- **Backend de Sinalização:** Node.js + Express + Socket.io + TypeScript
- **Comunicação em Tempo Real:** WebRTC Puro em arquitetura Mesh P2P (ligações diretas entre os participantes sem servidor de media pago)
  - STUN gratuito da Google (`stun:stun.l.google.com:19302`)
  - TURN gratuito via Open Relay Project como fallback
- **Base de Dados:** SQLite local (`better-sqlite3`) com retenção e limpeza automática aos 7 dias
- **Autenticação:** Username + PIN numérico (4 a 6 dígitos) com hash `bcrypt`

---

## 📂 Estrutura do Projeto

```
Projeto_Discord_2.0/
├── shared/                  # Tipos, contratos de dados e eventos Socket.io partilhados
├── server/                  # Servidor Node.js + Socket.io + SQLite + Limpeza automática
├── electron-app/            # Aplicação Electron + React + Vite + WebRTC Mesh + Captura de Ecrã
├── iniciar-tudo.bat         # Inicia servidor e aplicação de uma só vez (Windows)
├── iniciar-servidor.bat     # Inicia apenas o backend na porta 3001
├── iniciar-app.bat          # Inicia apenas o cliente Electron
└── criar-instalador-windows.bat # Compila e gera o instalador .exe (NSIS)
```

---

## ⚡ Como Executar em Desenvolvimento

### Opção 1: Atalhos Windows (1 Clique)
- Basta dar duplo clique no ficheiro `iniciar-tudo.bat`.
  *(Irá iniciar o servidor de sinalização em `http://localhost:3001` e a janela do Discord Mini)*

### Opção 2: Linha de Comandos
```bash
# Iniciar tudo em simultâneo:
npm run dev

# Ou em janelas separadas:
npm run dev:server      # Inicia o servidor backend
npm run dev:electron    # Inicia a aplicação Electron
```

---

## 📦 Como Gerar o Instalador do Windows (.exe)

Para gerar o instalador executável nativo do Windows:
1. Executa o ficheiro `criar-instalador-windows.bat` (ou corre `npm run dist:win --workspace=discord-mini-app`).
2. O instalador gerado ficará na pasta `electron-app/dist-release/` (ex: `DiscordMini Setup 1.0.0.exe`).

---

## ☁️ Hospedagem Gratuita do Servidor de Sinalização (Render / Railway)

Para que amigos possam conectar-se pela internet sem precisares de ter o teu PC ligado:

### Render.com (Free Tier):
1. Cria um novo repositório Git com o projeto.
2. No [Render.com](https://render.com), cria um **Web Service**.
3. Configura:
   - **Root Directory:** `server`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Environment Variables:** `PORT=3001`
4. Copia a URL fornecida pelo Render (ex: `https://meu-discord.onrender.com`).
5. Ao abrir a aplicação Discord Mini, clica em **"Configurar servidor"** no ecrã de login e cola a tua URL do Render.

---

## 🎙️ Funcionalidades em Destaque

1. **Autenticação Simplificada:**
   - Apenas username e PIN de 4 a 6 dígitos.
   - Primeiro acesso cria a conta automaticamente; acessos seguintes validam o PIN.
2. **Avatares Automáticos:**
   - Cor vibrante e letra inicial gerados através de um hash determinístico do username (sem necessidade de upload de fotos).
3. **Presença em Tempo Real:**
   - Bolinha verde para utilizadores online e cinzenta para offline, atualizada instantaneamente via Socket.io.
4. **Chamadas de Voz em Mesh (WebRTC P2P):**
   - Áudio Opus com cancelamento de eco e supressão de ruído.
   - **Detetor de Fala (VAD):** Destaque com anel verde pulsante em volta do avatar quando o utilizador está a falar.
   - Controlos de Microfone (Mute) e Ensurdecer (Deafen).
5. **Partilha de Ecrã 1080p a 60fps:**
   - Integração com `desktopCapturer` do Electron para seleção de ecrãs ou janelas específicas.
   - Parâmetros de vídeo configurados para 1920x1080 @ 60fps.
   - Prioridade aos codecs VP9 / AV1 e bitrate de 10 Mbps para máxima nitidez de texto e fluidez em jogos.
6. **Notificações Nativas do Windows:**
   - Disparo de notificações na barra de tarefas do Windows quando chegam novas mensagens de chat e a janela não está focada.
7. **Limpeza Automática aos 7 Dias:**
   - Rotina agendada no servidor SQLite remove mensagens com mais de 7 dias para manter a base de dados leve e com total privacidade.
