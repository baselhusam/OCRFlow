export type PaletteAddParams = Record<string, string | boolean | number>;
type PaletteAddHandler = (modelId: string, params?: PaletteAddParams) => void;
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

export function requestPaletteAdd(modelId: string, params?: PaletteAddParams) {
  paletteAddHandler?.(modelId, params);
}

export function requestPaletteAddPipeline(pipelineId: string) {
  paletteAddPipelineHandler?.(pipelineId);
}
