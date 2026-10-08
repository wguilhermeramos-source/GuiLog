const $ = (selector) => document.querySelector(selector);

const loginSection = $("#login-section");
const registerSection = $("#register-section");
const dashboardSection = $("#dashboard-section");
const createDeliverySection = $("#create-delivery-section");

const loginForm = $("#login-form");
const loginMessage = $("#login-message");
const registerForm = $("#register-form");
const registerMessage = $("#register-message");

const userInfo = $("#user-info");
const logoutButton = $("#logout-button");
const showRegisterButton = $("#show-register-button");
const backLoginButton = $("#back-login-button");

const deliveryForm = $("#delivery-form");
const deliveryMessage = $("#delivery-message");
const descriptionInput = $("#description");

const deliveriesList = $("#deliveries-list");
const listMessage = $("#list-message");
const refreshButton = $("#refresh-button");

const statusLabels = {
  processing: "Em preparação",
  shipped: "Enviada",
  delivered: "Entregue",
};

let session = null;

function showMessage(element, text, type = "") {
  element.textContent = text;
  element.className = `message ${type}`.trim();
}

// REQUISIÇÕES À API
async function api(path, { method = "GET", body, token } = {}) {
  const headers = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  let response;

  try {
    response = await fetch(path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Error("Não foi possível conectar à API.");
  }

  const text = await response.text();
  let data = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error("A API retornou uma resposta inesperada.");
    }
  }

  if (!response.ok) {
    const translations = {
      "Invalid email or password": "E-mail ou senha incorretos.",
      "User with same email already exists": "Esse e-mail já está cadastrado.",
      "Delivery not found": "Entrega não encontrada.",
      "Delivery already delivered": "Essa entrega já foi concluída.",
      "change status to shipped": "Altere o status para Enviada primeiro.",
      "Access denied": "Você não tem permissão para acessar essa entrega.",
      Unauthorized: "Sua sessão expirou. Saia e entre novamente.",
    };

    const message =
      typeof data?.message === "string" ? data.message : "";

    throw new Error(
      translations[message] ||
        message ||
        `Não foi possível concluir a operação (${response.status}).`
    );
  }

  return data;
}

// ALTERNAR ENTRE LOGIN E CADASTRO
showRegisterButton.addEventListener("click", () => {
  loginSection.hidden = true;
  registerSection.hidden = false;

  loginForm.reset();
  showMessage(loginMessage, "");
  showMessage(registerMessage, "");

  $("#register-name").focus();
});

backLoginButton.addEventListener("click", () => {
  registerSection.hidden = true;
  loginSection.hidden = false;

  registerForm.reset();
  showMessage(registerMessage, "");

  $("#email").focus();
});

// CADASTRAR USUÁRIO
registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const button = registerForm.querySelector('button[type="submit"]');
  const name = $("#register-name").value.trim();
  const email = $("#register-email").value.trim();
  const password = $("#register-password").value;

  if (name.length < 3) {
    showMessage(
      registerMessage,
      "O nome precisa ter pelo menos 3 caracteres.",
      "error"
    );
    $("#register-name").focus();
    return;
  }

  button.disabled = true;
  showRegisterButton.disabled = true;
  backLoginButton.disabled = true;
  showMessage(registerMessage, "Criando sua conta...");

  try {
    await api("/users", {
      method: "POST",
      body: { name, email, password },
    });

    registerForm.reset();
    registerSection.hidden = true;
    loginSection.hidden = false;

    $("#email").value = email;
    $("#password").value = "";

    showMessage(registerMessage, "");
    showMessage(
      loginMessage,
      "Conta criada com sucesso! Entre com seu e-mail e senha.",
      "success"
    );

    $("#password").focus();
  } catch (error) {
    showMessage(registerMessage, error.message, "error");
  } finally {
    button.disabled = false;
    showRegisterButton.disabled = false;
    backLoginButton.disabled = false;
  }
});

// LOGIN
loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const button = loginForm.querySelector('button[type="submit"]');

  button.disabled = true;
  showRegisterButton.disabled = true;
  showMessage(loginMessage, "Entrando...");

  try {
    const data = await api("/sessions", {
      method: "POST",
      body: {
        email: $("#email").value.trim(),
        password: $("#password").value,
      },
    });

    if (!data?.token || !data?.id) {
      throw new Error("A API não retornou o token ou o ID do usuário.");
    }

    session = data;

    userInfo.textContent = `${session.name} • ${
      session.role === "sale" ? "Vendedor" : "Cliente"
    }`;

    loginSection.hidden = true;
    registerSection.hidden = true;
    dashboardSection.hidden = false;
    createDeliverySection.hidden = session.role !== "customer";

    loginForm.reset();
    showMessage(loginMessage, "");

    await loadDeliveries();
  } catch (error) {
    showMessage(loginMessage, error.message, "error");
  } finally {
    button.disabled = false;
    showRegisterButton.disabled = false;
  }
});

