import { auth, db, ehAdministrador } from "./firebase.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

import {
    collection,
    addDoc,
    getDocs,
    doc,
    getDoc,
    updateDoc,
    deleteDoc,
    setDoc,
    serverTimestamp,
    writeBatch
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

// Complete esta lista com todos os alunos da turma.
const ALUNOS = [
    "Alan De Macedo Da Silva",
    "Antony Santiago Belisario Rossi",
    "Arthur Pirondi De Mello",
    "Artur Amarante Boschetti",
    "Bernardo Lemos Gomes",
    "Dafeni Maschio De Oliveira",
    "Eduardo Arnhold Moreira",
    "Enzo Arthur Dos Passos",
    "Erick Da Silva De Melos",
    "Fernando Vinícius Meneghetti",
    "Gabriel Da Costa Machado Vieira",
    "Gabriel De Souza Bentaqui",
    "Gabrielle Soares Veiga",
    "Guilherme Da Silva Guimarães",
    "Gustavo Borges Duarte",
    "Henrique Fiaminghi Gonçalves",
    "Jeancarlo Fermiano Carbonera",
    "Kauan Júnior De Sá Dos Santos",
    "Lara Da Costa Andreolla",
    "Laura Dal Magro",
    "Letícia Barcelos Parrini",
    "Luiza Helena Schussel Bizol",
    "Manuela Manchini Dos Santos",
    "Maria Eduarda Casiraghi",
    "Maria Luiza Carmona Cavalheiro",
    "Mateus Kilder Guedes",
    "Miguel Ferreira",
    "Natália Arenhardt Da Silva",
    "Nicolas Alves Fortuna",
    "Nicolas Marques Cavalheiro",
    "Nicolas Oliveira Da Silva",
    "Samuel Davi Sponga",
    "Vanessa De Vargas Souza Castro",
    "Yago Almeida Furés"
];

const $ = (id) => document.getElementById(id);

let usuarioAtual = null;
let administrador = false;
let escalaAtual = null;

function mostrarMensagem(id, texto, tipo = "") {
    const elemento = $(id);
    if (!elemento) return;

    elemento.textContent = texto;
    elemento.className = `mensagem ${tipo}`.trim();
}

function dataLegivel(valor) {
    if (!valor) return "Data não informada";

    const data = typeof valor.toDate === "function"
        ? valor.toDate()
        : new Date(valor);

    if (Number.isNaN(data.getTime())) return "Data não informada";

    return data.toLocaleString("pt-BR");
}

function criarElemento(tag, texto, classe = "") {
    const elemento = document.createElement(tag);
    elemento.textContent = texto ?? "";
    if (classe) elemento.className = classe;
    return elemento;
}

function criarBotao(texto, acao) {
    const botao = document.createElement("button");
    botao.type = "button";
    botao.textContent = texto;
    botao.addEventListener("click", acao);
    return botao;
}

function configurarPermissoes() {
    $("emailUsuario").textContent = usuarioAtual.email || "Usuário autenticado";

    $("secaoAdministracao").classList.toggle("oculto", !administrador);

    ["formAviso", "formLink", "acoesEscala"].forEach(id => {
        $(id)?.classList.toggle("oculto", !administrador);
    });
}

// ---------- AUTENTICAÇÃO ----------

onAuthStateChanged(auth, async (usuario) => {
    if (!usuario) {
        window.location.replace("login.html");
        return;
    }

    usuarioAtual = usuario;
    administrador = ehAdministrador(usuario);

    configurarPermissoes();

    await carregarAvisos();
    await carregarLinks();
    await carregarEscala();
});

$("btnSair").addEventListener("click", async () => {
    await signOut(auth);
    window.location.replace("login.html");
});

// ---------- AVISOS ----------

$("formAviso").addEventListener("submit", async (evento) => {
    evento.preventDefault();

    if (!administrador) return;

    const id = $("avisoId").value;
    const titulo = $("tituloAviso").value.trim();
    const texto = $("textoAviso").value.trim();

    if (!titulo || !texto) return;

    try {
        if (id) {
            await updateDoc(doc(db, "avisos", id), {
                titulo,
                texto,
                atualizadoEm: serverTimestamp()
            });
        } else {
            await addDoc(collection(db, "avisos"), {
                titulo,
                texto,
                autorUid: usuarioAtual.uid,
                autorEmail: usuarioAtual.email || "Administrador",
                criadoEm: serverTimestamp()
            });
        }

        $("formAviso").reset();
        $("avisoId").value = "";
        $("btnSalvarAviso").textContent = "Publicar aviso";
        $("btnCancelarAviso").classList.add("oculto");

        mostrarMensagem("mensagemAvisos", "Aviso salvo com sucesso.", "sucesso");
        await carregarAvisos();
    } catch (erro) {
        console.error(erro);
        mostrarMensagem("mensagemAvisos", "Não foi possível salvar o aviso. Verifique as regras do Firestore.", "erro");
    }
});

$("btnCancelarAviso").addEventListener("click", () => {
    $("formAviso").reset();
    $("avisoId").value = "";
    $("btnSalvarAviso").textContent = "Publicar aviso";
    $("btnCancelarAviso").classList.add("oculto");
});

async function carregarAvisos() {
    const lista = $("listaAvisos");
    lista.replaceChildren();

    try {
        const consulta = await getDocs(collection(db, "avisos"));

        const avisos = consulta.docs.map(item => ({
            id: item.id,
            ...item.data()
        }));

        avisos.sort((a, b) => {
            const dataA = a.criadoEm?.toMillis?.() || 0;
            const dataB = b.criadoEm?.toMillis?.() || 0;
            return dataB - dataA;
        });

        if (avisos.length === 0) {
            lista.append(criarElemento("p", "Nenhum aviso publicado."));
            return;
        }

        for (const aviso of avisos) {
            const cartao = criarElemento("article", "", "cartao");
            cartao.append(criarElemento("h3", aviso.titulo));
            cartao.append(criarElemento("p", aviso.texto));
            cartao.append(criarElemento(
                "p",
                `Publicado por ${aviso.autorEmail || "Administrador"} • ${dataLegivel(aviso.criadoEm)}`,
                "meta"
            ));

            if (administrador) {
                const acoes = criarElemento("div", "", "acoes-cartao");

                acoes.append(criarBotao("Editar", () => {
                    $("avisoId").value = aviso.id;
                    $("tituloAviso").value = aviso.titulo || "";
                    $("textoAviso").value = aviso.texto || "";
                    $("btnSalvarAviso").textContent = "Salvar alterações";
                    $("btnCancelarAviso").classList.remove("oculto");
                    $("formAviso").scrollIntoView({ behavior: "smooth" });
                }));

                acoes.append(criarBotao("Excluir", async () => {
                    if (!confirm("Deseja excluir este aviso?")) return;

                    try {
                        await deleteDoc(doc(db, "avisos", aviso.id));
                        await carregarAvisos();
                    } catch (erro) {
                        console.error(erro);
                        mostrarMensagem("mensagemAvisos", "Não foi possível excluir o aviso.", "erro");
                    }
                }));

                cartao.append(acoes);
            }

            lista.append(cartao);
        }
    } catch (erro) {
        console.error(erro);
        mostrarMensagem("mensagemAvisos", "Erro ao carregar os avisos.", "erro");
    }
}

// ---------- LINKS ÚTEIS ----------

$("formLink").addEventListener("submit", async (evento) => {
    evento.preventDefault();

    if (!administrador) return;

    const id = $("linkId").value;
    const titulo = $("tituloLink").value.trim();
    const url = $("urlLink").value.trim();
    const descricao = $("descricaoLink").value.trim();

    try {
        const endereco = new URL(url);

        if (!["https:", "http:"].includes(endereco.protocol)) {
            throw new Error("Endereço inválido.");
        }

        const dados = {
            titulo,
            url: endereco.href,
            descricao
        };

        if (id) {
            await updateDoc(doc(db, "links", id), {
                ...dados,
                atualizadoEm: serverTimestamp()
            });
        } else {
            await addDoc(collection(db, "links"), {
                ...dados,
                autorUid: usuarioAtual.uid,
                autorEmail: usuarioAtual.email || "Administrador",
                criadoEm: serverTimestamp()
            });
        }

        $("formLink").reset();
        $("linkId").value = "";
        $("btnSalvarLink").textContent = "Salvar link";
        $("btnCancelarLink").classList.add("oculto");

        mostrarMensagem("mensagemLinks", "Link salvo com sucesso.", "sucesso");
        await carregarLinks();
    } catch (erro) {
        console.error(erro);
        mostrarMensagem("mensagemLinks", "Confira o endereço e as permissões do Firestore.", "erro");
    }
});

$("btnCancelarLink").addEventListener("click", () => {
    $("formLink").reset();
    $("linkId").value = "";
    $("btnSalvarLink").textContent = "Salvar link";
    $("btnCancelarLink").classList.add("oculto");
});

async function carregarLinks() {
    const lista = $("listaLinks");
    lista.replaceChildren();

    try {
        const consulta = await getDocs(collection(db, "links"));

        const links = consulta.docs.map(item => ({
            id: item.id,
            ...item.data()
        }));

        links.sort((a, b) =>
            (a.titulo || "").localeCompare(b.titulo || "", "pt-BR")
        );

        if (links.length === 0) {
            lista.append(criarElemento("p", "Nenhum link cadastrado."));
            return;
        }

        for (const link of links) {
            const cartao = criarElemento("article", "", "cartao");
            cartao.append(criarElemento("h3", link.titulo));

            if (link.descricao) {
                cartao.append(criarElemento("p", link.descricao));
            }

            const ancora = criarElemento("a", "Abrir site", "link-externo");
            ancora.href = link.url;
            ancora.target = "_blank";
            ancora.rel = "noopener noreferrer";
            cartao.append(ancora);

            cartao.append(criarElemento(
                "p",
                `Cadastrado por ${link.autorEmail || "Administrador"} • ${dataLegivel(link.criadoEm)}`,
                "meta"
            ));

            if (administrador) {
                const acoes = criarElemento("div", "", "acoes-cartao");

                acoes.append(criarBotao("Editar", () => {
                    $("linkId").value = link.id;
                    $("tituloLink").value = link.titulo || "";
                    $("urlLink").value = link.url || "";
                    $("descricaoLink").value = link.descricao || "";
                    $("btnSalvarLink").textContent = "Salvar alterações";
                    $("btnCancelarLink").classList.remove("oculto");
                    $("formLink").scrollIntoView({ behavior: "smooth" });
                }));

                acoes.append(criarBotao("Excluir", async () => {
                    if (!confirm("Deseja excluir este link?")) return;

                    try {
                        await deleteDoc(doc(db, "links", link.id));
                        await carregarLinks();
                    } catch (erro) {
                        console.error(erro);
                        mostrarMensagem("mensagemLinks", "Não foi possível excluir o link.", "erro");
                    }
                }));

                cartao.append(acoes);
            }

            lista.append(cartao);
        }
    } catch (erro) {
        console.error(erro);
        mostrarMensagem("mensagemLinks", "Erro ao carregar os links.", "erro");
    }
}

// ---------- ESCALA DE LIMPEZA ----------

const TAMANHO_EQUIPE = 4;

// Parte A
function obterNomesAlunos() {
    return [...new Set(
        ALUNOS
            .map(nome => String(nome).trim())
            .filter(Boolean)
    )].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function normalizarLista(lista, nomes) {
    const conjunto = new Set(
        Array.isArray(lista) ? lista : []
    );

    return nomes.filter(nome => conjunto.has(nome));
}

// Parte B
function selecionarEquipe(nomes, marcados, pendentes) {

    const marcadosSet = new Set(marcados);
    const pendentesSet = new Set(pendentes);

    // Pendentes sempre possuem prioridade.
    const filaPendentes = nomes.filter(
        nome => pendentesSet.has(nome)
    );

    // Alunos que ainda não limparam.
    const naoMarcados = nomes.filter(
        nome =>
            !marcadosSet.has(nome) &&
            !pendentesSet.has(nome)
    );

    // Seleciona até quatro integrantes.
    return [
        ...filaPendentes,
        ...naoMarcados
    ].slice(0, TAMANHO_EQUIPE);
}

// Parte C

function simularConclusao(
    atual,
    estado,
    nomes,
    alunosQueLimparam = []
) {
    const conjuntoAtual = new Set(atual);
    const conjuntoLimparam = new Set(alunosQueLimparam);

    // Todos os integrantes da equipe atual que NÃO foram
    // confirmados como participantes da limpeza ficam pendentes.
    const faltaram = atual.filter(
        nome => !conjuntoLimparam.has(nome)
    );

    // Mantém pendentes que já existiam e adiciona
    // os novos alunos que não participaram.
    const pendentesDepois = [
        ...estado.pendentes.filter(
            nome => !conjuntoAtual.has(nome)
        ),
        ...faltaram
    ];

    const pendentesOrganizados = normalizarLista(
        [...new Set(pendentesDepois)],
        nomes
    );

    // Remove dos marcados quem ficou pendente.
    const marcadosDepois = estado.marcados.filter(
        nome => !pendentesOrganizados.includes(nome)
    );

    // Adiciona somente quem realmente limpou.
    for (const nome of alunosQueLimparam) {
        if (!marcadosDepois.includes(nome)) {
            marcadosDepois.push(nome);
        }
    }

    // Verifica quem ainda não participou da limpeza
    // neste ciclo.
    const pendentesSet = new Set(pendentesOrganizados);
    const marcadosSet = new Set(marcadosDepois);

    const restantes = nomes.filter(
        nome =>
            !marcadosSet.has(nome) &&
            !pendentesSet.has(nome)
    );

    // O ciclo termina quando todos os alunos
    // já participaram e não existem pendências.
    const cicloFinalizado =
        restantes.length === 0 &&
        pendentesOrganizados.length === 0;

    // Quando o ciclo termina, começa um novo ciclo.
    const estadoFinal = cicloFinalizado
        ? {
            marcados: [],
            pendentes: [],
            faltasAtuais: []
        }
        : {
            marcados: normalizarLista(
                marcadosDepois,
                nomes
            ),
            pendentes: pendentesOrganizados,
            faltasAtuais: []
        };

    return {
        alunosQueLimparam,
        alunosQueNaoLimparam: faltaram,
        cicloFinalizado,
        estado: estadoFinal
    };
}

// Parte D

function calcularEquipeSeguinte(atual, estado, nomes) {

    /*
     * Esta função calcula uma equipe futura.
     *
     * Os alunos que estão na equipe atual não devem
     * aparecer novamente imediatamente.
     *
     * Pendentes possuem prioridade.
     */

    const pendentes = estado.pendentes.filter(
        nome => !atual.includes(nome)
    );

    const restantes = nomes.filter(
        nome =>
            !atual.includes(nome) &&
            !estado.pendentes.includes(nome) &&
            !estado.marcados.includes(nome)
    );

    const proxima = [
        ...pendentes,
        ...restantes
    ].slice(0, TAMANHO_EQUIPE);

    return {
        equipe: proxima,
        estadoProjetado: {
            ...estado
        }
    };
}


// Parte E
async function salvarEscala(
    estado,
    ultima,
    atual,
    proxima
) {
    const lote = writeBatch(db);

    lote.set(doc(db, "escala", "estado"), {
        marcados: [...estado.marcados],
        pendentes: [...estado.pendentes],
        faltasAtuais: [...estado.faltasAtuais],
        atualizadaEm: serverTimestamp()
    });

    lote.set(doc(db, "escala", "ultima"), {
        alunos: [...ultima],
        atualizadaEm: serverTimestamp()
    });

    lote.set(doc(db, "escala", "atual"), {
        alunos: [...atual],
        atualizadaEm: serverTimestamp()
    });

    lote.set(doc(db, "escala", "proxima"), {
        alunos: [...proxima],
        atualizadaEm: serverTimestamp()
    });

    await lote.commit();
}

// Parte F
async function obterRegistroEquipes() {

    const nomes = obterNomesAlunos();

    if (!nomes.length) {
        throw new Error("A lista de alunos está vazia.");
    }

    const referencias = [
        doc(db, "escala", "estado"),
        doc(db, "escala", "ultima"),
        doc(db, "escala", "atual"),
        doc(db, "escala", "proxima")
    ];

    const [
        snapshotEstado,
        snapshotUltima,
        snapshotAtual,
        snapshotProxima
    ] = await Promise.all(
        referencias.map(referencia => getDoc(referencia))
    );

    const dadosEstado = snapshotEstado.exists()
        ? snapshotEstado.data()
        : {};

    let estado = {
        marcados: normalizarLista(
            dadosEstado.marcados,
            nomes
        ),

        pendentes: normalizarLista(
            dadosEstado.pendentes,
            nomes
        ),

        faltasAtuais: []
    };

    let atual = snapshotAtual.exists()
        ? normalizarLista(
            snapshotAtual.data().alunos,
            nomes
        )
        : [];

    // Se ainda não existe uma equipe atual, seleciona a primeira.
    if (!atual.length) {
        atual = selecionarEquipe(
            nomes,
            estado.marcados,
            estado.pendentes
        );
    }

    // Só são consideradas faltas da equipe atual.
    estado.faltasAtuais = normalizarLista(
        dadosEstado.faltasAtuais,
        nomes
    ).filter(nome => atual.includes(nome));

    // Toda falta registrada também precisa estar na fila de pendentes.
    estado.pendentes = normalizarLista(
        [
            ...estado.pendentes,
            ...estado.faltasAtuais
        ],
        nomes
    );

    // Um aluno pendente não pode continuar marcado como quem já limpou.
    estado.marcados = estado.marcados.filter(
        nome => !estado.pendentes.includes(nome)
    );

    const ultima = snapshotUltima.exists()
        ? normalizarLista(
            snapshotUltima.data().alunos,
            nomes
        )
        : [];


// Usa a próxima equipe já salva no Firebase.
// Só calcula uma nova quando ainda não existe.
let proxima;

if (snapshotProxima.exists()) {

    proxima = normalizarLista(
        snapshotProxima.data().alunos,
        nomes
    );

} else {

    const resultado = calcularEquipeSeguinte(
        atual,
        estado,
        nomes
    );

    proxima = resultado.equipe;
}


    // Verifica se os documentos precisam ser criados ou corrigidos.
    const mudouEstado =
        !snapshotEstado.exists() ||
        JSON.stringify(dadosEstado.marcados || []) !==
            JSON.stringify(estado.marcados) ||
        JSON.stringify(dadosEstado.pendentes || []) !==
            JSON.stringify(estado.pendentes) ||
        JSON.stringify(dadosEstado.faltasAtuais || []) !==
            JSON.stringify(estado.faltasAtuais);

    const mudouUltima =
        !snapshotUltima.exists() ||
        JSON.stringify(snapshotUltima.data().alunos || []) !==
            JSON.stringify(ultima);

    const mudouAtual =
        !snapshotAtual.exists() ||
        JSON.stringify(snapshotAtual.data().alunos || []) !==
            JSON.stringify(atual);

    const mudouProxima =
        !snapshotProxima.exists() ||
        JSON.stringify(snapshotProxima.data().alunos || []) !==
            JSON.stringify(proxima);

    // Apenas administradores podem inicializar ou corrigir documentos.
    if (
        administrador &&
        (mudouEstado || mudouUltima || mudouAtual || mudouProxima)
    ) {
        await salvarEscala(
            estado,
            ultima,
            atual,
            proxima
        );
    }

    return {
        nomes,
        estado,
        ultima,
        atual,
        proxima
    };
}

// Parte G

async function carregarEscala() {

    try {

        escalaAtual = await obterRegistroEquipes();

        const lista = $("listaEquipes");

        lista.replaceChildren();

        const exibicoes = [
            {
                titulo: "Equipe anterior",
                alunos: escalaAtual.ultima,
                classe: "",
                tipo: "anterior"
            },
            {
                titulo: "Equipe atual",
                alunos: escalaAtual.atual,
                classe: "atual",
                tipo: "atual"
            },
            {
                titulo: "Próxima equipe",
                alunos: escalaAtual.proxima,
                classe: "",
                tipo: "proxima"
            }
        ];

        for (const item of exibicoes) {

            const cartao = criarElemento(
                "article",
                "",
                `cartao-equipe ${item.classe}`.trim()
            );

            cartao.append(
                criarElemento("h3", item.titulo)
            );

            /*
             * ==========================================
             * EQUIPE ATUAL
             * ==========================================
             *
             * Quando o administrador estiver confirmando,
             * os nomes aparecem com caixas de seleção
             * diretamente dentro deste cartão.
             */

            if (item.tipo === "atual" && administrador) {

                const explicacao = criarElemento(
                    "p",
                    "Marque quem realmente realizou a limpeza. Desmarque quem não limpou."
                );

                explicacao.className = "texto-confirmacao";

                cartao.append(explicacao);

                const listaConfirmacao =
                    document.createElement("div");

                listaConfirmacao.className =
                    "lista-confirmacao-equipe";

                item.alunos.forEach(nome => {

                    const label =
                        document.createElement("label");

                    label.className =
                        "aluno-confirmacao";

                    const checkbox =
                        document.createElement("input");

                    checkbox.type = "checkbox";
                    checkbox.value = nome;
                    checkbox.checked = true;

                    const texto =
                        document.createElement("span");

                    texto.textContent = nome;

                    label.append(
                        checkbox,
                        texto
                    );

                    listaConfirmacao.append(label);
                });

                cartao.append(listaConfirmacao);

                /*
                 * Botão para confirmar diretamente
                 * dentro da Equipe atual.
                 */
                const btnConfirmar =
                    criarBotao(
                        "Confirmar quem limpou",
                        async () => {

                            const alunosQueLimparam =
                                [
                                    ...listaConfirmacao
                                        .querySelectorAll(
                                            'input[type="checkbox"]:checked'
                                        )
                                ].map(
                                    input => input.value
                                );

                            const alunosQueNaoLimparam =
                                item.alunos.filter(
                                    nome =>
                                        !alunosQueLimparam.includes(nome)
                                );

                            const quantidadeFaltas =
                                alunosQueNaoLimparam.length;

                            const proximaEquipe =
                                [...escalaAtual.proxima];

                            if (
                                quantidadeFaltas >
                                proximaEquipe.length
                            ) {

                                mostrarMensagem(
                                    "mensagemEscala",
                                    "Não há alunos suficientes na próxima equipe para substituir todas as faltas.",
                                    "erro"
                                );

                                return;
                            }

                            try {

                                btnConfirmar.disabled = true;

                                /*
                                 * ==================================
                                 * SUBSTITUTOS
                                 * ==================================
                                 */

                                const substitutos =
                                    proximaEquipe.slice(
                                        0,
                                        quantidadeFaltas
                                    );

                                /*
                                 * ==================================
                                 * EQUIPE QUE REALMENTE LIMPOU HOJE
                                 * ==================================
                                 */

                                const equipeQueLimpouHoje =
                                    [
                                        ...alunosQueLimparam,
                                        ...substitutos
                                    ];

                                /*
                                 * ==================================
                                 * PENDENTES
                                 * ==================================
                                 */

                                const pendentes =
                                    [
                                        ...new Set([
                                            ...escalaAtual.estado.pendentes,
                                            ...alunosQueNaoLimparam
                                        ])
                                    ].filter(
                                        nome =>
                                            !substitutos.includes(nome)
                                    );

                                /*
                                 * ==================================
                                 * MARCADOS
                                 * ==================================
                                 */

                                let marcados =
                                    [
                                        ...escalaAtual.estado.marcados
                                    ];

                                /*
                                 * Quem ficou pendente
                                 * deixa de ser considerado concluído.
                                 */
                                marcados =
                                    marcados.filter(
                                        nome =>
                                            !pendentes.includes(nome)
                                    );

                                /*
                                 * Quem limpou hoje é marcado.
                                 */
                                for (
                                    const nome
                                    of equipeQueLimpouHoje
                                ) {

                                    if (
                                        !marcados.includes(nome)
                                    ) {
                                        marcados.push(nome);
                                    }
                                }

                                /*
                                 * ==================================
                                 * EQUIPE DO PRÓXIMO DIA
                                 * ==================================
                                 */

                                const restantesProxima =
                                    proximaEquipe.filter(
                                        nome =>
                                            !substitutos.includes(nome)
                                    );

                                const equipeProximoDia =
                                    [
                                        ...new Set([
                                            ...pendentes,
                                            ...restantesProxima
                                        ])
                                    ].slice(
                                        0,
                                        TAMANHO_EQUIPE
                                    );

                                /*
                                 * ==================================
                                 * ESTADO
                                 * ==================================
                                 */

                                const estado = {

                                    marcados:
                                        normalizarLista(
                                            marcados,
                                            escalaAtual.nomes
                                        ),

                                    pendentes:
                                        normalizarLista(
                                            pendentes,
                                            escalaAtual.nomes
                                        ),

                                    faltasAtuais: []
                                };

                                /*
                                 * ==================================
                                 * EQUIPE POSTERIOR
                                 * ==================================
                                 */

                                const equipePosterior =
                                    calcularEquipeSeguinte(
                                        equipeProximoDia,
                                        estado,
                                        escalaAtual.nomes
                                    ).equipe;

                                /*
                                 * ==================================
                                 * SALVA
                                 * ==================================
                                 */

                                await salvarEscala(
                                    estado,
                                    equipeQueLimpouHoje,
                                    equipeProximoDia,
                                    equipePosterior
                                );

                                /*
                                 * ==================================
                                 * ATUALIZA A TELA
                                 * ==================================
                                 */

                                if (
                                    quantidadeFaltas > 0
                                ) {

                                    mostrarMensagem(
                                        "mensagemEscala",
                                        `${quantidadeFaltas} aluno(s) não limpou(aram). ${substitutos.join(", ")} foi(ram) chamado(s) para substituir.`,
                                        "sucesso"
                                    );

                                } else {

                                    mostrarMensagem(
                                        "mensagemEscala",
                                        "Limpeza confirmada! Todos os integrantes realizaram a limpeza.",
                                        "sucesso"
                                    );
                                }

                                await carregarEscala();

                            } catch (erro) {

                                console.error(erro);

                                btnConfirmar.disabled = false;

                                mostrarMensagem(
                                    "mensagemEscala",
                                    "Não foi possível atualizar a escala.",
                                    "erro"
                                );
                            }
                        }
                    );

                btnConfirmar.className =
                    "btn-confirmar-limpeza";

                cartao.append(btnConfirmar);

            } else {

                /*
                 * ==========================================
                 * OUTRAS EQUIPES
                 * ==========================================
                 */

                const ol =
                    document.createElement("ol");

                const alunos =
                    [...item.alunos].sort(
                        (a, b) =>
                            a.localeCompare(
                                b,
                                "pt-BR"
                            )
                    );

                alunos.forEach(nome => {

                    const pendente =
                        escalaAtual.estado.pendentes
                            .includes(nome);

                    const texto =
                        pendente
                            ? `${nome} (pendente)`
                            : nome;

                    ol.append(
                        criarElemento(
                            "li",
                            texto
                        )
                    );
                });

                if (!alunos.length) {

                    cartao.append(
                        criarElemento(
                            "p",
                            item.tipo === "anterior"
                                ? "Nenhuma equipe concluiu a limpeza ainda."
                                : "Não há alunos disponíveis."
                        )
                    );

                } else {

                    cartao.append(ol);
                }
            }

            lista.append(cartao);
        }

        /*
         * Não precisamos mais de um botão separado
         * para registrar faltas.
         */
        $("acoesEscala").classList.add("oculto");

        mostrarMensagem(
            "mensagemEscala",
            "Escala de limpeza atualizada."
        );

    } catch (erro) {

        console.error(erro);

        mostrarMensagem(
            "mensagemEscala",
            "Não foi possível carregar a escala. Verifique as regras do Firestore.",
            "erro"
        );
    }
}


// Parte H

$("btnConcluirLimpeza").addEventListener("click", async () => {

    if (!administrador || !escalaAtual) return;

    const equipeAtual = [...escalaAtual.atual];
    const proximaEquipe = [...escalaAtual.proxima];

    if (!equipeAtual.length) {
        mostrarMensagem(
            "mensagemEscala",
            "Não há uma equipe atual para confirmar.",
            "erro"
        );
        return;
    }

    // ================================
    // CRIA O MODAL
    // ================================


    const conteudo = document.createElement("div");
    conteudo.className = "modal-conteudo";

    conteudo.append(
        criarElemento(
            "h2",
            "Quem realmente limpou?"
        )
    );

    conteudo.append(
        criarElemento(
            "p",
            "Deixe marcado quem realmente realizou a limpeza. Desmarque quem não limpou."
        )
    );

    const lista = document.createElement("div");
    lista.className = "lista-confirmacao-limpeza";

    // Todos começam marcados.
    equipeAtual.forEach(nome => {

        const label = document.createElement("label");
        label.className = "aluno-confirmacao";

        const checkbox = document.createElement("input");

        checkbox.type = "checkbox";
        checkbox.value = nome;
        checkbox.checked = true;

        const texto = document.createElement("span");
        texto.textContent = nome;

        label.append(
            checkbox,
            texto
        );

        lista.append(label);
    });

    // ================================
    // BOTÕES
    // ================================

    const botoes = document.createElement("div");
    botoes.className = "acoes-modal";

    const btnCancelar = criarBotao(
        "Cancelar",
        () => modal.remove()
    );

    const btnConfirmar = criarBotao(
        "Confirmar limpeza",
        async () => {

            // Quem foi marcado como quem limpou.
            const alunosQueLimparam = [
                ...lista.querySelectorAll(
                    'input[type="checkbox"]:checked'
                )
            ].map(input => input.value);

            // Quem foi desmarcado não limpou.
            const alunosQueNaoLimparam = equipeAtual.filter(
                nome => !alunosQueLimparam.includes(nome)
            );

            const quantidadeFaltas =
                alunosQueNaoLimparam.length;

            /*
             * Se ninguém foi marcado, todos ficaram pendentes.
             */
            if (alunosQueLimparam.length === 0) {

                const continuar = confirm(
                    "Nenhum aluno foi marcado como participante da limpeza.\n\n" +
                    "Todos ficarão pendentes.\n\n" +
                    "Deseja continuar?"
                );

                if (!continuar) return;
            }

            /*
             * Verifica se existe gente suficiente na próxima equipe
             * para substituir quem não limpou.
             */
            if (quantidadeFaltas > proximaEquipe.length) {

                mostrarMensagem(
                    "mensagemEscala",
                    "Não há alunos suficientes na próxima equipe para realizar todas as substituições.",
                    "erro"
                );

                return;
            }

            btnConfirmar.disabled = true;
            btnCancelar.disabled = true;

            try {

                // ==========================================
                // 1. SELECIONA OS SUBSTITUTOS
                // ==========================================

                const substitutos =
                    proximaEquipe.slice(0, quantidadeFaltas);

                // ==========================================
                // 2. NOVA EQUIPE QUE VAI LIMPAR HOJE
                // ==========================================

                const equipeQueLimpouHoje = [
                    ...alunosQueLimparam,
                    ...substitutos
                ];

                /*
                 * Remove duplicidades.
                 */
                const equipeAtualizada = [
                    ...new Set(equipeQueLimpouHoje)
                ];

                // ==========================================
                // 3. PENDENTES
                // ==========================================

                /*
                 * Os alunos que não limparam continuam pendentes.
                 *
                 * Os substitutos não ficam pendentes porque
                 * realizarão a limpeza hoje.
                 */
                const pendentes = [
                    ...new Set([
                        ...escalaAtual.estado.pendentes,
                        ...alunosQueNaoLimparam
                    ])
                ].filter(
                    nome => !substitutos.includes(nome)
                );

                // ==========================================
                // 4. MARCADOS
                // ==========================================

                /*
                 * Mantém os alunos que já haviam concluído
                 * anteriormente.
                 */
                let marcados = [
                    ...escalaAtual.estado.marcados
                ];

                /*
                 * Remove da lista de marcados quem ficou pendente.
                 */
                marcados = marcados.filter(
                    nome => !pendentes.includes(nome)
                );

                /*
                 * Marca quem limpou hoje.
                 */
                for (const nome of equipeAtualizada) {

                    if (!marcados.includes(nome)) {
                        marcados.push(nome);
                    }
                }

                /*
                 * Pendentes nunca podem estar em marcados.
                 */
                marcados = marcados.filter(
                    nome => !pendentes.includes(nome)
                );

          
// ==========================================
// 5. EQUIPE DO PRÓXIMO DIA
// ==========================================

/*
 * A próxima equipe original era, por exemplo:
 *
 * Eduardo
 * Enzo
 * Erick
 * Fernando
 *
 * Se 2 pessoas faltaram hoje, Eduardo e Enzo
 * entram para substituir.
 *
 * Portanto eles NÃO permanecem na equipe
 * do próximo dia.
 */

const restantesProximaEquipe =
    proximaEquipe.filter(
        nome => !substitutos.includes(nome)
    );

/*
 * Os alunos que faltaram hoje têm prioridade
 * no próximo dia.
 */
const pendentesOrdenados =
    normalizarLista(
        pendentes,
        escalaAtual.nomes
    );

/*
 * O próximo dia será formado por:
 *
 * 1. Pendentes de hoje
 * 2. Pessoas que sobraram da próxima equipe
 */
const equipeProximoDia = [
    ...new Set([
        ...pendentesOrdenados,
        ...restantesProximaEquipe
    ])
].slice(0, TAMANHO_EQUIPE);


// ==========================================
// 6. EQUIPE POSTERIOR
// ==========================================

/*
 * Para calcular a equipe posterior, consideramos
 * que a equipe do próximo dia realizará a limpeza.
 *
 * Assim, essas pessoas não são escolhidas
 * novamente imediatamente.
 */

const estadoProjetado = {
    marcados: [
        ...new Set([
            ...marcados,
            ...equipeProximoDia
        ])
    ].filter(
        nome => !pendentes.includes(nome)
    ),

    pendentes: [
        ...pendentes
    ],

    faltasAtuais: []
};

/*
 * A equipe posterior é formada pelos alunos
 * que ainda não estão marcados e que não fazem
 * parte da equipe do próximo dia.
 */
const equipePosterior =
    calcularEquipeSeguinte(
        equipeProximoDia,
        estadoProjetado,
        escalaAtual.nomes
    ).equipe;


// ==========================================
// 7. ESTADO FINAL
// ==========================================

const estado = {
    marcados: normalizarLista(
        marcados,
        escalaAtual.nomes
    ),

    pendentes: normalizarLista(
        pendentes,
        escalaAtual.nomes
    ),

    faltasAtuais: []
};


// ==========================================
// 8. SALVA A NOVA ORDEM
// ==========================================

/*
 * IMPORTANTE:
 *
 * ultima  = quem limpou hoje
 * atual   = quem limpa amanhã
 * proxima = quem limpa depois de amanhã
 */

await salvarEscala(
    estado,
    equipeAtualizada,
    equipeProximoDia,
    equipePosterior
);

                modal.remove();

                // ==========================================
                // 9. MENSAGEM
                // ==========================================

                if (quantidadeFaltas > 0) {

                    mostrarMensagem(
                        "mensagemEscala",
                        `${quantidadeFaltas} aluno(s) não limpou(aram). ${substitutos.join(", ")} foi(ram) chamado(s) para substituir hoje.`,
                        "sucesso"
                    );

                } else {

                    mostrarMensagem(
                        "mensagemEscala",
                        "Limpeza confirmada! Todos os integrantes realizaram a limpeza.",
                        "sucesso"
                    );
                }

                await carregarEscala();

            } catch (erro) {

                console.error(erro);

                btnConfirmar.disabled = false;
                btnCancelar.disabled = false;

                mostrarMensagem(
                    "mensagemEscala",
                    "Não foi possível atualizar a escala.",
                    "erro"
                );
            }
        }
    );

    botoes.append(
        btnCancelar,
        btnConfirmar
    );

    conteudo.append(
        lista,
        botoes
    );

    modal.append(conteudo);

    document.body.append(modal);
});

// ---------- PWA ----------

if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("./service-worker.js")
            .catch(erro => console.error("Erro ao registrar o PWA:", erro));
    });
}