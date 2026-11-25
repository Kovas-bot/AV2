/* GUZ NATION - ordenação de produtos e carrinho de compras */
(function () {
    'use strict';

    var CHAVE = 'guzNationCarrinho';
    var memoria = []; // reserva caso o navegador bloqueie o localStorage

    /* ---------- utilidades ---------- */

    function paginaAtual() {
        var arquivo = decodeURIComponent(location.pathname.split('/').pop() || 'index.html');
        return arquivo.replace('.html', '');
    }

    function precoParaNumero(texto) {
        // "R$ 1.234,56" -> 1234.56
        var limpo = String(texto).replace(/[^\d,]/g, '').replace(',', '.');
        var numero = parseFloat(limpo);
        return isNaN(numero) ? 0 : numero;
    }

    function formatarPreco(valor) {
        return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    function slug(texto) {
        return texto.toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }

    // Cria elementos sem usar innerHTML
    function h(tag, props, filhos) {
        var e = document.createElement(tag);
        Object.keys(props || {}).forEach(function (k) {
            if (k === 'class') { e.className = props[k]; }
            else if (k.indexOf('on') === 0) { e.addEventListener(k.slice(2), props[k]); }
            else { e.setAttribute(k, props[k]); }
        });
        (filhos || []).forEach(function (f) {
            e.appendChild(typeof f === 'string' ? document.createTextNode(f) : f);
        });
        return e;
    }

    /* ---------- armazenamento do carrinho ---------- */

    function lerCarrinho() {
        try {
            var bruto = localStorage.getItem(CHAVE);
            var lista = bruto ? JSON.parse(bruto) : [];
            return Array.isArray(lista) ? lista : [];
        } catch (e) {
            return memoria;
        }
    }

    function salvarCarrinho(lista) {
        memoria = lista;
        try { localStorage.setItem(CHAVE, JSON.stringify(lista)); } catch (e) { /* ignora */ }
        atualizarContador();
    }

    function adicionarAoCarrinho(produto) {
        var lista = lerCarrinho();
        var existente = lista.filter(function (i) { return i.id === produto.id; })[0];
        if (existente) {
            existente.qtd += 1;
        } else {
            lista.push({ id: produto.id, nome: produto.nome, preco: produto.preco, img: produto.img, qtd: 1 });
        }
        salvarCarrinho(lista);
    }

    function alterarQuantidade(id, delta) {
        var lista = lerCarrinho().map(function (i) {
            if (i.id === id) { i.qtd += delta; }
            return i;
        }).filter(function (i) { return i.qtd > 0; });
        salvarCarrinho(lista);
        renderizarCarrinho();
    }

    function removerItem(id) {
        salvarCarrinho(lerCarrinho().filter(function (i) { return i.id !== id; }));
        renderizarCarrinho();
    }

    function totalDeItens() {
        return lerCarrinho().reduce(function (soma, i) { return soma + i.qtd; }, 0);
    }

    function totalEmReais() {
        return lerCarrinho().reduce(function (soma, i) { return soma + i.preco * i.qtd; }, 0);
    }

    /* ---------- cabeçalho: contador e aviso ---------- */

    function atualizarContador() {
        var link = document.querySelector('.user-actions a[href="carrinho.html"]');
        if (!link) { return; }
        var selo = link.querySelector('.cart-count');
        if (!selo) {
            selo = h('span', { 'class': 'cart-count' });
            link.appendChild(selo);
        }
        var n = totalDeItens();
        selo.textContent = n;
        selo.style.display = n > 0 ? 'inline-block' : 'none';
    }

    var temporizadorAviso;
    function mostrarAviso(mensagem) {
        var aviso = document.querySelector('.toast');
        if (!aviso) {
            aviso = h('div', { 'class': 'toast', role: 'status', 'aria-live': 'polite' });
            document.body.appendChild(aviso);
        }
        aviso.textContent = mensagem;
        // força o navegador a reconhecer o estado inicial antes da animação
        void aviso.offsetWidth;
        aviso.classList.add('show');
        clearTimeout(temporizadorAviso);
        temporizadorAviso = setTimeout(function () { aviso.classList.remove('show'); }, 2200);
    }

    /* ---------- páginas de categoria: ordenação e botões ---------- */

    function dadosDoCard(card) {
        var nome = card.querySelector('h3').textContent.trim();
        var preco = precoParaNumero(card.querySelector('.price').textContent);
        var img = card.querySelector('img');
        return {
            id: paginaAtual() + ':' + slug(nome),
            nome: nome,
            preco: preco,
            img: img ? img.getAttribute('src') : ''
        };
    }

    function iniciarOrdenacao() {
        var select = document.querySelector('.category-toolbar select');
        var grade = document.querySelector('.products');
        if (!select || !grade) { return; }

        var itens = Array.prototype.map.call(grade.querySelectorAll('.product-card'), function (card, indice) {
            var d = dadosDoCard(card);
            return { card: card, nome: d.nome, preco: d.preco, ordem: indice };
        });

        var criterios = {
            relevantes: function (a, b) { return a.ordem - b.ordem; },
            menor: function (a, b) { return a.preco - b.preco || a.ordem - b.ordem; },
            maior: function (a, b) { return b.preco - a.preco || a.ordem - b.ordem; },
            az: function (a, b) {
                return a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base', numeric: true }) || a.ordem - b.ordem;
            }
        };

        select.addEventListener('change', function () {
            var comparar = criterios[select.value] || criterios.relevantes;
            itens.slice().sort(comparar).forEach(function (item) {
                grade.appendChild(item.card); // reanexar move o card para a nova posição
            });
        });
    }

    function iniciarBotoes() {
        var grade = document.querySelector('.products');
        if (!grade) { return; }

        grade.addEventListener('click', function (evento) {
            var botao = evento.target.closest('.btn-carrinho, .btn-comprar');
            if (!botao) { return; }
            var card = botao.closest('.product-card');
            var produto = dadosDoCard(card);

            adicionarAoCarrinho(produto);

            if (botao.classList.contains('btn-comprar')) {
                location.href = 'carrinho.html';
            } else {
                mostrarAviso('✔ ' + produto.nome + ' adicionado ao carrinho');
            }
        });
    }

    /* ---------- página do carrinho ---------- */

    function blocoVazio(titulo, texto, icone) {
        return h('div', { 'class': 'cart-empty' }, [
            h('div', { 'class': 'icon' }, [icone]),
            h('h2', {}, [titulo]),
            h('p', { 'class': 'muted' }, [texto]),
            h('p', { style: 'margin-top:18px' }, [
                h('a', { 'class': 'btn', href: 'index.html' }, ['Continuar navegando'])
            ])
        ]);
    }

    function linhaDoItem(item) {
        var imagem = item.img
            ? h('img', { src: item.img, alt: item.nome })
            : h('span', {}, ['Sem imagem']);

        return h('div', { 'class': 'cart-item' }, [
            h('div', { 'class': 'cart-item-img' }, [imagem]),
            h('div', { 'class': 'cart-item-info' }, [
                h('h3', {}, [item.nome]),
                h('p', { 'class': 'muted' }, [formatarPreco(item.preco) + ' cada'])
            ]),
            h('div', { 'class': 'cart-qty' }, [
                h('button', { type: 'button', 'aria-label': 'Diminuir quantidade', onclick: function () { alterarQuantidade(item.id, -1); } }, ['−']),
                h('span', {}, [String(item.qtd)]),
                h('button', { type: 'button', 'aria-label': 'Aumentar quantidade', onclick: function () { alterarQuantidade(item.id, 1); } }, ['+'])
            ]),
            h('div', { 'class': 'cart-item-subtotal' }, [formatarPreco(item.preco * item.qtd)]),
            h('button', { type: 'button', 'class': 'cart-remove', onclick: function () { removerItem(item.id); } }, ['Remover'])
        ]);
    }

    function finalizarCompra() {
        salvarCarrinho([]);
        var raiz = document.getElementById('carrinho');
        raiz.textContent = '';
        raiz.appendChild(blocoVazio('Pedido realizado com sucesso!', 'Obrigado por comprar na GUZ NATION.', '🎉'));
    }

    function renderizarCarrinho() {
        var raiz = document.getElementById('carrinho');
        if (!raiz) { return; }

        var lista = lerCarrinho();
        raiz.textContent = '';

        if (lista.length === 0) {
            raiz.appendChild(blocoVazio('Seu carrinho está vazio', 'Adicione produtos para visualizá-los aqui.', '🛒'));
            return;
        }

        lista.forEach(function (item) { raiz.appendChild(linhaDoItem(item)); });

        raiz.appendChild(h('p', { 'class': 'cart-total' }, ['Total: ', h('strong', {}, [formatarPreco(totalEmReais())])]));

        raiz.appendChild(h('div', { 'class': 'cart-actions' }, [
            h('div', { 'class': 'cart-actions-left' }, [
                h('a', { 'class': 'btn', href: 'index.html' }, ['Continuar comprando']),
                h('button', { type: 'button', 'class': 'btn btn-limpar', onclick: function () { salvarCarrinho([]); renderizarCarrinho(); } }, ['Limpar carrinho'])
            ]),
            h('button', { type: 'button', 'class': 'btn btn-comprar', onclick: finalizarCompra }, ['Finalizar compra'])
        ]));
    }

    /* ---------- início ---------- */

    function iniciar() {
        atualizarContador();
        iniciarOrdenacao();
        iniciarBotoes();
        renderizarCarrinho();
        // mantém abas diferentes sincronizadas
        window.addEventListener('storage', function (e) {
            if (e.key === CHAVE) { atualizarContador(); renderizarCarrinho(); }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', iniciar);
    } else {
        iniciar();
    }
})();
