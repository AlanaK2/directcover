const { AIProjectsClient } = require("@azure/ai-projects");
const { AzureKeyCredential } = require("@azure/core-auth");

module.exports = async function (context, req) {
    try {
        const { message, threadId } = req.body;

        // Pegando os valores das variáveis que você salvou no portal
        const endpoint = "https://foundry-equipe1.services.ai.azure.com/api/projects/proj-equipe1";
        const key = "Fz9dEKhY9MBlhTTBoPXfSdKXA6e2LqmZCRoZETQnbwLGSU3Aa7eXJQQJ99CDACYeBjFXJ3w3AAAAACOGigMG";
        const agentId = "asst_4MaQuy8Nmypr4OALrAipzDRD";

        // Criando o cliente usando a Chave e o Endpoint
        const client = AIProjectsClient.fromConfig({
            endpoint: endpoint,
            credential: new AzureKeyCredential(key)
        });

        // 1. Gerenciar a Thread (Conversa)
        let currentThreadId = threadId;
        if (!currentThreadId) {
            const thread = await client.agents.createThread();
            currentThreadId = thread.id;
        }

        // 2. Adicionar mensagem do usuário
        await client.agents.createMessage(currentThreadId, {
            role: "user",
            content: message,
        });

        // 3. Executar o agente
        const run = await client.agents.createRun(currentThreadId, agentId);

        // 4. Aguardar resposta (Polling)
        let runStatus = await client.agents.getRun(currentThreadId, run.id);
        while (runStatus.status === "queued" || runStatus.status === "in_progress") {
            await new Promise(resolve => setTimeout(resolve, 1000));
            runStatus = await client.agents.getRun(currentThreadId, run.id);
        }

        // 5. Pegar o resultado
        const messages = await client.agents.listMessages(currentThreadId);
        const lastMessage = messages.data[0].content[0].text.value;

        context.res = {
            status: 200,
            body: { reply: lastMessage, threadId: currentThreadId }
        };

    } catch (error) {
        context.log.error("Erro detalhado:", error);
        context.res = {
            status: 500,
            body: { error: "Erro ao processar mensagem", details: error.message }
        };
    }
};