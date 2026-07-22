# Inline Badge

Componente portátil de badge inline para ações, links, abas e itens de navegação.

Este pacote é independente do `hSQLite Editor`.
Você pode copiar esta pasta para qualquer projeto e usar apenas:

- [inline-badge.css](inline-badge.css)
- [inline-badge.js](inline-badge.js)

Opcionalmente, abra [example.html](example.html) para ver os exemplos em funcionamento.

## Objetivo

Resolver dois padrões comuns de notificação visual:

1. `dot`
Sinal discreto de novidade, atenção ou estado pendente.

2. `count`
Badge com número para quantidade de notificações, itens pendentes, mensagens, releases ou alertas.

## Princípios

- Inline: o badge vive ao lado do label, não em overlay.
- Reutilizável: mesma API para botão, link, aba, item de menu ou card.
- Baixo ruído: `dot` não compete com o label principal.
- Previsível: `count` respeita limite máximo configurável.
- Sem dependência de framework.

## Estrutura mínima

```html
<button class="demo-trigger" type="button">
  <span>Novidades</span>
  <span
    class="inline-badge"
    data-inline-badge
    aria-hidden="true"
    style="display:none;"
  ></span>
</button>
```

## Como instalar

Inclua os arquivos:

```html
<link rel="stylesheet" href="./inline-badge.css">
<script src="./inline-badge.js"></script>
```

## API

Função principal:

```js
setInlineBadge(element, options)
```

### `options`

- `visible: boolean`
- `mode: "dot" | "count"`
- `tone: "danger" | "warning" | "success" | "info" | "neutral"`
- `count?: number`
- `max?: number`

### Regras

- `mode: "dot"` ignora `count`
- `mode: "count"` exige `count > 0`
- se `count > max`, o texto vira `max+`
- se `visible` for `false`, o badge é ocultado

## Exemplos

### 1. Badge simples com ponto

```js
const badge = document.querySelector("[data-inline-badge]");

setInlineBadge(badge, {
  visible: true,
  mode: "dot",
  tone: "danger"
});
```

### 2. Badge numérico

```js
setInlineBadge(badge, {
  visible: true,
  mode: "count",
  tone: "danger",
  count: 7
});
```

### 3. Badge numérico com limite

```js
setInlineBadge(badge, {
  visible: true,
  mode: "count",
  tone: "warning",
  count: 132,
  max: 99
});
```

Resultado:

```text
99+
```

### 4. Ocultar

```js
setInlineBadge(badge, {
  visible: false
});
```

## Padrões visuais recomendados

### Use `dot` quando

- existe novidade, mas a quantidade não importa
- o badge é secundário ao texto principal
- você quer o mínimo ruído visual possível

### Use `count` quando

- a quantidade muda a prioridade da ação
- o usuário precisa saber volume pendente
- o número ajuda tomada de decisão

## Tons

- `danger`: notificações importantes, pendências, novidades fortes
- `warning`: atenção moderada
- `success`: confirmação ou conclusão
- `info`: informação neutra/ativa
- `neutral`: apoio visual de baixa prioridade

## Acessibilidade

- O badge visual deve usar `aria-hidden="true"` quando o texto principal ou `aria-label` já comunica o estado.
- Quando o número for importante semanticamente, atualize também o `aria-label` do botão ou link pai.

Exemplo:

```js
button.setAttribute("aria-label", "Novidades da versão (3 versões novas)");
```

## Padrão de integração recomendado

1. O label continua sendo o ator principal.
2. O badge fica ao lado do label.
3. O botão ou link pai expõe o estado completo via `aria-label` ou `title`.
4. Evite overlay por padrão.

## Classes CSS

Base:

- `.inline-badge`

Variantes:

- `.inline-badge-dot`
- `.inline-badge-count`
- `.inline-badge-count-compact`

Tons:

- `.inline-badge-danger`
- `.inline-badge-warning`
- `.inline-badge-success`
- `.inline-badge-info`
- `.inline-badge-neutral`

## Contrato de uso

- O elemento do badge deve existir no DOM.
- O JS apenas configura estado e classes.
- O layout do pai deve ser `inline-flex` ou `flex` com alinhamento consistente.

## Variante documentada: `compact notification count`

Use esta variante quando o badge numérico precisar parecer mais próximo de um badge clássico de notificação:

- menor que o `count` padrão
- ligeiramente mais alto em relação ao label
- útil para cabeçalhos, navegação superior e ações ghost

CSS:

```css
.inline-badge-count-compact {
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  font-size: 9px;
  transform: translateY(-3px);
}
```

Markup:

```html
<button class="nav-action" type="button" aria-label="Novidades (3 versões novas)">
  <span>Novidades</span>
  <span
    class="inline-badge inline-badge-count-compact"
    data-inline-badge
    aria-hidden="true"
    style="display:none;"
  ></span>
</button>
```

Boot:

```js
setInlineBadge(document.querySelector("[data-inline-badge]"), {
  visible: true,
  mode: "count",
  tone: "danger",
  count: 3
});
```

## Exemplo de layout do pai

```css
.nav-action {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
```

## Integração no `hSQLite Editor`

No editor, o mesmo padrão foi aplicado ao botão `Novidades`:

- antes: badge `dot`
- agora: badge `count`
- valor: quantidade de versões exibidas no modal de releases
- ajuste visual específico: usa a variante compacta de count para parecer mais badge de notificação no header

Referência de implementação real:

- [src/capabilities/01-inline-badge.js](../../src/capabilities/01-inline-badge.js)
- [src/capabilities/10-release-metadata.js](../../src/capabilities/10-release-metadata.js)
- [src/styles/03-components.css](../../src/styles/03-components.css)

## Exemplo rápido de cópia para outro projeto

Arquivos mínimos:

- `inline-badge.css`
- `inline-badge.js`

Markup:

```html
<a class="nav-action" href="/updates" aria-label="Novidades (5 notificações)">
  <span>Novidades</span>
  <span class="inline-badge" data-inline-badge aria-hidden="true" style="display:none;"></span>
</a>
```

Boot:

```js
const badge = document.querySelector("[data-inline-badge]");

setInlineBadge(badge, {
  visible: true,
  mode: "count",
  tone: "danger",
  count: 5
});
```
