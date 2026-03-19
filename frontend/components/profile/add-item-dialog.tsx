"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import DateSelect from "@/components/ui/date-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export interface FieldConfig {
  name: string;
  label: string;
  type: "text" | "select" | "date" | "number" | "checkbox";
  required?: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
  defaultValue?: string | number | boolean;
}

interface AddItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  fields: FieldConfig[];
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
}

export default function AddItemDialog({
  open,
  onOpenChange,
  title,
  description,
  fields,
  onSubmit,
}: AddItemDialogProps) {
  const [values, setValues] = useState<Record<string, unknown>>(() =>
    Object.fromEntries(fields.map((f) => [f.name, f.defaultValue ?? ""]))
  );
  const [submitting, setSubmitting] = useState(false);

  function resetForm() {
    setValues(Object.fromEntries(fields.map((f) => [f.name, f.defaultValue ?? ""])));
  }

  const canSubmit = fields
    .filter((f) => f.required)
    .every((f) => {
      const v = values[f.name];
      return v !== undefined && v !== null && v !== "";
    });

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await onSubmit(values);
      resetForm();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "추가에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetForm(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className="space-y-4 py-2">
          {fields.map((field) => (
            <div key={field.name} className="space-y-1.5">
              <Label className="text-sm">
                {field.label}
                {field.required && <span className="text-destructive ml-0.5">*</span>}
              </Label>

              {field.type === "select" && field.options ? (
                <Select
                  value={String(values[field.name] || "")}
                  onValueChange={(v) =>
                    setValues((prev) => ({ ...prev, [field.name]: v || undefined }))
                  }
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder={field.placeholder || "선택"} />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : field.type === "checkbox" ? (
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!values[field.name]}
                    onChange={(e) =>
                      setValues((prev) => ({ ...prev, [field.name]: e.target.checked }))
                    }
                    className="h-4 w-4 rounded border-input"
                  />
                  {field.placeholder}
                </label>
              ) : field.type === "date" ? (
                <DateSelect
                  mode="date"
                  value={String(values[field.name] ?? "")}
                  onChange={(v) =>
                    setValues((prev) => ({ ...prev, [field.name]: v }))
                  }
                  placeholder={field.placeholder || "선택"}
                />
              ) : (
                <Input
                  type={field.type === "number" ? "number" : "text"}
                  value={String(values[field.name] ?? "")}
                  onChange={(e) =>
                    setValues((prev) => ({
                      ...prev,
                      [field.name]: field.type === "number" ? (e.target.value ? Number(e.target.value) : "") : e.target.value,
                    }))
                  }
                  placeholder={field.placeholder}
                  className="text-sm"
                />
              )}
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            추가
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
