

## Plano: Corrigir header no mobile — remover transparência e artefatos visuais

### Problema
No mobile, o header (barra com logo Vektor) está com fundo semi-transparente (`bg-background/60` com `backdrop-blur`), causando uma "mancha" visual e deixando o conteúdo vazar por trás. A barra branca translúcida polui o layout.

### Solução

**Arquivo: `src/components/layout/AppLayout.tsx` (linha 22)**

Alterar a classe do `<header>` para usar fundo totalmente opaco, removendo a transparência e o backdrop-blur:

De:
```
bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60
```

Para:
```
bg-background
```

Isso elimina a transparência, a mancha visual e a sensação de "barra tampando" o conteúdo. O header fica com fundo sólido e limpo.

