# Neptune Prompt Guide

## Overview

Neptune compiles microfluidic device descriptions into physical layouts using the fluigi synthesis engine.

## Steps

### 1. Choose a Design Language

Select the input format for your device description:

- **MINT** — a concise, human-readable microfluidic netlist format
- **LFR** — a lower-level flow-and-route description format

### 2. Upload Your Source File

Upload your `.mint` or `.lfr` file using the file picker, or select one of the built-in examples from the dashboard.

### 3. (Optional) Upload a Config File

Some designs accept a JSON configuration file that controls synthesis parameters such as channel dimensions and component spacing.

### 4. Run Synthesis

Click **Compile** to submit your design to the Neptune compute backend. Synthesis runs asynchronously — you can monitor progress in the job status panel.

### 5. Download Results

When synthesis completes, download the generated layout files (JSON format) for use in downstream tools such as 3DuF or Aquacore.

## Tips

- Use the **Examples** tab to explore pre-built MINT and LFR designs.
- Synthesis typically takes 30–120 seconds depending on design complexity.
- If a job fails, check the error log for fluigi diagnostics.
