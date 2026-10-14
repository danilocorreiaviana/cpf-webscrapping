const form = document.getElementById("formConsulta");
const campoCpf = document.getElementById("cpf");
const botao = document.getElementById("btnConsultar");
const resultado = document.getElementById("resultado");

campoCpf.addEventListener("input", () => {
    let valor = campoCpf.value.replace(/\D/g, "").slice(0, 11);

    valor = valor
        .replace(/^(\d{3})(\d)/, "$1.$2")
        .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
        .replace(/\.(\d{3})(\d)/, ".$1-$2");

    campoCpf.value = valor;
});

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const cpf = campoCpf.value.replace(/\D/g, "");

    if (cpf.length !== 11) {
        mostrarResultado("Digite um CPF com 11 números.", true);
        return;
    }

    botao.disabled = true;
    botao.textContent = "Consultando...";
    mostrarResultado("Processando a solicitação...");

    try {
        const resposta = await fetch("/consultar", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ cpf })
        });

        const dados = await resposta.json();

        if (!resposta.ok) {
            throw new Error(dados.erro || "Não foi possível concluir.");
        }

        // Exibe apenas o que o servidor efetivamente retornou.
        mostrarResultado(
            dados.nome
                ? `Nome retornado: ${dados.nome}`
                : dados.mensagem || "Consulta concluída, sem nome retornado."
        );
    } catch (erro) {
        mostrarResultado(erro.message || "Erro de comunicação com o servidor.", true);
    } finally {
        botao.disabled = false;
        botao.textContent = "Consultar";
    }
});

function mostrarResultado(texto, erro = false) {
    resultado.hidden = false;
    resultado.className = erro ? "resultado erro" : "resultado";
    resultado.textContent = texto;
}
