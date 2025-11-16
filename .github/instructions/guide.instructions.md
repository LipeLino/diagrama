---
applyTo: '**'
---

# GitHub Copilot Instructions – Redeagromet TCC Figures

You are assisting in a Next.js (App Router) project for the **Redeagromet** TCC.  
Your current priority is to **implement and maintain the figure components** used in the thesis.

---

## 1. Context

- The project is a web platform for **agrometeorological monitoring** in the Triângulo Mineiro Sul region.
- The TCC uses **vector diagrams** (React + SVG) that must:
  - be reusable,
  - follow a consistent visual language,
  - support **export to vector PDF**.

Existing figures you MUST study and imitate before modifying/adding anything:

- `app/figura-02/Figure02_Encadeamento.tsx`
- `app/figura-03/Figure03_IoT_Arquitetura.tsx`
- `app/figura-04/Figure04_BalancoEnergia.tsx`
- `app/fig-pipelineconceitual/fig-pipelineconceitual.tsx`

These files define:
- how components are structured,
- how SVG layouts are built (groups, transforms, arrows, labels),
- how **PDF export** is wired.

> Always open and read these files before generating or editing code for new figures.  
> Reuse their patterns instead of inventing new ones.

---

## 2. Global rules for all figures

When working on **any** figure component (existing or new):

1. **No new visual styles**
   - Do **not** create new colors, fonts, borders, or spacing scales.
   - Reuse the same visual primitives and helpers that Figures 02, 03, 04 and the pipeline use
     (components for boxes, arrows, grids, labels, etc.).

2. **Vector + PDF export**
   - Figures must render as **pure SVG** (no raster images).
   - Reuse the same **PDF export mechanism** used by `Figure02_Encadeamento.tsx`
     (import the same hook / helper, don’t duplicate export logic).

3. **Component structure**
   - Use **TypeScript + React**.
   - One component per figure, in `app/figura-XX/` with a default export, for example:
     - `app/figura-05/Figure05_LocalizacaoEstacoes.tsx`
     - `app/figura-06/Figure06_ArquiteturaLogica.tsx`
     - `app/figura-07/Figure07_C4_Containers.tsx`
     - `app/figura-08/Figure08_FluxoETL.tsx`
     - `app/figura-09/Figure09_SequenciaET0.tsx`
     - `app/figura-10/Figure10_ETLTempoExecucao.tsx`
     - `app/figura-11/Figure11_SazonalidadeET0.tsx`
     - `app/figura-12/Figure12_LatenciaAPIs.tsx`
     - `app/figura-13/Figure13_EstadoPainel.tsx`
     - `app/figura-14/Figure14_PipelineGDD.tsx`
   - Accept data via props or small typed mocks.  
     Do **not** query databases, call HTTP APIs or read files directly inside figure components.

4. **Naming and labels**
   - Use Portuguese labels consistent with the TCC:
     - ET₀, GDD, “Redeagromet”, nomes de estações, etc.
   - Keep route and table names exactly as in the codebase:
     - e.g. `/api/chart-data`, `/api/export`, `weather_readings`, `daily_evapotranspiration`.

5. **Do not break existing figures**
   - Do not change the public API or styling of `Figure02`, `Figure03`, `Figure04` or `fig-pipelineconceitual`.
   - If you need utilities, import them instead of copying or rewriting.

---

## 3. Data sources

For station metadata used in **Figure 5** (map of stations):

- There is a CSV file with station data (path to be defined by the maintainer, e.g. `data/stations.csv`) with columns:

  ```csv
  Estacao,Cidade/UF,Device ID,Coordenadas (decimais),Altitude (m),Coordenadas (cardinal),Provedor
  Sao Francisco de Sales,Sao Francisco de Sales/MG,3424,"(-19.8612, -49.7689)",437,"19.8612 deg S, 49.7689 deg W",Plugfield
  Prata,Prata/MG,4971,"(-19.3088, -48.9276)",630,"19.3088 deg S, 48.9276 deg W",Plugfield
  Aparecida de Minas,Frutal/MG,FRUTALAG,"(-20.1119, -49.2320)",463,"20.1119 deg S, 49.2320 deg W",Ativa
  Frutal,Frutal/MG,FRUTALMT,"(-20.0303, -48.9356)",525,"20.0303 deg S, 48.9356 deg W",Ativa
  Pirajuba e Campo Florido,Pirajuba e Campo Florido/MG,9400,"(-19.8710175519, -48.6554272745)",584,"19.8710 deg S, 48.6554 deg W",Plugfield
  Planura,Planura/MG,9453,"(-20.1417355955, -48.7038773682)",475,"20.1417 deg S, 48.7039 deg W",Plugfield
  Frutal (Sigma),Frutal/MG,FRUTALAPI,"(-20.0183, -48.9517)",519,"20.0183 deg S, 48.9517 deg W",Sigma
