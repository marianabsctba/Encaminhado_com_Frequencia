# Encaminhado com Frequência

Você é o vírus. Tudo começa num pendrive esquecido na LAN House de Santa Rita do Oeste, uma cidadezinha do interior. Você se espalha pelo grupo da família, pelo Wi-Fi da padaria e pela senha fraca da prefeitura, enquanto a Dandara, a única técnica da cidade, tenta te apagar.

Jogue em: https://marianabsctba.github.io/Encaminhado_com_Frequencia/

## Ato 1: Santa Rita do Oeste

- Escolha o que você quer ser: **Sequestro** (tranca arquivos e cobra resgate), **Enxame** (domina o maior número de aparelhos) ou **Fofoca** (descobre os segredos da cidade sem ser percebido).
- Clique nas casas para ver moradores e aparelhos e para atacar.
- Gaste acessos para aprender truques. Cada truque explica como o ataque funciona de verdade e como se defender.
- Todo contágio faz barulho. Barulho acorda a Dandara, que limpa casas, dá palestra na igreja e, furiosa, monta uma vacina.
- No fim, o relatório da Dandara mostra como a cidade poderia ter te barrado.

Tudo é conceitual: o jogo explica ideias de ataque e defesa, sem nada que funcione fora dele.

## Para desenvolver

```
npm install
npm run dev      # servidor local
npm test         # robô joga centenas de partidas e confere o equilíbrio
npm run build
```

- `src/sim`: a simulação do contágio e a Dandara, sem 3D (o robô dos testes joga por aqui).
- `src/mundo`: a cidade em 3D e o visual mangá (nanquim, retícula, preto e branco que poupa o rosa).
- `src/roteiro`: retratos das falas.
- `tests`: o robô e os testes de equilíbrio do Ato 1.

Tudo é ficção. Nomes de pessoas, lugares, empresas e aplicativos são inventados.
