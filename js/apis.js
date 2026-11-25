(function () {
    'use strict';

    function paginaAtual() {
        var nome = location.pathname.split('/').pop().replace('.html', '');
        return nome === '' ? 'index' : nome;
    }

    function criarEstilo() {
        if (document.getElementById('estilo-apis')) { return; }
        var css = document.createElement('style');
        css.id = 'estilo-apis';
        css.textContent =
            '.api-box{background:#fff;border:1px solid #ddd;border-left:5px solid #2e7d32;border-radius:8px;padding:16px 20px;margin:0 0 20px 0;font-family:inherit}' +
            '.api-box h2{font-size:1.1rem;margin:0 0 10px 0}' +
            '.api-box p{margin:4px 0}' +
            '.api-box .api-erro{color:#b71c1c}' +
            '.api-box input{padding:8px;border:1px solid #bbb;border-radius:6px;margin-right:8px}' +
            '.api-box button{padding:8px 14px;border:0;border-radius:6px;background:#2e7d32;color:#fff;cursor:pointer}' +
            '.api-box button:hover{background:#1b5e20}';
        document.head.appendChild(css);
    }

    function criarCaixa(id, titulo) {
        var main = document.querySelector('main.container') || document.querySelector('main');
        if (!main) { return null; }
        var caixa = document.createElement('section');
        caixa.className = 'api-box';
        caixa.id = id;
        var h2 = document.createElement('h2');
        h2.textContent = titulo;
        var corpo = document.createElement('div');
        corpo.className = 'api-corpo';
        corpo.textContent = 'Carregando...';
        caixa.appendChild(h2);
        caixa.appendChild(corpo);
        main.insertBefore(caixa, main.firstChild);
        return corpo;
    }

    function dinheiro(valor) {
        return 'R$ ' + Number(valor).toFixed(2).replace('.', ',');
    }

    function mostrarErro(corpo, mensagem) {
        corpo.innerHTML = '';
        var p = document.createElement('p');
        p.className = 'api-erro';
        p.textContent = mensagem;
        corpo.appendChild(p);
    }

    function iniciarCotacao() {
        var corpo = criarCaixa('api-cotacao', 'Cotação do dia');
        if (!corpo) { return; }

        fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL')
            .then(function (r) {
                if (!r.ok) { throw new Error('Falha na resposta'); }
                return r.json();
            })
            .then(function (dados) {
                corpo.innerHTML = '';
                var moedas = [
                    { chave: 'USDBRL', nome: 'Dólar' },
                    { chave: 'EURBRL', nome: 'Euro' }
                ];
                moedas.forEach(function (m) {
                    var item = dados[m.chave];
                    var p = document.createElement('p');
                    p.textContent = m.nome + ': ' + dinheiro(item.bid) +
                        '  |  variação de ' + item.pctChange + '%';
                    corpo.appendChild(p);
                });
                var fonte = document.createElement('p');
                fonte.textContent = 'Atualizado em ' + dados.USDBRL.create_date;
                corpo.appendChild(fonte);
            })
            .catch(function () {
                mostrarErro(corpo, 'Não foi possível carregar a cotação agora.');
            });
    }

    function iniciarClima() {
        var corpo = criarCaixa('api-clima', 'Clima agora na região de Pinhais');
        if (!corpo) { return; }

        var url = 'https://api.open-meteo.com/v1/forecast' +
            '?latitude=-25.44&longitude=-49.19' +
            '&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m' +
            '&timezone=America%2FSao_Paulo';

        fetch(url)
            .then(function (r) {
                if (!r.ok) { throw new Error('Falha na resposta'); }
                return r.json();
            })
            .then(function (dados) {
                var c = dados.current;
                corpo.innerHTML = '';

                var linhas = [
                    'Temperatura: ' + c.temperature_2m + ' °C',
                    'Umidade: ' + c.relative_humidity_2m + '%',
                    'Vento: ' + c.wind_speed_10m + ' km/h',
                    'Chuva: ' + c.precipitation + ' mm'
                ];
                linhas.forEach(function (texto) {
                    var p = document.createElement('p');
                    p.textContent = texto;
                    corpo.appendChild(p);
                });

                var dica = document.createElement('p');
                if (c.precipitation > 0) {
                    dica.textContent = 'Dica: está chovendo, vale levar barraca e capa de chuva.';
                } else if (c.temperature_2m < 12) {
                    dica.textContent = 'Dica: frio, leve saco de dormir e roupas térmicas.';
                } else {
                    dica.textContent = 'Dica: tempo bom para acampar.';
                }
                corpo.appendChild(dica);
            })
            .catch(function () {
                mostrarErro(corpo, 'Não foi possível carregar o clima agora.');
            });
    }

    function iniciarFrete() {
        var corpo = criarCaixa('api-frete', 'Calcular frete pelo CEP');
        if (!corpo) { return; }

        corpo.innerHTML = '';

        var campo = document.createElement('input');
        campo.type = 'text';
        campo.id = 'campo-cep';
        campo.placeholder = 'Digite o CEP, só números';
        campo.maxLength = 9;

        var botao = document.createElement('button');
        botao.type = 'button';
        botao.textContent = 'Consultar';

        var resultado = document.createElement('div');
        resultado.id = 'resultado-cep';
        resultado.style.marginTop = '10px';

        corpo.appendChild(campo);
        corpo.appendChild(botao);
        corpo.appendChild(resultado);

        var tabelaFrete = {
            PR: 15, SC: 22, RS: 25, SP: 20, RJ: 28, MG: 28
        };

        function consultar() {
            var cep = campo.value.replace(/\D/g, '');
            resultado.innerHTML = '';

            if (cep.length !== 8) {
                mostrarErro(resultado, 'Informe um CEP com 8 números.');
                return;
            }

            resultado.textContent = 'Consultando...';

            fetch('https://viacep.com.br/ws/' + cep + '/json/')
                .then(function (r) {
                    if (!r.ok) { throw new Error('Falha na resposta'); }
                    return r.json();
                })
                .then(function (d) {
                    resultado.innerHTML = '';
                    if (d.erro) {
                        mostrarErro(resultado, 'CEP não encontrado.');
                        return;
                    }
                    var valor = tabelaFrete[d.uf] || 35;

                    var l1 = document.createElement('p');
                    l1.textContent = d.logradouro + ', ' + d.bairro;
                    var l2 = document.createElement('p');
                    l2.textContent = d.localidade + ' - ' + d.uf;
                    var l3 = document.createElement('p');
                    l3.textContent = 'Frete estimado: ' + dinheiro(valor);

                    resultado.appendChild(l1);
                    resultado.appendChild(l2);
                    resultado.appendChild(l3);
                })
                .catch(function () {
                    mostrarErro(resultado, 'Não foi possível consultar o CEP agora.');
                });
        }

        botao.addEventListener('click', consultar);
        campo.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') { consultar(); }
        });
    }

    function iniciar() {
        criarEstilo();
        var pagina = paginaAtual();
        if (pagina === 'index') { iniciarCotacao(); }
        if (pagina === 'camping') { iniciarClima(); }
        if (pagina === 'carrinho') { iniciarFrete(); }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', iniciar);
    } else {
        iniciar();
    }
})();