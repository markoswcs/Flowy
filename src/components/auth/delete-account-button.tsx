"use client";

import { AlertTriangle, Trash2 } from "lucide-react";
import { useState } from "react";
import { useFormStatus } from "react-dom";

import { deleteAccountAction } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";

const confirmationPhrase = "EXCLUIR MINHA CONTA";

function DeleteSubmit({ enabled }: { enabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant="destructive"
      disabled={!enabled || pending}
      loading={pending}
    >
      {pending ? "Excluindo..." : "Excluir conta definitivamente"}
    </Button>
  );
}

export function DeleteAccountButton() {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        title="Excluir conta"
        aria-label="Excluir conta"
        onClick={() => setOpen(true)}
        className="text-muted-foreground hover:bg-destructive/20 hover:text-destructive"
      >
        <Trash2 className="size-4" aria-hidden="true" />
      </Button>

      {open ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"
          role="presentation"
          onMouseDown={() => setOpen(false)}
        >
          <form
            action={deleteAccountAction}
            onMouseDown={(event) => event.stopPropagation()}
            className="w-full max-w-md rounded-xl border border-destructive/50 bg-card p-6 shadow-xl"
            aria-labelledby="delete-account-title"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" />
              <div>
                <h2 id="delete-account-title" className="font-semibold">
                  Excluir conta?
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Esta ação é irreversível e excluirá permanentemente suas
                  tarefas, notas, pastas e demais dados.
                </p>
              </div>
            </div>
            <label
              className="mt-5 block text-sm font-medium"
              htmlFor="delete-confirmation"
            >
              Digite <span className="font-semibold">{confirmationPhrase}</span>{" "}
              para confirmar
            </label>
            <input
              id="delete-confirmation"
              name="confirmation"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              autoComplete="off"
              className="mt-2 min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="mt-5 flex justify-end gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
              >
                Cancelar
              </Button>
              <DeleteSubmit enabled={confirmation === confirmationPhrase} />
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
