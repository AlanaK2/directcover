const { AIProjectsClient } = require("@azure/ai-projects");
const { DefaultAzureCredential } = require("@azure/identity");

module.exports = async function (context, req) {
    // Pegamos os dados enviados pelo HTML
    const { message, threadId } = req.body;

    // Conexão com o Azure Foundry (usando variáveis de ambiente por segurança)
    const connectionString = process.env.AZURE_AI_CONN_STRING;
    const agentId = process.env.AZURE_AI_AGENT_ID;

    const client = AIProjectsClient.fromConnectionString(
        connectionString,
        new DefaultAzureCredential()
    );

    // 1. Gerenciar a Thread (Conversa)
    let currentThreadId = threadId;
    if (!currentThreadId) {
        const thread = await client.agents.createThread();
        currentThreadId = thread.id;
    }

    // 2. Enviar a mensagem do usuário para a Thread
    await client.agents.createMessage(currentThreadId, {
        role: "user",
        content: message,
    });

    // 3. Mandar o Agente processar (Run)
    const run = await client.agents.createRun(currentThreadId, agentId);

    // 4. Aguardar a resposta (Polling)
    let runStatus = await client.agents.getRun(currentThreadId, run.id);
    while (runStatus.status === "queued" || runStatus.status === "in_progress") {
        await new Promise(resolve => setTimeout(resolve, 1000));
        runStatus = await client.agents.getRun(currentThreadId, run.id);
    }

    // 5. Pegar a última mensagem gerada pelo agente
    const messages = await client.agents.listMessages(currentThreadId);
    const respostaAgente = messages.data[0].content[0].text.value;

    context.res = {
        status: 200,
        body: {
            reply: respostaAgente,
            threadId: currentThreadId
        }
    };
};