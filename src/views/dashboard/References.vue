<template>
  <v-container fluid class="references-page pa-6">
    <div class="references-header mb-4">
      <h1 class="references-title neptune-page-title-match mb-2">References</h1>
      <p class="references-subtitle mb-0">
        Structured language references for Neptune users and developers. Left side focuses on LFR, right side focuses on MINT.
      </p>
      <div class="references-overview mt-3">
        <div class="references-overview-title">Overview first</div>
        <p class="references-overview-text mb-1">
          Start with the combined manual to understand the difference between LFR and MINT before reading the detailed blocks below.
        </p>
        <a
          href="https://github.com/CIDARLAB/Neptune_2026/blob/main/docs/LFR_MINT_LANGUAGE_MANUAL.md"
          target="_blank"
          rel="noopener noreferrer"
          class="references-link"
        >Neptune LFR + MINT Language Manual</a>
        <p class="references-overview-text mt-2 mb-1">
          Naming alignment with Component Library: use lowercase <code>snake_case</code> in LFR/library context, and uppercase form for the same component name in MINT-facing displays.
        </p>
      </div>
    </div>

    <v-row>
      <v-col cols="12" md="6">
        <v-card class="references-card pa-4">
          <div class="references-card-title mb-3">LFR References</div>

          <div class="references-link-group mb-3">
            <a
              href="https://github.com/CIDARLAB/Neptune_2026/blob/main/docs/LFR-TestCases-wiki/Home.md"
              target="_blank"
              rel="noopener noreferrer"
              class="references-link"
            >LFR-TestCases Wiki Home (Neptune mirror)</a>
            <a
              href="https://github.com/CIDARLAB/Neptune_2026/blob/main/docs/LFR_READABLE_SYNTAX_SPEC_V2.md"
              target="_blank"
              rel="noopener noreferrer"
              class="references-link"
            >Neptune LFR Readable Syntax Spec (V2)</a>
          </div>

          <div class="references-block mb-3">
            <div class="references-block-title">Wiki-style syntax sections</div>
            <ul class="references-list">
              <li><a href="https://github.com/CIDARLAB/Neptune_2026/blob/main/docs/LFR-TestCases-wiki/LFR-Module-Breakdown.md" target="_blank" rel="noopener noreferrer" class="references-link-inline">1) Module Breakdown</a></li>
              <li><a href="https://github.com/CIDARLAB/Neptune_2026/blob/main/docs/LFR-TestCases-wiki/Varibles-Data-Types.md" target="_blank" rel="noopener noreferrer" class="references-link-inline">2) Variables and Data Types</a></li>
              <li><a href="https://github.com/CIDARLAB/Neptune_2026/blob/main/docs/LFR-TestCases-wiki/Types-LFR-Descriptions.md" target="_blank" rel="noopener noreferrer" class="references-link-inline">3) Types of LFR Descriptions</a></li>
              <li><a href="https://github.com/CIDARLAB/Neptune_2026/blob/main/docs/LFR-TestCases-wiki/FIG.md" target="_blank" rel="noopener noreferrer" class="references-link-inline">4) Fluid Interaction Graphs (FIG)</a></li>
              <li><a href="https://github.com/CIDARLAB/Neptune_2026/blob/main/docs/LFR-TestCases-wiki/Structural-Descriptions.md" target="_blank" rel="noopener noreferrer" class="references-link-inline">5) Structural Descriptions</a></li>
              <li><a href="https://github.com/CIDARLAB/Neptune_2026/blob/main/docs/LFR-TestCases-wiki/Technology-Mapping.md" target="_blank" rel="noopener noreferrer" class="references-link-inline">6) Technology Mapping</a></li>
              <li><a href="https://github.com/CIDARLAB/Neptune_2026/blob/main/docs/LFR-TestCases-wiki/Fluidic-Operations.md" target="_blank" rel="noopener noreferrer" class="references-link-inline">7) Fluidic Operations</a></li>
              <li><a href="https://github.com/CIDARLAB/Neptune_2026/blob/main/docs/LFR-TestCases-wiki/Flow-Annotations.md" target="_blank" rel="noopener noreferrer" class="references-link-inline">8) Flow Annotations</a></li>
              <li><a href="https://github.com/CIDARLAB/Neptune_2026/blob/main/docs/LFR-TestCases-wiki/Distribution-Blocks.md" target="_blank" rel="noopener noreferrer" class="references-link-inline">9) Distribution Blocks</a></li>
              <li><a href="https://github.com/CIDARLAB/Neptune_2026/blob/main/docs/LFR-TestCases-wiki/Control-Line-Logic.md" target="_blank" rel="noopener noreferrer" class="references-link-inline">10) Control Line Logic</a></li>
              <li><a href="https://github.com/CIDARLAB/Neptune_2026/blob/main/docs/LFR-TestCases-wiki/Imports-and-Module-Reuse.md" target="_blank" rel="noopener noreferrer" class="references-link-inline">11) Imports and Module Reuse</a></li>
              <li><a href="https://github.com/CIDARLAB/Neptune_2026/blob/main/docs/LFR-TestCases-wiki/Compiler-Directives.md" target="_blank" rel="noopener noreferrer" class="references-link-inline">12) Compiler Directives</a></li>
            </ul>
          </div>

          <div class="references-block">
            <div class="references-block-title">Neptune implementation entry points</div>
            <ul class="references-list">
              <li><span class="references-code">pylfr/lfrX.g4</span> (LFR grammar)</li>
              <li><span class="references-code">pylfr/lfr/preprocessor.py</span> (imports and preprocessing)</li>
              <li><span class="references-code">pylfr/lfr/api.py</span> (LFR compile API)</li>
            </ul>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card class="references-card pa-4">
          <div class="references-card-title mb-3">MINT References</div>

          <div class="references-link-group mb-3">
            <a
              href="https://pymint.readthedocs.io/en/latest/"
              target="_blank"
              rel="noopener noreferrer"
              class="references-link"
            >pymint documentation</a>
            <a
              href="https://parchmint.readthedocs.io/en/latest/"
              target="_blank"
              rel="noopener noreferrer"
              class="references-link"
            >parchmint documentation</a>
            <a
              href="https://github.com/CIDARLAB/pyMINT"
              target="_blank"
              rel="noopener noreferrer"
              class="references-link"
            >pyMINT GitHub</a>
            <a
              href="https://github.com/CIDARLAB/pyparchmint"
              target="_blank"
              rel="noopener noreferrer"
              class="references-link"
            >pyparchmint GitHub</a>
          </div>

          <div class="references-block mb-3">
            <div class="references-block-title">Wiki-aligned MINT sectioning</div>
            <ul class="references-list">
              <li><a href="https://github.com/CIDARLAB/Neptune_2026/blob/main/docs/MINT-TestCases-wiki/Device-and-File-Structure.md" target="_blank" rel="noopener noreferrer" class="references-link-inline">1) Device and file structure (<span class="references-code">DEVICE</span>, <span class="references-code">LAYER</span>)</a></li>
              <li><a href="https://github.com/CIDARLAB/Neptune_2026/blob/main/docs/MINT-TestCases-wiki/Variables-Data-Primitives-and-Identifiers.md" target="_blank" rel="noopener noreferrer" class="references-link-inline">2) Variables/data primitives and identifiers</a></li>
              <li><a href="https://github.com/CIDARLAB/Neptune_2026/blob/main/docs/MINT-TestCases-wiki/Description-Styles.md" target="_blank" rel="noopener noreferrer" class="references-link-inline">3) Description styles: flow-only vs flow+control</a></li>
              <li><a href="https://github.com/CIDARLAB/Neptune_2026/blob/main/docs/MINT-TestCases-wiki/Graph-Modeling-and-Connectivity-Intent.md" target="_blank" rel="noopener noreferrer" class="references-link-inline">4) Graph modeling and connectivity intent</a></li>
              <li><a href="https://github.com/CIDARLAB/Neptune_2026/blob/main/docs/MINT-TestCases-wiki/Structural-Descriptions.md" target="_blank" rel="noopener noreferrer" class="references-link-inline">5) Structural descriptions with explicit components</a></li>
              <li><a href="https://github.com/CIDARLAB/Neptune_2026/blob/main/docs/MINT-TestCases-wiki/Technology-Mapping-and-Primitive-Selection.md" target="_blank" rel="noopener noreferrer" class="references-link-inline">6) Technology mapping and primitive selection</a></li>
              <li><a href="https://github.com/CIDARLAB/Neptune_2026/blob/main/docs/MINT-TestCases-wiki/Fluidic-Operations-via-Components-and-Channels.md" target="_blank" rel="noopener noreferrer" class="references-link-inline">7) Fluidic operations via components/channels</a></li>
              <li><a href="https://github.com/CIDARLAB/Neptune_2026/blob/main/docs/MINT-TestCases-wiki/Flow-Annotations-and-Parameter-Fields.md" target="_blank" rel="noopener noreferrer" class="references-link-inline">8) Flow annotations and parameter fields</a></li>
              <li><a href="https://github.com/CIDARLAB/Neptune_2026/blob/main/docs/MINT-TestCases-wiki/Distribution-Behavior-through-Valves-and-Channels.md" target="_blank" rel="noopener noreferrer" class="references-link-inline">9) Distribution behavior through valves/channels</a></li>
              <li><a href="https://github.com/CIDARLAB/Neptune_2026/blob/main/docs/MINT-TestCases-wiki/Control-Line-Logic-in-LAYER-CONTROL.md" target="_blank" rel="noopener noreferrer" class="references-link-inline">10) Control line logic in <span class="references-code">LAYER CONTROL</span></a></li>
            </ul>
          </div>

          <div class="references-block">
            <div class="references-block-title">Neptune implementation entry points</div>
            <ul class="references-list">
              <li><span class="references-code">pylfr/pymint/</span> (MINT parser/compiler code)</li>
              <li><span class="references-code">pylfr/pyparchmint/</span> (ParchMINT data model and serialization)</li>
              <li><span class="references-code">fluigi/cmdline.py</span> (compile_mint and synthesis commands)</li>
            </ul>
          </div>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
