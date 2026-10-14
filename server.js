
// const express = require("express");
// const { chromium } = require("playwright");

// const app = express();

// app.use(express.json());
// app.use(express.static("public"));

// app.post("/consultar", async (req, res) => {
//     const cpf = String(req.body.cpf || "").replace(/\D/g, "");

//     if (!/^\d{11}$/.test(cpf)) {
//         return res.status(400).json({
//             erro: "Digite 11 números."
//         });
//     }

//     let browser;

//     try {
//         browser = await chromium.launch({ headless: true });
//         const page = await browser.newPage();

//         await page.goto("https://example.com");

//         const titulo = await page.title();

//         res.json({
//             sucesso: true,
//             mensagem: "Servidor e Playwright funcionando!",
//             pagina: titulo
//         });
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({
//             erro: "Falha ao executar o navegador."
//         });
//     } finally {
//         if (browser) await browser.close();
//     }
// });

// // app.listen(3000, () => {
// //     console.log("Servidor iniciado: http://localhost:3000");
// // });


// async function testarNavegador() {
//     const browser = await chromium.launch({
//         headless: false
//     });

//     const page = await browser.newPage();

//     await page.goto(
//         "https://dash.cpf-brasil.org/token/registro/",
//         { waitUntil: "domcontentloaded" }
//     );

//     console.log("Título:", await page.title());
//     console.log("URL:", page.url());

//     await page.screenshot({
//         path: "pagina-teste.png",
//         fullPage: true
//     });

//     console.log("Captura salva em pagina-teste.png");

//     // Mantém o navegador aberto para inspeção manual.
// }

// testarNavegador().catch(console.error);

const express = require("express");
const { chromium } = require("playwright-core");

process.env.PLAYWRIGHT_BROWSERS_PATH = process.env.PLAYWRIGHT_BROWSERS_PATH || "./browsers";

const app = express();
const PORTA = process.env.PORT || 3000;

const URL_CONSULTA =
    "https://dash.cpf-brasil.org/token/registro/";

app.use(express.json({ limit: "10kb" }));
app.use(express.static("public"));

let consultaEmAndamento = false;

app.post("/consultar", async (req, res) => {
    if (consultaEmAndamento) {
        return res.status(429).json({
            sucesso: false,
            mensagem: "Já existe um teste em andamento. Tente novamente.",
        });
    }

    const cpf = String(req.body?.cpf ?? "").replace(/\D/g, "");

    if (!/^\d{11}$/.test(cpf)) {
        return res.status(400).json({
            sucesso: false,
            mensagem: "Informe um CPF com 11 dígitos.",
        });
    }

    consultaEmAndamento = true;

    let browser;

    try {
        browser = await chromium.launch({
            headless: true,
        });

        const page = await browser.newPage();

page.setDefaultTimeout(30000);

        await page.goto(URL_CONSULTA, {
            waitUntil: "networkidle",
            timeout: 60000,
        });

        await page.waitForSelector("#cpf", { state: "visible", timeout: 30000 });
        await page.locator("#cpf").fill(cpf);
        await page.locator("#cpf").blur();

        const campoNome = page.locator("#nome");

        try {
            await campoNome.waitFor({
                state: "visible",
                timeout: 30000,
            });

            await page.waitForFunction(() => {
                const campo = document.querySelector("#nome");

                return campo &&
                    typeof campo.value === "string" &&
                    campo.value.trim().length > 0;
            }, null, {
                timeout: 30000,
            });

            const nomePreenchido = await campoNome.inputValue();

            return res.json({
                sucesso: true,
                nomePreenchido: true,
                nome: nomePreenchido,
                mensagem: "O campo de nome foi preenchido automaticamente.",
            });
        } catch (e) {
            const html = await page.content();
            console.error("HTML da página no erro:", html.substring(0, 2000));
            return res.json({
                sucesso: true,
                nomePreenchido: false,
                mensagem:
                    "O campo de nome não foi preenchido automaticamente.",
            });
        }
    } catch (error) {
        console.error("Falha no teste Playwright:", error.message);
        console.error("Stack:", error.stack);

        return res.status(502).json({
            sucesso: false,
            mensagem: error.message || "Não foi possível concluir o teste. Verifique a disponibilidade da página.",
        });
    } finally {
        if (browser) {
            await browser.close().catch(() => { });
        }

        consultaEmAndamento = false;
    }
});

app.listen(PORTA, () => {
    console.log(
        `Aplicação disponível em http://localhost:${PORTA}`
    );
});