// CADASTRAR ENTREGA
deliveryForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!session || session.role !== "customer") return;

  const currentSession = session;
  const button = deliveryForm.querySelector("button");
  const description = descriptionInput.value.trim();

  if (!description) {
    showMessage(deliveryMessage, "Digite uma descrição.", "error");
    descriptionInput.focus();
    return;
  }

  button.disabled = true;
  showMessage(deliveryMessage, "Cadastrando entrega...");

  try {
    await api("/deliveries", {
      method: "POST",
      token: currentSession.token,
      body: { description },
    });

    if (session !== currentSession) return;

    deliveryForm.reset();
    showMessage(
      deliveryMessage,
      "Entrega cadastrada com sucesso!",
      "success"
    );

    await loadDeliveries();
  } catch (error) {
    if (session === currentSession) {
      showMessage(deliveryMessage, error.message, "error");
    }
  } finally {
    button.disabled = false;
  }
});

// LISTAR ENTREGAS
async function loadDeliveries() {
  if (!session) return;

  const currentSession = session;

  showMessage(listMessage, "Carregando entregas...");
  deliveriesList.replaceChildren();
  refreshButton.disabled = true;

  try {
    const deliveries = await api("/deliveries", {
      token: currentSession.token,
    });

    if (session !== currentSession) return;

    if (!Array.isArray(deliveries)) {
      throw new Error("A API retornou uma lista em formato inesperado.");
    }

    showMessage(
      listMessage,
      deliveries.length ? "" : "Nenhuma entrega cadastrada."
    );

    deliveries.forEach((delivery) => {
      deliveriesList.append(createDeliveryCard(delivery, currentSession));
    });
  } catch (error) {
    if (session === currentSession) {
      showMessage(listMessage, error.message, "error");
    }
  } finally {
    if (session === currentSession) {
      refreshButton.disabled = false;
    }
  }
}

