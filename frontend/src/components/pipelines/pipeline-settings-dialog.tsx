"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Pipeline } from "@/lib/api/client";
import {
  deletePipelineLogo,
  getPipelineLogoUrl,
  updatePipeline,
  uploadPipelineLogo,
} from "@/lib/api/pipelines";

type PipelineSettingsDialogProps = {
  pipeline: Pipeline;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function PipelineSettingsDialog({
  pipeline,
  open,
  onOpenChange,
}: PipelineSettingsDialogProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(pipeline.name);
  const [description, setDescription] = useState(pipeline.description ?? "");
  const [accentColor, setAccentColor] = useState(pipeline.accent_color);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  function handleOpenChange(nextOpen: boolean) {
    onOpenChange(nextOpen);
    if (nextOpen) {
      setName(pipeline.name);
      setDescription(pipeline.description ?? "");
      setAccentColor(pipeline.accent_color);
      setError(null);
    }
  }

  async function handleLogoUpload(file: File) {
    setIsUploadingLogo(true);
    setError(null);
    try {
      await uploadPipelineLogo(pipeline.id, file);
      router.refresh();
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Failed to upload logo",
      );
    } finally {
      setIsUploadingLogo(false);
    }
  }

  async function handleRemoveLogo() {
    setIsUploadingLogo(true);
    setError(null);
    try {
      await deletePipelineLogo(pipeline.id);
      router.refresh();
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : "Failed to remove logo",
      );
    } finally {
      setIsUploadingLogo(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await updatePipeline(pipeline.id, {
        name: name.trim(),
        description: description.trim() === "" ? null : description.trim(),
        accent_color: accentColor,
      });
      onOpenChange(false);
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to update pipeline",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="rounded-xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Pipeline settings</DialogTitle>
          <DialogDescription>
            Update name, description, accent color, and logo.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex items-center gap-3.5 rounded-lg border border-border bg-secondary/20 px-4 py-3">
            {pipeline.has_logo ? (
              <Image
                src={getPipelineLogoUrl(pipeline.id)}
                alt=""
                width={42}
                height={42}
                className="size-[42px] rounded-[11px] object-cover"
                unoptimized
              />
            ) : (
              <Image
                src="/brand/mark.svg"
                alt=""
                width={42}
                height={42}
                className="size-[42px] rounded-[11px] bg-primary/10 p-2 object-contain"
              />
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isUploadingLogo}
                onClick={() => fileInputRef.current?.click()}
              >
                {isUploadingLogo ? "Uploading..." : "Upload logo"}
              </Button>
              {pipeline.has_logo ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isUploadingLogo}
                  onClick={() => void handleRemoveLogo()}
                >
                  Remove
                </Button>
              ) : null}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void handleLogoUpload(file);
                  event.target.value = "";
                }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pipeline-settings-name">Name</Label>
            <Input
              id="pipeline-settings-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              maxLength={255}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pipeline-settings-description">Description</Label>
            <Input
              id="pipeline-settings-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={1024}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pipeline-settings-color">Accent color</Label>
            <Input
              id="pipeline-settings-color"
              type="color"
              value={accentColor}
              onChange={(event) => setAccentColor(event.target.value)}
              className="h-10 w-20 cursor-pointer p-1"
            />
          </div>
          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || name.trim() === ""}>
              {isSubmitting ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
