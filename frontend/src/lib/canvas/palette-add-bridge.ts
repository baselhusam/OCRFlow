type PaletteAddHandler = (modelId: string) => void;
type PaletteAddPipelineHandler = (pipelineId: string) => void;

let paletteAddHandler: PaletteAddHandler | null = null;
let paletteAddPipelineHandler: PaletteAddPipelineHandler | null = null;

export function registerPaletteAddHandler(handler: PaletteAddHandler | null) {
  paletteAddHandler = handler;
}

export function registerPaletteAddPipelineHandler(
  handler: PaletteAddPipelineHandler | null,
) {
  paletteAddPipelineHandler = handler;
}

export function requestPaletteAdd(modelId: string) {
  paletteAddHandler?.(modelId);
}

export function requestPaletteAddPipeline(pipelineId: string) {
  paletteAddPipelineHandler?.(pipelineId);
}