// CRIAR CARTÃO DA ENTREGA
function createDeliveryCard(delivery, currentSession) {
  const card = document.createElement("article");
  card.className = "delivery-card";

  const header = document.createElement("div");
  header.className = "delivery-header";

  const title = document.createElement("h3");
  title.textContent = delivery.description;

  const badge = document.createElement("span");
  badge.className = "status";
  badge.textContent =
    statusLabels[delivery.status] ?? delivery.status ?? "Sem status";

  header.append(title, badge);
  card.append(header);

  [
    `Cliente: ${delivery.user?.name ?? "Não informado"}`,
    `E-mail: ${delivery.user?.email ?? "Não informado"}`,
    `Código: ${delivery.id}`,
  ].forEach((text) => {
    const paragraph = document.createElement("p");
    paragraph.textContent = text;
    card.append(paragraph);
  });

  // HISTÓRICO
  const historyButton = document.createElement("button");
  historyButton.type = "button";
  historyButton.className = "button-secondary";
  historyButton.textContent = "Ver histórico";

  const historyActions = document.createElement("div");
  historyActions.className = "delivery-actions";
  historyActions.append(historyButton);

  const historyPanel = document.createElement("div");
  historyPanel.className = "deliveries-list";
  historyPanel.hidden = true;
  historyPanel.setAttribute("aria-live", "polite");

  async function loadHistory() {
    historyPanel.replaceChildren();

    const message = document.createElement("p");
    message.textContent = "Carregando histórico...";
    historyPanel.append(message);

    try {
      const data = await api(
        `/delivery-logs/${encodeURIComponent(delivery.id)}/show`,
        { token: currentSession.token }
      );

      if (session !== currentSession) return;

      if (!data) {
        throw new Error("Entrega não encontrada.");
      }

      if (!Array.isArray(data.logs)) {
        throw new Error("A API retornou um histórico em formato inesperado.");
      }

      historyPanel.replaceChildren();

      if (!data.logs.length) {
        message.textContent = "Nenhum registro no histórico.";
        historyPanel.append(message);
        return;
      }

      data.logs.forEach((log) => {
        const item = document.createElement("div");
        item.className = "delivery-card";

        const description = document.createElement("p");
        description.textContent =
          statusLabels[log.description] ?? log.description;

        item.append(description);

        if (log.createdAt) {
          const date = new Date(log.createdAt);

          if (!Number.isNaN(date.getTime())) {
            const dateText = document.createElement("p");
            dateText.textContent = date.toLocaleString("pt-BR");
            item.append(dateText);
          }
        }

        historyPanel.append(item);
      });
    } catch (error) {
      if (session !== currentSession) return;

      historyPanel.replaceChildren();
      showMessage(message, error.message, "error");
      historyPanel.append(message);
    }
  }

  historyButton.addEventListener("click", async () => {
    if (session !== currentSession) return;

    if (!historyPanel.hidden) {
      historyPanel.hidden = true;
      historyButton.textContent = "Ver histórico";
      return;
    }

    historyPanel.hidden = false;
    historyButton.textContent = "Ocultar histórico";
    historyButton.disabled = true;

    try {
      await loadHistory();
    } finally {
      historyButton.disabled = false;
    }
  });

  // CONTROLES DO VENDEDOR
  if (currentSession.role === "sale") {
    const statusForm = document.createElement("form");

    const statusLabel = document.createElement("label");
    statusLabel.textContent = "Status da entrega";
    statusLabel.htmlFor = `status-${delivery.id}`;

    const select = document.createElement("select");
    select.id = statusLabel.htmlFor;

    Object.entries(statusLabels).forEach(([value, text]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = text;
      select.append(option);
    });

    select.value = delivery.status;

    const saveButton = document.createElement("button");
    saveButton.type = "submit";
    saveButton.textContent = "Salvar status";

    const statusMessage = document.createElement("p");
    statusMessage.className = "message";
    statusMessage.setAttribute("role", "status");

    statusForm.append(statusLabel, select, saveButton);
    card.append(statusForm, statusMessage);

    // Ocorrências são permitidas somente quando a entrega está enviada.
    const logForm = document.createElement("form");
    logForm.hidden = delivery.status !== "shipped";

    const logLabel = document.createElement("label");
    logLabel.textContent = "Novo registro no histórico";
    logLabel.htmlFor = `log-${delivery.id}`;

    const logInput = document.createElement("textarea");
    logInput.id = logLabel.htmlFor;
    logInput.placeholder = "Ex.: Entrega saiu para o destino.";
    logInput.rows = 3;
    logInput.required = true;

    const logButton = document.createElement("button");
    logButton.type = "submit";
    logButton.textContent = "Registrar ocorrência";

    const logMessage = document.createElement("p");
    logMessage.className = "message";
    logMessage.setAttribute("role", "status");

    logForm.append(logLabel, logInput, logButton, logMessage);
    card.append(logForm);

    statusForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      if (session !== currentSession) return;

      const newStatus = select.value;

      if (!newStatus) {
        showMessage(statusMessage, "Selecione um status.", "error");
        return;
      }

      if (newStatus === delivery.status) {
        showMessage(statusMessage, "A entrega já está nesse status.");
        return;
      }

      saveButton.disabled = true;
      select.disabled = true;
      showMessage(statusMessage, "Salvando...");

      try {
        await api(
          `/deliveries/${encodeURIComponent(delivery.id)}/status`,
          {
            method: "PATCH",
            token: currentSession.token,
            body: { status: newStatus },
          }
        );

        if (session !== currentSession) return;

        delivery.status = newStatus;
        badge.textContent = statusLabels[newStatus];
        logForm.hidden = newStatus !== "shipped";

        showMessage(statusMessage, "Status atualizado!", "success");

        if (!historyPanel.hidden) {
          await loadHistory();
        }
      } catch (error) {
        if (session === currentSession) {
          showMessage(statusMessage, error.message, "error");
        }
      } finally {
        saveButton.disabled = false;
        select.disabled = false;
      }
    });

    logForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      if (session !== currentSession) return;

      const description = logInput.value.trim();

      if (!description) {
        showMessage(logMessage, "Digite a descrição do registro.", "error");
        logInput.focus();
        return;
      }

      logButton.disabled = true;
      showMessage(logMessage, "Registrando...");

      try {
        await api("/delivery-logs", {
          method: "POST",
          token: currentSession.token,
          body: {
            delivery_id: delivery.id,
            description,
          },
        });

        if (session !== currentSession) return;

        logForm.reset();
        showMessage(logMessage, "Registro adicionado!", "success");

        if (!historyPanel.hidden) {
          await loadHistory();
        }
      } catch (error) {
        if (session === currentSession) {
          showMessage(logMessage, error.message, "error");
        }
      } finally {
        logButton.disabled = false;
      }
    });
  }

  card.append(historyActions, historyPanel);

  return card;
}

// ATUALIZAR LISTA
refreshButton.addEventListener("click", loadDeliveries);

// SAIR
logoutButton.addEventListener("click", () => {
  session = null;

  deliveriesList.replaceChildren();
  showMessage(listMessage, "");
  showMessage(deliveryMessage, "");
  showMessage(loginMessage, "");
  showMessage(registerMessage, "");

  refreshButton.disabled = false;
  dashboardSection.hidden = true;
  createDeliverySection.hidden = true;
  registerSection.hidden = true;
  loginSection.hidden = false;

  userInfo.textContent = "";

  loginForm.reset();
  registerForm.reset();
  deliveryForm.reset();

  $("#email").focus();
});