export default {
  name: 'ReferencesPage',
}
</script>

<style scoped>
.references-page {
  min-height: 100%;
}

.references-subtitle {
  font-size: var(--neptune-fs-body, 14pt);
  line-height: 1.45;
  color: rgba(0, 0, 0, 0.78);
}

.theme--dark .references-subtitle {
  color: rgba(255, 255, 255, 0.82);
}

.references-overview {
  border: 1px solid rgba(0, 51, 73, 0.16);
  border-radius: 8px;
  padding: 10px 12px;
  background: rgba(0, 105, 148, 0.04);
}

.theme--dark .references-overview {
  border-color: rgba(0, 172, 193, 0.34);
  background: rgba(0, 172, 193, 0.08);
}

.references-overview-title {
  font-size: var(--neptune-fs-label, 13.25pt);
  font-weight: 700;
  color: #006994;
}

.theme--dark .references-overview-title {
  color: #00acc1;
}

.references-overview-text {
  font-size: var(--neptune-fs-body, 14pt);
  line-height: 1.4;
}

.references-card {
  border-radius: 10px;
  border: 1px solid rgba(0, 51, 73, 0.16);
  height: 100%;
}

.theme--dark .references-card {
  border-color: rgba(0, 172, 193, 0.36);
}

.references-card-title {
  font-size: var(--neptune-fs-section, 1.1875rem);
  font-weight: 700;
  color: #006994;
}

.theme--dark .references-card-title {
  color: #00acc1;
}

.references-link-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.references-link {
  font-size: var(--neptune-fs-body, 14pt);
  line-height: 1.35;
  text-decoration: underline;
  color: #006994;
}

.theme--dark .references-link {
  color: #4dd0e1;
}

.references-block-title {
  font-size: var(--neptune-fs-label, 13.25pt);
  font-weight: 700;
  margin-bottom: 6px;
}

.references-list {
  margin: 0;
  padding-left: 20px;
}

.references-list li {
  margin-bottom: 4px;
  font-size: var(--neptune-fs-body, 14pt);
  line-height: 1.35;
}

.references-link-inline {
  text-decoration: underline;
}

.references-code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  background: rgba(0, 0, 0, 0.06);
  border-radius: 4px;
  padding: 0 4px;
}

.theme--dark .references-code {
  background: rgba(255, 255, 255, 0.1);
}
</style>
